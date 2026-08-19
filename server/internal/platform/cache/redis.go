package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

// Cache defines the caching operations contract.
type Cache interface {
	Get(ctx context.Context, key string, dest interface{}) error
	Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, keys ...string) error
	Close() error
}

// RedisCache is a Redis implementation of Cache.
type RedisCache struct {
	client *redis.Client
}

// NewRedisCache creates a new RedisCache client connection.
func NewRedisCache(addr, password string, db int) (*RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:         addr,
		Password:     password,
		DB:           db,
		DialTimeout:  3 * time.Second,
		ReadTimeout:  2 * time.Second,
		WriteTimeout: 2 * time.Second,
		PoolSize:     10,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("redis ping failed: %w", err)
	}

	return &RedisCache{client: client}, nil
}

// ErrCacheMiss indicates that the requested key was not found in cache.
var ErrCacheMiss = errors.New("cache: key not found")

func (r *RedisCache) Get(ctx context.Context, key string, dest interface{}) error {
	if r == nil || r.client == nil {
		return ErrCacheMiss
	}

	val, err := r.client.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		return ErrCacheMiss
	}
	if err != nil {
		slog.WarnContext(ctx, "redis get error", "key", key, "error", err)
		return ErrCacheMiss
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		slog.WarnContext(ctx, "redis unmarshal error", "key", key, "error", err)
		return ErrCacheMiss
	}

	return nil
}

func (r *RedisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	if r == nil || r.client == nil {
		return nil
	}

	data, err := json.Marshal(value)
	if err != nil {
		slog.WarnContext(ctx, "redis marshal error", "key", key, "error", err)
		return nil
	}

	if err := r.client.Set(ctx, key, data, ttl).Err(); err != nil {
		slog.WarnContext(ctx, "redis set error", "key", key, "error", err)
	}

	return nil
}

func (r *RedisCache) Delete(ctx context.Context, keys ...string) error {
	if r == nil || r.client == nil || len(keys) == 0 {
		return nil
	}

	if err := r.client.Del(ctx, keys...).Err(); err != nil {
		slog.WarnContext(ctx, "redis delete error", "keys", keys, "error", err)
	}

	return nil
}

func (r *RedisCache) Close() error {
	if r != nil && r.client != nil {
		return r.client.Close()
	}
	return nil
}

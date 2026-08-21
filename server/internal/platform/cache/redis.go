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
	Incr(ctx context.Context, key string, ttl time.Duration) (int64, error)
	AcquireLock(ctx context.Context, key string, ttl time.Duration) (bool, error)
	Close() error
}

// MetricsRecorder defines the interface for recording cache metrics.
type MetricsRecorder interface {
	RecordCacheHit(cacheType string)
	RecordCacheMiss(cacheType string)
}

// RedisCache is a Redis implementation of Cache.
type RedisCache struct {
	client  *redis.Client
	metrics MetricsRecorder
}

// SetMetrics sets the metrics recorder for cache hit/miss tracking.
func (r *RedisCache) SetMetrics(m MetricsRecorder) {
	if r != nil {
		r.metrics = m
	}
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
		if r != nil && r.metrics != nil {
			r.metrics.RecordCacheMiss("redis")
		}
		return ErrCacheMiss
	}

	val, err := r.client.Get(ctx, key).Result()
	if errors.Is(err, redis.Nil) {
		if r.metrics != nil {
			r.metrics.RecordCacheMiss("redis")
		}
		return ErrCacheMiss
	}
	if err != nil {
		slog.WarnContext(ctx, "redis get error", "key", key, "error", err)
		if r.metrics != nil {
			r.metrics.RecordCacheMiss("redis")
		}
		return ErrCacheMiss
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		slog.WarnContext(ctx, "redis unmarshal error", "key", key, "error", err)
		if r.metrics != nil {
			r.metrics.RecordCacheMiss("redis")
		}
		return ErrCacheMiss
	}

	if r.metrics != nil {
		r.metrics.RecordCacheHit("redis")
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

func (r *RedisCache) Incr(ctx context.Context, key string, ttl time.Duration) (int64, error) {
	if r == nil || r.client == nil {
		return 0, errors.New("cache: redis client is nil")
	}

	count, err := r.client.Incr(ctx, key).Result()
	if err != nil {
		slog.WarnContext(ctx, "redis incr error", "key", key, "error", err)
		return 0, err
	}

	if count == 1 && ttl > 0 {
		if err := r.client.Expire(ctx, key, ttl).Err(); err != nil {
			slog.WarnContext(ctx, "redis expire error", "key", key, "error", err)
		}
	}

	return count, nil
}

func (r *RedisCache) AcquireLock(ctx context.Context, key string, ttl time.Duration) (bool, error) {
	if r == nil || r.client == nil {
		return true, nil
	}

	ok, err := r.client.SetNX(ctx, key, "locked", ttl).Result()
	if err != nil {
		slog.WarnContext(ctx, "redis setnx lock error", "key", key, "error", err)
		return false, err
	}

	return ok, nil
}

func (r *RedisCache) Close() error {
	if r != nil && r.client != nil {
		return r.client.Close()
	}
	return nil
}

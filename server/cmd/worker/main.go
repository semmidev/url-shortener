package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/cache"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/postgres"
	"github.com/semmidev/url-shortener/server/internal/worker"
)

func main() {
	cfg, err := config.LoadConfig(".")
	if err != nil {
		log.Fatalf("failed to load worker configuration: %v", err)
	}

	appLogger := logger.NewWithConfig(logger.Config{
		Level:     cfg.LogLevel,
		Format:    cfg.LogFormat,
		AddSource: cfg.LogAddSource,
		Out:       os.Stderr,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	appLogger.Info(ctx, "connecting worker to postgresql database",
		"db_source", cfg.DBSource,
		"max_conns", cfg.WorkerDBMaxConns,
		"min_conns", cfg.WorkerDBMinConns,
	)

	pool, err := postgres.NewPool(ctx, postgres.Config{
		Source:          cfg.DBSource,
		MaxConns:        cfg.WorkerDBMaxConns,
		MinConns:        cfg.WorkerDBMinConns,
		MaxConnIdleTime: cfg.DBMaxConnIdleTime,
		MaxConnLifetime: cfg.DBMaxConnLifetime,
	})
	if err != nil {
		log.Fatalf("worker database connection failed: %v", err)
	}
	defer pool.Close()

	store := db.NewStore(pool)

	var redisCache cache.Cache
	if cfg.RedisAddress != "" {
		rc, err := cache.NewRedisCache(cfg.RedisAddress, cfg.RedisPassword, cfg.RedisDB)
		if err != nil {
			appLogger.Warn(context.Background(), "worker redis cache connection skipped/failed", "error", err)
		} else {
			appLogger.Info(context.Background(), "worker redis cache connected", "address", cfg.RedisAddress)
			redisCache = rc
		}
	}

	redisOpt := asynq.RedisClientOpt{
		Addr:     cfg.RedisAddress,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	}

	taskProcessor := worker.NewRedisTaskProcessor(redisOpt, store, appLogger, redisCache, cfg.WorkerConcurrency)

	appLogger.Info(context.Background(), "starting background task processor worker",
		"redis_address", cfg.RedisAddress,
		"concurrency", cfg.WorkerConcurrency,
	)

	if err := taskProcessor.Start(); err != nil {
		log.Fatalf("failed to start background task processor: %v", err)
	}

	// Listen for shutdown signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	appLogger.Info(context.Background(), "shutting down background task processor worker", "signal", sig.String())
	taskProcessor.Shutdown()
	appLogger.Info(context.Background(), "background task processor worker stopped cleanly")
}

package app

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/permission"
	"github.com/semmidev/url-shortener/server/internal/platform/postgres"
	"github.com/semmidev/url-shortener/server/internal/platform/telemetry"
)

func Run(cfg config.Config) error {
	appLogger := logger.NewWithConfig(logger.Config{
		Level:       cfg.LogLevel,
		Format:      cfg.LogFormat,
		AddSource:   cfg.LogAddSource,
		Out:         os.Stderr,
		LokiURL:     cfg.LokiURL,
		ServiceName: cfg.OtelServiceName,
		Environment: cfg.Environment,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Initialize OpenTelemetry Tracing
	if cfg.OtelEnabled {
		shutdownTracer, err := telemetry.InitTracer(context.Background(), cfg.OtelServiceName, cfg.OtelExporterEndpoint)
		if err != nil {
			appLogger.Warn(ctx, "opentelemetry tracer initialization warning", "error", err)
		} else {
			appLogger.Info(ctx, "opentelemetry tracer initialized successfully", "endpoint", cfg.OtelExporterEndpoint, "service", cfg.OtelServiceName)
			defer func() {
				shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 5*time.Second)
				defer shutdownCancel()
				if err := shutdownTracer(shutdownCtx); err != nil {
					appLogger.Error(shutdownCtx, "opentelemetry tracer shutdown failed", "error", err)
				}
			}()
		}
	}

	// Database Migrations
	if cfg.MigrationURL != "" {
		appLogger.Info(ctx, "running database migrations", "migration_url", cfg.MigrationURL)
		if err := RunDBMigration(cfg.MigrationURL, cfg.DBSource); err != nil {
			appLogger.Error(ctx, "database migration failed", "error", err)
			return fmt.Errorf("database migration failed: %w", err)
		}
		appLogger.Info(ctx, "database migrations completed successfully")
	}

	// Connect PostgreSQL Pool
	appLogger.Info(ctx, "connecting to postgresql database",
		"db_source", cfg.DBSource,
		"max_conns", cfg.DBMaxConns,
		"min_conns", cfg.DBMinConns,
	)

	pool, err := postgres.NewPool(ctx, postgres.Config{
		Source:                cfg.DBSource,
		MaxConns:              cfg.DBMaxConns,
		MinConns:              cfg.DBMinConns,
		MaxConnIdleTime:       cfg.DBMaxConnIdleTime,
		MaxConnLifetime:       cfg.DBMaxConnLifetime,
		DisableStatementCache: cfg.DBDisableStatementCache || cfg.DBPgBouncerEnabled,
	})
	if err != nil {
		appLogger.Error(ctx, "database connection failed", "error", err)
		return fmt.Errorf("database initialization failed: %w", err)
	}
	defer pool.Close()
	appLogger.Info(ctx, "postgresql database connected successfully")

	// Sync Code-Defined Permissions to Database
	if err := permission.SyncPermissions(ctx, db.NewStore(pool)); err != nil {
		appLogger.Warn(ctx, "permission sync warning", "error", err)
	} else {
		appLogger.Info(ctx, "permission matrix synced successfully")
	}

	// Build Application Router
	r, err := BuildRouter(cfg, pool, appLogger)
	if err != nil {
		return err
	}

	server := &http.Server{
		Addr:         cfg.ServerAddress,
		Handler:      r,
		ReadTimeout:  cfg.ServerReadTimeout,
		WriteTimeout: cfg.ServerWriteTimeout,
		IdleTimeout:  cfg.ServerIdleTimeout,
	}

	// Server shutdown channel listening for SIGINT and SIGTERM
	shutdownError := make(chan error)
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		s := <-quit
		appLogger.Info(context.Background(), "shutting down server", "signal", s.String(), "shutdown_timeout", cfg.ServerShutdownTimeout)

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), cfg.ServerShutdownTimeout)
		defer shutdownCancel()

		server.SetKeepAlivesEnabled(false)
		if err := server.Shutdown(shutdownCtx); err != nil {
			appLogger.Error(shutdownCtx, "could not gracefully shutdown server", "error", err)
			_ = server.Close()
		}
		close(shutdownError)
	}()

	appLogger.Info(context.Background(), "starting http server", "address", cfg.ServerAddress, "environment", cfg.Environment)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("http server failed: %w", err)
	}

	if err := <-shutdownError; err != nil {
		return fmt.Errorf("graceful shutdown error: %w", err)
	}

	appLogger.Info(context.Background(), "server gracefully stopped")
	return nil
}

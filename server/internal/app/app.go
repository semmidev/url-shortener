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

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
	httpSwagger "github.com/swaggo/http-swagger/v2"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/docs"
	"github.com/semmidev/url-shortener/server/internal/analytics"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	customMw "github.com/semmidev/url-shortener/server/internal/platform/middleware"
	"github.com/semmidev/url-shortener/server/internal/platform/postgres"
	"github.com/semmidev/url-shortener/server/internal/platform/token"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/semmidev/url-shortener/server/internal/url"
	"github.com/semmidev/url-shortener/server/internal/user"
)

func Run(cfg config.Config) error {
	appLogger := logger.NewWithConfig(logger.Config{
		Level:     cfg.LogLevel,
		Format:    cfg.LogFormat,
		AddSource: cfg.LogAddSource,
		Out:       os.Stderr,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

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

	pgPoolConfig := postgres.Config{
		Source:          cfg.DBSource,
		MaxConns:        cfg.DBMaxConns,
		MinConns:        cfg.DBMinConns,
		MaxConnIdleTime: cfg.DBMaxConnIdleTime,
		MaxConnLifetime: cfg.DBMaxConnLifetime,
	}

	pool, err := postgres.NewPool(ctx, pgPoolConfig)
	if err != nil {
		appLogger.Error(ctx, "database connection failed", "error", err)
		return fmt.Errorf("database initialization failed: %w", err)
	}
	defer pool.Close()
	appLogger.Info(ctx, "postgresql database connected successfully")

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

		shutdownError <- server.Shutdown(shutdownCtx)
	}()

	appLogger.Info(context.Background(), "url shortener api starting",
		"address", cfg.ServerAddress,
		"environment", cfg.Environment,
		"version", config.Version,
		"build_time", config.BuildTime,
		"git_commit", config.GitCommit,
		"read_timeout", cfg.ServerReadTimeout,
		"write_timeout", cfg.ServerWriteTimeout,
		"idle_timeout", cfg.ServerIdleTimeout,
		"shutdown_timeout", cfg.ServerShutdownTimeout,
		"log_level", cfg.LogLevel,
		"log_format", cfg.LogFormat,
		"log_add_source", cfg.LogAddSource,
		"scalar_docs", fmt.Sprintf("http://%s/docs", cfg.ServerAddress),
		"swagger_docs", fmt.Sprintf("http://%s/swagger/index.html", cfg.ServerAddress),
	)

	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return fmt.Errorf("server error: %w", err)
	}

	if err := <-shutdownError; err != nil {
		return fmt.Errorf("graceful shutdown error: %w", err)
	}

	appLogger.Info(context.Background(), "server gracefully stopped")
	return nil
}

// BuildRouter constructs and mounts all middlewares, handlers, and routes for the application.
func BuildRouter(cfg config.Config, pool *pgxpool.Pool, appLogger *logger.Logger) (chi.Router, error) {
	store := db.NewStore(pool)

	tokenMaker, err := token.NewJWTMaker(cfg.JWTSecret)
	if err != nil {
		return nil, fmt.Errorf("token maker initialization failed: %w", err)
	}

	// Initialize Services
	userSvc := user.NewService(store, tokenMaker, cfg)
	urlSvc := url.NewService(store, cfg)
	analyticsSvc := analytics.NewService(store)

	// Initialize Handlers
	userH := user.NewHandler(userSvc)
	urlH := url.NewHandler(urlSvc)
	analyticsH := analytics.NewHandler(analyticsSvc)
	redirectH := url.NewRedirectHandler(urlSvc, analyticsH)

	// Setup Router & Middleware
	r := chi.NewRouter()

	// CORS Middleware to handle browser preflight OPTIONS requests (e.g. from Swagger UI, Scalar UI, or Frontend)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(customMw.WideEventLogging(appLogger))

	authMw := customMw.Auth(tokenMaker)

	// Public Scalar API Reference UI Endpoint (Embedded HTML template from server/docs/scalar.html)
	scalarHandler := func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(docs.ScalarHTML)
	}
	r.Get("/docs", scalarHandler)
	r.Get("/docs/*", scalarHandler)

	// Public Swagger Documentation UI Endpoint (Swagger UI & Spec JSON)
	r.Get("/swagger/*", httpSwagger.Handler(
		httpSwagger.URL("/swagger/doc.json"),
	))

	// Public Health check endpoint
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		web.JSON(w, http.StatusOK, map[string]any{
			"status":  "ok",
			"service": "url-shortener-api",
			"version": config.Version,
			"uptime":  config.GetBuildInfo(cfg.Environment).Uptime,
		})
	})

	// Public Version & Build Info endpoint
	r.Get("/version", func(w http.ResponseWriter, r *http.Request) {
		info := config.GetBuildInfo(cfg.Environment)
		web.Success(w, http.StatusOK, "Application version and build info", info, nil)
	})

	// Public Redirection Endpoint (GET /{code}) with Public Rate Limiter
	publicRateLimitMw := customMw.RateLimiter(cfg.RateLimitPublicRequests, cfg.RateLimitPublicWindow)
	r.With(publicRateLimitMw).Get("/{code}", redirectH.Redirect)

	// Rate Limiters for API routes
	authRateLimitMw := customMw.RateLimiter(cfg.RateLimitAuthRequests, cfg.RateLimitAuthWindow)
	apiRateLimitMw := customMw.RateLimiter(cfg.RateLimitAPIRequests, cfg.RateLimitAPIWindow)

	// API v1 Routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Route("/auth", func(r chi.Router) {
			r.Use(authRateLimitMw)
			userH.Mount(r, authMw)
		})
		r.Group(func(r chi.Router) {
			r.Use(apiRateLimitMw)
			urlH.Mount(r, authMw)
			analyticsH.Mount(r, authMw)
		})
	})

	return r, nil
}

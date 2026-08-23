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
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	httpSwagger "github.com/swaggo/http-swagger/v2"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/docs"
	"github.com/semmidev/url-shortener/server/internal/admin"
	"github.com/semmidev/url-shortener/server/internal/analytics"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/audit"
	"github.com/semmidev/url-shortener/server/internal/platform/cache"
	"github.com/semmidev/url-shortener/server/internal/platform/eventbus"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/metrics"
	customMw "github.com/semmidev/url-shortener/server/internal/platform/middleware"
	"github.com/semmidev/url-shortener/server/internal/platform/outbox"
	"github.com/semmidev/url-shortener/server/internal/platform/postgres"
	"github.com/semmidev/url-shortener/server/internal/platform/token"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/semmidev/url-shortener/server/internal/url"
	"github.com/semmidev/url-shortener/server/internal/user"
	spaweb "github.com/semmidev/url-shortener/server/internal/web"
	"github.com/semmidev/url-shortener/server/internal/worker"
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

// BuildRouter constructs and mounts all middlewares, handlers, and routes for the application.
func BuildRouter(cfg config.Config, pool *pgxpool.Pool, appLogger *logger.Logger) (chi.Router, error) {
	store := db.NewStore(pool)

	tokenMaker, err := token.NewJWTMaker(cfg.JWTSecret)
	if err != nil {
		return nil, fmt.Errorf("token maker initialization failed: %w", err)
	}

	// Initialize Prometheus Metrics Registry & Collectors
	appMetrics := metrics.New()
	if pool != nil {
		appMetrics.StartDBMetricsCollector(context.Background(), pool, 15*time.Second)
		appMetrics.CollectDBStats(pool)
	}

	// Initialize Redis Cache
	var redisCache cache.Cache
	if cfg.RedisAddress != "" {
		rc, err := cache.NewRedisCache(cfg.RedisAddress, cfg.RedisPassword, cfg.RedisDB)
		if err != nil {
			appLogger.Warn(context.Background(), "redis connection skipped/failed", "error", err)
		} else {
			appLogger.Info(context.Background(), "redis cache connected successfully", "address", cfg.RedisAddress)
			rc.SetMetrics(appMetrics)
			redisCache = rc
		}
	}

	// Initialize Pluggable Event Publisher (NATS JetStream with InMemory fallback)
	var eventPub eventbus.EventPublisher
	natsPub, err := eventbus.NewNatsPublisher(cfg.NatsURL)
	if err != nil {
		appLogger.Warn(context.Background(), "nats jetstream connection skipped/failed, using in-memory event bus", "error", err)
		eventPub = eventbus.NewInMemoryPublisher()
	} else {
		appLogger.Info(context.Background(), "nats jetstream connected successfully", "url", cfg.NatsURL)
		eventPub = natsPub
	}

	// Initialize Asynq Task Distributor
	var taskDistributor worker.TaskDistributor
	if cfg.RedisAddress != "" {
		taskDistributor = worker.NewRedisTaskDistributor(asynq.RedisClientOpt{
			Addr:     cfg.RedisAddress,
			Password: cfg.RedisPassword,
			DB:       cfg.RedisDB,
		}, appLogger)
	}

	// Initialize Services
	userSvc := user.NewService(store, tokenMaker, cfg, appLogger, redisCache)
	userSvc.SetMetricsRecorder(appMetrics)

	urlSvc := url.NewService(store, cfg, redisCache)
	urlSvc.SetMetricsRecorder(appMetrics)
	if taskDistributor != nil {
		urlSvc.SetTaskDistributor(taskDistributor)
	}
	urlSvc.StartExpirationCleanupWorker(context.Background(), 1*time.Minute)

	analyticsSvc := analytics.NewService(store)
	auditLogger := audit.NewLogger(store)
	adminSvc := admin.NewService(store)

	// Initialize Embedded SPA Handler
	spaHandler, err := spaweb.NewSPAHandler()
	if err != nil {
		appLogger.Warn(context.Background(), "failed to initialize embedded SPA handler", "error", err)
	}

	// Initialize Handlers
	userH := user.NewHandler(userSvc)
	urlH := url.NewHandler(urlSvc)
	analyticsH := analytics.NewHandler(analyticsSvc)
	adminH := admin.NewHandler(adminSvc, store, auditLogger)

	redirectH := url.NewRedirectHandler(urlSvc, analyticsH, spaHandler)
	redirectH.SetMetricsRecorder(appMetrics)

	// Start Outbox Worker for async background event streaming
	outboxWorker := outbox.NewOutboxWorker(store, eventPub, analyticsH)
	if rc, ok := redisCache.(*cache.RedisCache); ok {
		outboxWorker.SetLockAcquirer(rc)
	}
	outboxWorker.Start(context.Background())

	// Setup Router & Middleware
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"https://*", "http://*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "traceparent", "tracestate"},
		ExposedHeaders:   []string{"Link", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(customMw.SecureHeaders)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(customMw.RequestTimeout(10 * time.Second))
	r.Use(customMw.Metrics(appMetrics))
	r.Use(customMw.WideEventLogging(appLogger))

	authMw := customMw.Auth(tokenMaker)

	// Internal Management & Observability Server (Private /metrics & Go 1.27 /debug/pprof)
	if cfg.ManagementEnabled && cfg.ManagementAddress != "" {
		mgmtRouter := BuildManagementRouter(appMetrics)
		mgmtServer := &http.Server{
			Addr:         cfg.ManagementAddress,
			Handler:      mgmtRouter,
			ReadTimeout:  5 * time.Second,
			WriteTimeout: 5 * time.Second,
			IdleTimeout:  30 * time.Second,
		}
		go func() {
			appLogger.Info(context.Background(), "starting internal management server", "address", cfg.ManagementAddress)
			if err := mgmtServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
				appLogger.Warn(context.Background(), "internal management server stopped", "error", err)
			}
		}()
	}

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

	// Public Health check endpoints
	// GET /health/live — Liveness: is the process alive? (no deps checked)
	r.Get("/health/live", func(w http.ResponseWriter, r *http.Request) {
		web.JSON(w, http.StatusOK, map[string]any{
			"status":  "ok",
			"service": "url-shortener-api",
		})
	})

	// GET /health/ready — Readiness: is the service ready to handle traffic? (pings DB)
	r.Get("/health/ready", func(w http.ResponseWriter, r *http.Request) {
		if err := pool.Ping(r.Context()); err != nil {
			web.JSON(w, http.StatusServiceUnavailable, map[string]any{
				"status":   "unavailable",
				"service":  "url-shortener-api",
				"database": "unreachable",
			})
			return
		}
		web.JSON(w, http.StatusOK, map[string]any{
			"status":   "ok",
			"service":  "url-shortener-api",
			"database": "reachable",
		})
	})

	// GET /health — Legacy health check (pings DB, backward compatible)
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "reachable"
		if err := pool.Ping(r.Context()); err != nil {
			dbStatus = "unreachable"
		}
		web.JSON(w, http.StatusOK, map[string]any{
			"status":   "ok",
			"service":  "url-shortener-api",
			"version":  config.Version,
			"uptime":   config.GetBuildInfo(cfg.Environment).Uptime,
			"database": dbStatus,
		})
	})

	// Public Version & Build Info endpoint
	r.Get("/version", func(w http.ResponseWriter, r *http.Request) {
		info := config.GetBuildInfo(cfg.Environment)
		web.Success(w, http.StatusOK, "Application version and build info", info, nil)
	})

	// Public Redirection Endpoint
	publicRateLimitMw := customMw.RedisRateLimiter(redisCache, "public", cfg.RateLimitPublicRequests, cfg.RateLimitPublicWindow)
	redirectRouter := chi.NewRouter()

	redirectRouter.With(publicRateLimitMw).Get("/{code}", redirectH.Redirect)
	redirectRouter.With(publicRateLimitMw).Get("/{code}/preview", redirectH.Preview)
	redirectRouter.With(publicRateLimitMw).Get("/{code}/qr", redirectH.QRCode)
	redirectRouter.Get("/*", redirectH.Redirect)
	r.Mount("/", redirectRouter)

	// Rate Limiters for API routes
	authRateLimitMw := customMw.RedisRateLimiter(redisCache, "auth", cfg.RateLimitAuthRequests, cfg.RateLimitAuthWindow)
	apiRateLimitMw := customMw.RedisRateLimiter(redisCache, "api", cfg.RateLimitAPIRequests, cfg.RateLimitAPIWindow)

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
			adminH.Mount(r, authMw)
		})
	})

	return r, nil
}

// BuildManagementRouter constructs the private internal management router serving /metrics and Go 1.27 /debug/pprof endpoints.
func BuildManagementRouter(appMetrics *metrics.Metrics) chi.Router {
	mr := chi.NewRouter()
	mr.Use(chimw.Recoverer)
	if appMetrics != nil {
		mr.Handle("/metrics", appMetrics.Handler())
	}
	mr.Mount("/debug", chimw.Profiler())
	return mr
}

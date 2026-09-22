package app

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/hibiken/asynq"
	"github.com/jackc/pgx/v5/pgxpool"
	httpSwagger "github.com/swaggo/http-swagger/v2"

	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/docs"
	"github.com/semmidev/url-shortener/server/internal/analytics"
	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/notification"
	"github.com/semmidev/url-shortener/server/internal/platform/audit"
	"github.com/semmidev/url-shortener/server/internal/platform/authz"
	"github.com/semmidev/url-shortener/server/internal/platform/cache"
	"github.com/semmidev/url-shortener/server/internal/platform/eventbus"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/metrics"
	customMw "github.com/semmidev/url-shortener/server/internal/platform/middleware"
	"github.com/semmidev/url-shortener/server/internal/platform/outbox"
	platformStorage "github.com/semmidev/url-shortener/server/internal/platform/storage"
	"github.com/semmidev/url-shortener/server/internal/platform/token"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/semmidev/url-shortener/server/internal/storage"
	"github.com/semmidev/url-shortener/server/internal/tenant"
	"github.com/semmidev/url-shortener/server/internal/url"
	"github.com/semmidev/url-shortener/server/internal/user"
	spaweb "github.com/semmidev/url-shortener/server/internal/web"
	"github.com/semmidev/url-shortener/server/internal/worker"
)

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
	rc, err := cache.NewRedisCache(cfg.RedisAddress, cfg.RedisPassword, cfg.RedisDB)
	if err != nil {
		appLogger.Warn(context.Background(), "redis connection skipped/failed", "error", err)
	} else {
		appLogger.Info(context.Background(), "redis cache connected successfully", "address", cfg.RedisAddress)
		rc.SetMetrics(appMetrics)
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

	// Initialize Asynq Task Distributor (Only if Redis is configured)
	var taskDistributor worker.TaskDistributor
	if cfg.RedisAddress != "" {
		taskDistributor = worker.NewRedisTaskDistributor(asynq.RedisClientOpt{
			Addr:     cfg.RedisAddress,
			Password: cfg.RedisPassword,
			DB:       cfg.RedisDB,
		}, appLogger)
	}

	// Initialize Casbin Decision Engine Authorizer
	authorizer, err := authz.NewCasbinAuthorizer(store)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize casbin authorizer: %w", err)
	}
	if err := authorizer.SyncPolicies(context.Background()); err != nil {
		appLogger.Warn(context.Background(), "casbin initial policy sync warning", "error", err)
	} else {
		appLogger.Info(context.Background(), "casbin decision engine initialized and synced successfully")
	}

	// Initialize Storage Provider (S3 / RustFS)
	var storageProvider platformStorage.Provider
	s3Prov, s3Err := platformStorage.NewS3Provider(context.Background(), cfg)
	if s3Err != nil {
		appLogger.Warn(context.Background(), "s3 storage provider initialization skipped/failed", "error", s3Err)
	} else {
		appLogger.Info(context.Background(), "s3 storage provider initialized successfully", "bucket", cfg.S3Bucket, "endpoint", cfg.S3Endpoint)
		storageProvider = s3Prov
	}

	// Initialize Services
	userSvc := user.NewService(store, tokenMaker, cfg, appLogger, rc, authorizer)
	userSvc.SetMetricsRecorder(appMetrics)
	if storageProvider != nil {
		userSvc.SetStorageProvider(storageProvider)
	}

	storageSvc := storage.NewService(storageProvider)
	storageH := storage.NewHandler(storageSvc)

	urlSvc := url.NewService(store, cfg, rc, authorizer, taskDistributor)
	urlSvc.SetMetricsRecorder(appMetrics)
	urlSvc.StartExpirationCleanupWorker(context.Background(), 1*time.Minute)

	analyticsSvc := analytics.NewService(store, authorizer)
	_ = audit.NewLogger(store, taskDistributor)

	// Initialize Embedded SPA Handler
	spaHandler, err := spaweb.NewSPAHandler()
	if err != nil {
		appLogger.Warn(context.Background(), "failed to initialize embedded SPA handler", "error", err)
	}

	// Initialize Handlers
	notificationSvc := notification.NewService(store)
	notificationH := notification.NewHandler(notificationSvc)

	tenantSvc := tenant.NewService(store, authorizer, notificationSvc)
	tenantH := tenant.NewHandler(tenantSvc)

	userH := user.NewHandler(userSvc)
	urlH := url.NewHandler(urlSvc)
	analyticsH := analytics.NewHandler(analyticsSvc)

	redirectH := url.NewRedirectHandler(urlSvc, analyticsH, spaHandler, taskDistributor)
	redirectH.SetMetricsRecorder(appMetrics)

	// Start Outbox Worker for async background event streaming
	outboxWorker := outbox.NewOutboxWorker(store, eventPub, analyticsH)
	outboxWorker.SetLockAcquirer(rc)
	outboxWorker.Start(context.Background())

	// Setup Router & Middleware
	r := chi.NewRouter()

	// Global Middlewares
	r.Use(customMw.CORS())
	r.Use(customMw.SecureHeaders)
	r.Use(chimw.Recoverer)
	r.Use(customMw.RequestTimeout(10 * time.Second))
	if cfg.OtelEnabled {
		r.Use(customMw.Tracing(cfg.OtelServiceName))
	}
	r.Use(customMw.Metrics(appMetrics))
	r.Use(customMw.WideEventLogging(appLogger))

	authMw := customMw.Auth(tokenMaker)
	tenantMw := customMw.TenantContext(store)

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
	publicRateLimitMw := customMw.RedisRateLimiter(rc, "public", cfg.RateLimitPublicRequests, cfg.RateLimitPublicWindow)
	redirectRouter := chi.NewRouter()

	redirectRouter.With(publicRateLimitMw).Get("/{code}", redirectH.Redirect)
	redirectRouter.With(publicRateLimitMw).Get("/{code}/preview", redirectH.Preview)
	redirectRouter.With(publicRateLimitMw).Get("/{code}/qr", redirectH.QRCode)
	redirectRouter.Get("/*", redirectH.Redirect)
	r.Mount("/", redirectRouter)

	// Rate Limiters for API routes
	authRateLimitMw := customMw.RedisRateLimiter(rc, "auth", cfg.RateLimitAuthRequests, cfg.RateLimitAuthWindow)
	apiRateLimitMw := customMw.RedisRateLimiter(rc, "api", cfg.RateLimitAPIRequests, cfg.RateLimitAPIWindow)

	// API v1 Routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(tenantMw)
		r.Route("/auth", func(r chi.Router) {
			r.Use(authRateLimitMw)
			userH.Mount(r, authMw)
		})
		r.Group(func(r chi.Router) {
			r.Use(apiRateLimitMw)
			tenantH.Mount(r, authMw)
			urlH.Mount(r, authMw)
			analyticsH.Mount(r, authMw)
			notificationH.Mount(r, authMw)
			r.Route("/storage", func(r chi.Router) {
				storageH.Mount(r, authMw)
			})
		})
	})

	return r, nil
}

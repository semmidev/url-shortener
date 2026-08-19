package config

import (
	"time"

	"github.com/spf13/viper"
)

// Config stores all configuration of the application.
type Config struct {
	// Application Settings
	Environment  string `mapstructure:"APP_ENV"`
	AppBaseURL   string `mapstructure:"APP_BASE_URL"`
	MigrationURL string `mapstructure:"MIGRATION_URL"`
	AppLocale    string `mapstructure:"APP_LOCALE"` // id, en

	// Logging Settings
	LogLevel              string  `mapstructure:"LOG_LEVEL"`                // debug, info, warn, error
	LogFormat             string  `mapstructure:"LOG_FORMAT"`               // text, json
	LogAddSource          bool    `mapstructure:"LOG_ADD_SOURCE"`           // true, false
	LogRedirectSampleRate float64 `mapstructure:"LOG_REDIRECT_SAMPLE_RATE"` // 0.0–1.0, default 1.0

	// HTTP Server Settings
	ServerAddress         string        `mapstructure:"SERVER_ADDRESS"`
	ServerReadTimeout     time.Duration `mapstructure:"SERVER_READ_TIMEOUT"`
	ServerWriteTimeout    time.Duration `mapstructure:"SERVER_WRITE_TIMEOUT"`
	ServerIdleTimeout     time.Duration `mapstructure:"SERVER_IDLE_TIMEOUT"`
	ServerShutdownTimeout time.Duration `mapstructure:"SERVER_SHUTDOWN_TIMEOUT"`

	// Rate Limiting Settings
	RateLimitAuthRequests   int           `mapstructure:"RATE_LIMIT_AUTH_REQUESTS"`
	RateLimitAuthWindow     time.Duration `mapstructure:"RATE_LIMIT_AUTH_WINDOW"`
	RateLimitAPIRequests    int           `mapstructure:"RATE_LIMIT_API_REQUESTS"`
	RateLimitAPIWindow      time.Duration `mapstructure:"RATE_LIMIT_API_WINDOW"`
	RateLimitPublicRequests int           `mapstructure:"RATE_LIMIT_PUBLIC_REQUESTS"`
	RateLimitPublicWindow   time.Duration `mapstructure:"RATE_LIMIT_PUBLIC_WINDOW"`

	// Database Settings
	DBSource          string        `mapstructure:"DB_SOURCE"`
	DBMaxConns        int32         `mapstructure:"DB_MAX_CONNS"`
	DBMinConns        int32         `mapstructure:"DB_MIN_CONNS"`
	DBMaxConnIdleTime time.Duration `mapstructure:"DB_MAX_CONN_IDLE_TIME"`
	DBMaxConnLifetime time.Duration `mapstructure:"DB_MAX_CONN_LIFETIME"`

	// JWT Security & Token Settings
	JWTSecret            string        `mapstructure:"JWT_SECRET"`
	AccessTokenDuration  time.Duration `mapstructure:"JWT_ACCESS_TOKEN_DURATION"`
	RefreshTokenDuration time.Duration `mapstructure:"JWT_REFRESH_TOKEN_DURATION"`

	// Google OAuth Settings
	GoogleClientID     string `mapstructure:"GOOGLE_CLIENT_ID"`
	GoogleClientSecret string `mapstructure:"GOOGLE_CLIENT_SECRET"`
	GoogleRedirectURI  string `mapstructure:"GOOGLE_REDIRECT_URI"`

	// Redis Caching & Cache-Control Settings
	RedisAddress       string        `mapstructure:"REDIS_ADDRESS"`
	RedisPassword      string        `mapstructure:"REDIS_PASSWORD"`
	RedisDB            int           `mapstructure:"REDIS_DB"`
	CacheTTLShortURL   time.Duration `mapstructure:"CACHE_TTL_SHORT_URL"`
	CacheControlMaxAge int           `mapstructure:"CACHE_CONTROL_MAX_AGE"`

	// NATS Event Bus Settings
	NatsURL string `mapstructure:"NATS_URL"`
}

// LoadConfig reads configuration from file or environment variables.
func LoadConfig(path string) (config Config, err error) {
	if path != "" {
		viper.AddConfigPath(path)
	}
	viper.AddConfigPath("./server")
	viper.AddConfigPath("server")
	viper.AddConfigPath(".")

	// Set aliases for backwards compatibility with legacy environment variable names
	viper.RegisterAlias("ENVIRONMENT", "APP_ENV")
	viper.RegisterAlias("ACCESS_TOKEN_DURATION", "JWT_ACCESS_TOKEN_DURATION")
	viper.RegisterAlias("REFRESH_TOKEN_DURATION", "JWT_REFRESH_TOKEN_DURATION")

	// Default configuration values grouped by intent
	viper.SetDefault("APP_ENV", "development")
	viper.SetDefault("APP_BASE_URL", "http://localhost:8080")
	viper.SetDefault("MIGRATION_URL", "file://server/db/migration")
	viper.SetDefault("APP_LOCALE", "id")

	viper.SetDefault("LOG_LEVEL", "debug")
	viper.SetDefault("LOG_FORMAT", "text")
	viper.SetDefault("LOG_ADD_SOURCE", true)
	viper.SetDefault("LOG_REDIRECT_SAMPLE_RATE", 1.0)

	viper.SetDefault("SERVER_ADDRESS", "0.0.0.0:8080")
	viper.SetDefault("SERVER_READ_TIMEOUT", "15s")
	viper.SetDefault("SERVER_WRITE_TIMEOUT", "15s")
	viper.SetDefault("SERVER_IDLE_TIMEOUT", "60s")
	viper.SetDefault("SERVER_SHUTDOWN_TIMEOUT", "10s")

	viper.SetDefault("RATE_LIMIT_AUTH_REQUESTS", 10)
	viper.SetDefault("RATE_LIMIT_AUTH_WINDOW", "1m")
	viper.SetDefault("RATE_LIMIT_API_REQUESTS", 100)
	viper.SetDefault("RATE_LIMIT_API_WINDOW", "1m")
	viper.SetDefault("RATE_LIMIT_PUBLIC_REQUESTS", 300)
	viper.SetDefault("RATE_LIMIT_PUBLIC_WINDOW", "1m")

	viper.SetDefault("DB_SOURCE", "postgres://postgres:postgres@127.0.0.1:5432/urlshortener?sslmode=disable")
	viper.SetDefault("DB_MAX_CONNS", 25)
	viper.SetDefault("DB_MIN_CONNS", 5)
	viper.SetDefault("DB_MAX_CONN_IDLE_TIME", "15m")
	viper.SetDefault("DB_MAX_CONN_LIFETIME", "1h")

	viper.SetDefault("JWT_SECRET", "super-secret-32-byte-key-for-jwt-signing!")
	viper.SetDefault("JWT_ACCESS_TOKEN_DURATION", "15m")
	viper.SetDefault("JWT_REFRESH_TOKEN_DURATION", "168h") // 7 days

	viper.SetDefault("GOOGLE_CLIENT_ID", "")
	viper.SetDefault("GOOGLE_CLIENT_SECRET", "")
	viper.SetDefault("GOOGLE_REDIRECT_URI", "http://localhost:8080/api/v1/auth/google/callback")

	viper.SetDefault("REDIS_ADDRESS", "127.0.0.1:6379")
	viper.SetDefault("REDIS_PASSWORD", "")
	viper.SetDefault("REDIS_DB", 0)
	viper.SetDefault("CACHE_TTL_SHORT_URL", "1h")
	viper.SetDefault("CACHE_CONTROL_MAX_AGE", 300)

	viper.SetDefault("NATS_URL", "nats://127.0.0.1:4222")

	viper.AutomaticEnv()

	// Try reading "app.env" first
	viper.SetConfigName("app")
	viper.SetConfigType("env")
	if err := viper.ReadInConfig(); err != nil {
		// Fallback to ".env" if "app.env" is not found
		viper.SetConfigName(".env")
		viper.SetConfigType("env")
		_ = viper.ReadInConfig()
	}

	err = viper.Unmarshal(&config)
	return
}

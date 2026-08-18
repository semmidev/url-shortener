package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
	"strings"
)

// Config encapsulates configuration for initializing a Logger.
type Config struct {
	Level     string    // Options: "debug", "info", "warn", "error" (default: "debug" in dev, "info" in prod)
	Format    string    // Options: "text" (key=value format), "json" (structured JSON) (default: "text" in dev, "json" in prod)
	AddSource bool      // Options: true (include caller file:line number), false
	Out       io.Writer // target writer, defaults to os.Stderr
}

// Logger is a context-aware, structured logger wrapping standard library log/slog.
type Logger struct {
	sl *slog.Logger
}

// ParseLevel converts a string representation ("debug", "info", "warn", "error") to slog.Level.
func ParseLevel(lvl string) slog.Level {
	switch strings.ToLower(strings.TrimSpace(lvl)) {
	case "debug":
		return slog.LevelDebug
	case "warn", "warning":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	case "info":
		return slog.LevelInfo
	default:
		return slog.LevelInfo
	}
}

// NewWithConfig creates a new Logger using explicit Config struct options.
func NewWithConfig(cfg Config) *Logger {
	out := cfg.Out
	if out == nil {
		out = os.Stderr
	}

	opts := &slog.HandlerOptions{
		AddSource:   cfg.AddSource,
		Level:       ParseLevel(cfg.Level),
		ReplaceAttr: RedactReplaceAttr,
	}

	var baseHandler slog.Handler
	if strings.ToLower(strings.TrimSpace(cfg.Format)) == "json" {
		baseHandler = slog.NewJSONHandler(out, opts)
	} else {
		baseHandler = slog.NewTextHandler(out, opts)
	}

	handler := NewContextHandler(baseHandler)
	return &Logger{
		sl: slog.New(handler),
	}
}

// New initializes a Logger instance with Wide Event & Redaction support based on env or environment variables.
func New(env string, out io.Writer) *Logger {
	logLevel := os.Getenv("LOG_LEVEL")
	if logLevel == "" {
		if env == "production" {
			logLevel = "info"
		} else {
			logLevel = "debug"
		}
	}

	logFormat := os.Getenv("LOG_FORMAT")
	if logFormat == "" {
		if env == "production" {
			logFormat = "json"
		} else {
			logFormat = "text"
		}
	}

	addSource := true
	if srcVal := os.Getenv("LOG_ADD_SOURCE"); srcVal != "" {
		addSource = strings.ToLower(srcVal) == "true" || srcVal == "1"
	}

	return NewWithConfig(Config{
		Level:     logLevel,
		Format:    logFormat,
		AddSource: addSource,
		Out:       out,
	})
}

func (l *Logger) Slog() *slog.Logger {
	return l.sl
}

func (l *Logger) Info(ctx context.Context, msg string, args ...any) {
	l.sl.InfoContext(ctx, msg, args...)
}

func (l *Logger) Warn(ctx context.Context, msg string, args ...any) {
	l.sl.WarnContext(ctx, msg, args...)
}

func (l *Logger) Error(ctx context.Context, msg string, args ...any) {
	l.sl.ErrorContext(ctx, msg, args...)
}

func (l *Logger) Debug(ctx context.Context, msg string, args ...any) {
	l.sl.DebugContext(ctx, msg, args...)
}

package middleware

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
)

type responseWriter struct {
	http.ResponseWriter
	statusCode   int
	bytesWritten int64
}

func (rw *responseWriter) WriteHeader(statusCode int) {
	rw.statusCode = statusCode
	rw.ResponseWriter.WriteHeader(statusCode)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if rw.statusCode == 0 {
		rw.statusCode = http.StatusOK
	}
	n, err := rw.ResponseWriter.Write(b)
	rw.bytesWritten += int64(n)
	return n, err
}

// WideEventLogging returns a chi HTTP middleware that captures request lifecycle into a single Wide Event log line.
func WideEventLogging(appLogger *logger.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			reqID := r.Header.Get("X-Request-ID")
			if reqID == "" {
				reqID = uuid.NewString()
			}
			w.Header().Set("X-Request-ID", reqID)

			ctx := logger.WithRequestID(r.Context(), reqID)

			ev := logger.NewEvent()
			ctx = logger.WithEvent(ctx, ev)

			ev.Set("http.method", r.Method)
			ev.Set("http.path", r.URL.Path)
			ev.Set("http.query", r.URL.RawQuery)
			ev.Set("http.client_ip", r.RemoteAddr)
			ev.Set("http.user_agent", r.UserAgent())

			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			start := time.Now()

			next.ServeHTTP(rw, r.WithContext(ctx))

			latencyMs := float64(time.Since(start).Microseconds()) / 1000.0
			ev.Set("http.status_code", rw.statusCode)
			ev.Set("http.response_bytes", rw.bytesWritten)
			ev.Set("latency_ms", latencyMs)

			args := ev.Args()
			if rw.statusCode >= 500 {
				appLogger.Error(ctx, "http_request", args...)
			} else if rw.statusCode >= 400 {
				appLogger.Warn(ctx, "http_request", args...)
			} else {
				appLogger.Info(ctx, "http_request", args...)
			}
		})
	}
}

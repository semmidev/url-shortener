package middleware

import (
	"fmt"
	"net/http"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/trace"
)

// Tracing returns a middleware that starts an OpenTelemetry span for each incoming HTTP request.
func Tracing(serviceName string) func(http.Handler) http.Handler {
	tracer := otel.Tracer(serviceName)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract incoming W3C TraceContext headers if present
			ctx := otel.GetTextMapPropagator().Extract(r.Context(), propagation.HeaderCarrier(r.Header))

			spanName := fmt.Sprintf("%s %s", r.Method, r.URL.Path)
			ctx, span := tracer.Start(ctx, spanName,
				trace.WithSpanKind(trace.SpanKindServer),
				trace.WithAttributes(
					attribute.String("http.method", r.Method),
					attribute.String("http.url", r.URL.String()),
					attribute.String("http.target", r.URL.Path),
					attribute.String("user_agent", r.UserAgent()),
				),
			)
			defer span.End()

			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			// Expose Trace-ID header in HTTP response for debugging and client correlation
			if sc := span.SpanContext(); sc.IsValid() {
				rw.Header().Set("X-Trace-ID", sc.TraceID().String())
			}

			next.ServeHTTP(rw, r.WithContext(ctx))

			span.SetAttributes(
				attribute.Int("http.status_code", rw.statusCode),
				attribute.Int64("http.response_size", rw.bytesWritten),
			)
		})
	}
}

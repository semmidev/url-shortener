package telemetry

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

const TracerName = "github.com/semmidev/url-shortener"

// StartSpan starts a new span with the given name and attributes.
// It returns a new context containing the child span and a completion function.
// Usage:
//
//	ctx, endSpan := telemetry.StartSpan(ctx, "url.Service.Create", attribute.String("short_code", code))
//	defer func() { endSpan(err) }()
func StartSpan(ctx context.Context, name string, attrs ...attribute.KeyValue) (context.Context, func(error)) {
	tracer := otel.GetTracerProvider().Tracer(TracerName)
	ctx, span := tracer.Start(ctx, name, trace.WithAttributes(attrs...))

	return ctx, func(err error) {
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
		} else {
			span.SetStatus(codes.Ok, "")
		}
		span.End()
	}
}

// AddAttributes adds key-value attributes to the active span in context.
func AddAttributes(ctx context.Context, attrs ...attribute.KeyValue) {
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		span.SetAttributes(attrs...)
	}
}

// RecordError records an error on the active span in context if non-nil.
func RecordError(ctx context.Context, err error) {
	if err == nil {
		return
	}
	span := trace.SpanFromContext(ctx)
	if span.IsRecording() {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
	}
}

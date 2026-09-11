package eventbus

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/nats-io/nats.go"
)

const (
	DefaultSpecVersion  = "1.0"
	DefaultEventVersion = "1.0"
	DefaultSource       = "url-shortener-api"
)

// Event represents a CNCF CloudEvents v1.0 compliant event envelope for enterprise Event-Driven Architecture.
type Event struct {
	// Standard CloudEvents Identifiers
	ID           string `json:"id"`                      // Unique Event ID (e.g. UUIDv7)
	Source       string `json:"source"`                  // Originating service name (e.g. "url-shortener-api")
	SpecVersion  string `json:"specversion"`             // CloudEvents specification version (e.g. "1.0")
	EventType    string `json:"event_type"`              // Event name (e.g. "urls.created", "user.registered")
	EventVersion string `json:"event_version,omitempty"` // Version of the payload schema (e.g. "1.0")

	// Domain & Multi-Tenancy Context
	AggregateType string `json:"aggregate_type,omitempty"` // Entity aggregate type (e.g. "url", "user", "tenant")
	AggregateID   string `json:"aggregate_id,omitempty"`   // Entity aggregate ID
	TenantID      string `json:"tenant_id,omitempty"`      // Multi-tenant organization/workspace ID

	// Observability & Tracing Context
	TraceID string `json:"trace_id,omitempty"` // OpenTelemetry Trace ID for end-to-end distributed tracing

	// Payload & Optional Metadata
	Payload  json.RawMessage `json:"payload"`            // Event data payload
	Metadata map[string]any  `json:"metadata,omitempty"` // Extensible contextual headers

	// Timestamp
	CreatedAt time.Time `json:"created_at"` // Event creation timestamp (UTC)
}

// NewEvent creates a CloudEvents-compliant Event envelope with sensible default standards.
func NewEvent(eventType string, payload json.RawMessage) Event {
	return Event{
		Source:       DefaultSource,
		SpecVersion:  DefaultSpecVersion,
		EventType:    eventType,
		EventVersion: DefaultEventVersion,
		Payload:      payload,
		CreatedAt:    time.Now().UTC(),
	}
}

type EventHandler func(ctx context.Context, event Event) error

// EventPublisher defines the contract for async message broker implementations (NATS, Kafka, RabbitMQ, etc.)
type EventPublisher interface {
	Publish(ctx context.Context, topic string, event Event) error
	Subscribe(ctx context.Context, topic string, handler EventHandler) error
	Close() error
}

// NatsPublisher implements EventPublisher using NATS JetStream
type NatsPublisher struct {
	nc *nats.Conn
	js nats.JetStreamContext
}

func NewNatsPublisher(natsURL string) (*NatsPublisher, error) {
	nc, err := nats.Connect(natsURL, nats.Timeout(3*time.Second))
	if err != nil {
		return nil, fmt.Errorf("failed to connect to NATS: %w", err)
	}

	js, err := nc.JetStream()
	if err != nil {
		nc.Close()
		return nil, fmt.Errorf("failed to get JetStream context: %w", err)
	}

	// Ensure Stream exists for events
	_, err = js.AddStream(&nats.StreamConfig{
		Name:     "EVENTS",
		Subjects: []string{"events.>"},
	})
	if err != nil && err != nats.ErrStreamNameAlreadyInUse {
		slog.Warn("failed to create NATS JetStream stream", "error", err)
	}

	return &NatsPublisher{nc: nc, js: js}, nil
}

func (n *NatsPublisher) Publish(ctx context.Context, topic string, event Event) error {
	if event.SpecVersion == "" {
		event.SpecVersion = DefaultSpecVersion
	}
	if event.Source == "" {
		event.Source = DefaultSource
	}

	data, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("failed to marshal event: %w", err)
	}

	subject := fmt.Sprintf("events.%s", topic)
	_, err = n.js.Publish(subject, data)
	if err != nil {
		return fmt.Errorf("failed to publish event to NATS: %w", err)
	}
	return nil
}

func (n *NatsPublisher) Subscribe(ctx context.Context, topic string, handler EventHandler) error {
	subject := fmt.Sprintf("events.%s", topic)
	_, err := n.js.Subscribe(subject, func(m *nats.Msg) {
		var event Event
		if err := json.Unmarshal(m.Data, &event); err != nil {
			slog.Error("failed to unmarshal NATS event", "error", err)
			return
		}
		if err := handler(ctx, event); err != nil {
			slog.Error("event handler failed", "topic", topic, "error", err)
		} else {
			_ = m.Ack()
		}
	}, nats.ManualAck())
	return err
}

func (n *NatsPublisher) Close() error {
	if n.nc != nil {
		n.nc.Close()
	}
	return nil
}

// InMemoryPublisher implements EventPublisher for fallback or in-memory channel streaming
type InMemoryPublisher struct {
	mu          sync.RWMutex
	subscribers map[string][]EventHandler
}

func NewInMemoryPublisher() *InMemoryPublisher {
	return &InMemoryPublisher{
		subscribers: make(map[string][]EventHandler),
	}
}

func (m *InMemoryPublisher) Publish(ctx context.Context, topic string, event Event) error {
	if event.SpecVersion == "" {
		event.SpecVersion = DefaultSpecVersion
	}
	if event.Source == "" {
		event.Source = DefaultSource
	}

	m.mu.RLock()
	handlers := m.subscribers[topic]
	m.mu.RUnlock()

	for _, h := range handlers {
		if err := h(ctx, event); err != nil {
			slog.Error("in-memory event handler error", "topic", topic, "error", err)
		}
	}
	return nil
}

func (m *InMemoryPublisher) Subscribe(ctx context.Context, topic string, handler EventHandler) error {
	m.mu.Lock()
	m.subscribers[topic] = append(m.subscribers[topic], handler)
	m.mu.Unlock()
	return nil
}

func (m *InMemoryPublisher) Close() error {
	return nil
}

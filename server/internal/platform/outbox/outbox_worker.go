package outbox

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	db "github.com/semmidev/url-shortener/server/db/sqlc"
	"github.com/semmidev/url-shortener/server/internal/platform/eventbus"
)

type ClickRecordedPayload struct {
	URLID     uuid.UUID `json:"url_id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	Referrer  string    `json:"referrer"`
}

type ClickRecorder interface {
	RecordClick(ctx context.Context, urlID uuid.UUID, ip, userAgent, referrer string)
}

type OutboxWorker struct {
	store     db.Store
	publisher eventbus.EventPublisher
	recorder  ClickRecorder
}

func NewOutboxWorker(store db.Store, publisher eventbus.EventPublisher, recorder ClickRecorder) *OutboxWorker {
	return &OutboxWorker{
		store:     store,
		publisher: publisher,
		recorder:  recorder,
	}
}

func (w *OutboxWorker) Start(ctx context.Context) {
	// Subscribe to click.recorded event topic
	_ = w.publisher.Subscribe(ctx, "click.recorded", func(ctx context.Context, event eventbus.Event) error {
		var payload ClickRecordedPayload
		if err := json.Unmarshal(event.Payload, &payload); err != nil {
			slog.Error("failed to unmarshal click payload", "error", err)
			return err
		}
		if w.recorder != nil {
			w.recorder.RecordClick(ctx, payload.URLID, payload.IPAddress, payload.UserAgent, payload.Referrer)
		}
		return nil
	})

	// Background ticker polling PENDING outbox entries
	ticker := time.NewTicker(500 * time.Millisecond)
	go func() {
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				w.processPendingEvents(ctx)
			}
		}
	}()
}

func (w *OutboxWorker) processPendingEvents(ctx context.Context) {
	events, err := w.store.GetPendingOutboxEvents(ctx, 50)
	if err != nil || len(events) == 0 {
		return
	}

	for _, e := range events {
		evt := eventbus.Event{
			ID:            e.ID.String(),
			AggregateType: e.AggregateType,
			AggregateID:   e.AggregateID,
			EventType:     e.EventType,
			Payload:       e.Payload,
			CreatedAt:     e.CreatedAt,
		}

		if err := w.publisher.Publish(ctx, e.EventType, evt); err != nil {
			slog.Error("failed to publish outbox event", "event_id", e.ID, "error", err)
			continue
		}

		_ = w.store.MarkOutboxEventProcessed(ctx, e.ID)
	}
}

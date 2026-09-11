package eventbus

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestNewEventAndInMemoryPublisher(t *testing.T) {
	pub := NewInMemoryPublisher()
	defer func() {
		_ = pub.Close()
	}()

	ctx := context.Background()
	receivedEvents := make(chan Event, 1)

	err := pub.Subscribe(ctx, "urls.created", func(ctx context.Context, event Event) error {
		receivedEvents <- event
		return nil
	})
	require.NoError(t, err)

	payload := json.RawMessage(`{"short_code":"abc1234"}`)
	evt := NewEvent("urls.created", payload)
	evt.ID = "evt-12345"
	evt.TenantID = "tenant-001"
	evt.TraceID = "trace-999"

	err = pub.Publish(ctx, "urls.created", evt)
	require.NoError(t, err)

	select {
	case rec := <-receivedEvents:
		require.Equal(t, "evt-12345", rec.ID)
		require.Equal(t, DefaultSource, rec.Source)
		require.Equal(t, DefaultSpecVersion, rec.SpecVersion)
		require.Equal(t, "urls.created", rec.EventType)
		require.Equal(t, DefaultEventVersion, rec.EventVersion)
		require.Equal(t, "tenant-001", rec.TenantID)
		require.Equal(t, "trace-999", rec.TraceID)
		require.JSONEq(t, `{"short_code":"abc1234"}`, string(rec.Payload))
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for event delivery")
	}
}

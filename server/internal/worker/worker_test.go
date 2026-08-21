package worker_test

import (
	"encoding/json"
	"testing"

	"github.com/semmidev/url-shortener/server/internal/worker"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWorker_PayloadSerialization(t *testing.T) {
	t.Run("PayloadDeactivateExpiredURLs", func(t *testing.T) {
		payload := &worker.PayloadDeactivateExpiredURLs{
			BatchSize: 50,
		}

		data, err := json.Marshal(payload)
		require.NoError(t, err)

		var unmarshaled worker.PayloadDeactivateExpiredURLs
		err = json.Unmarshal(data, &unmarshaled)
		require.NoError(t, err)

		assert.Equal(t, int32(50), unmarshaled.BatchSize)
	})
}

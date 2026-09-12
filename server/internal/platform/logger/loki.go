package logger

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"sync"
	"time"
)

type lokiStream struct {
	Stream map[string]string `json:"stream"`
	Values [][2]string       `json:"values"`
}

type lokiPushPayload struct {
	Streams []lokiStream `json:"streams"`
}

type lokiEntry struct {
	timestamp int64
	level     string
	line      string
}

// LokiHandler wraps an underlying slog.Handler and asynchronously flushes log entries to Loki.
type LokiHandler struct {
	parent      slog.Handler
	url         string
	serviceName string
	env         string
	client      *http.Client
	logChan     chan lokiEntry
	cancel      context.CancelFunc
	wg          sync.WaitGroup
}

// NewLokiHandler creates a new LokiHandler wrapper around a parent slog.Handler.
func NewLokiHandler(parent slog.Handler, lokiURL, serviceName, env string) *LokiHandler {
	if lokiURL == "" {
		return &LokiHandler{parent: parent}
	}

	ctx, cancel := context.WithCancel(context.Background()) //nolint:gosec // cancel function stored in struct for background worker lifecycle
	h := &LokiHandler{
		parent:      parent,
		url:         lokiURL,
		serviceName: serviceName,
		env:         env,
		client:      &http.Client{Timeout: 3 * time.Second},
		logChan:     make(chan lokiEntry, 2000),
		cancel:      cancel,
	}

	h.wg.Add(1)
	go h.startWorker(ctx)
	return h
}

// Close stops the Loki log background worker and flushes remaining log entries.
func (h *LokiHandler) Close() {
	if h.cancel != nil {
		h.cancel()
		h.wg.Wait()
	}
}

func (h *LokiHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return h.parent.Enabled(ctx, level)
}

func (h *LokiHandler) Handle(ctx context.Context, r slog.Record) error {
	// First execute parent handler (e.g. JSON/Text stdout)
	err := h.parent.Handle(ctx, r)

	if h.url == "" {
		return err
	}

	attrs := make(map[string]any, r.NumAttrs()+5)
	attrs["time"] = r.Time.UTC().Format(time.RFC3339Nano)
	attrs["level"] = r.Level.String()
	attrs["msg"] = r.Message

	r.Attrs(func(a slog.Attr) bool {
		attrs[a.Key] = a.Value.Any()
		return true
	})

	lineBytes, jsonErr := json.Marshal(attrs)
	if jsonErr != nil {
		return err
	}

	entry := lokiEntry{
		timestamp: r.Time.UnixNano(),
		level:     r.Level.String(),
		line:      string(lineBytes),
	}

	select {
	case h.logChan <- entry:
	default:
		// Queue full - drop entry non-blockingly to protect application performance
	}

	return err
}

func (h *LokiHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	return &LokiHandler{
		parent:      h.parent.WithAttrs(attrs),
		url:         h.url,
		serviceName: h.serviceName,
		env:         h.env,
		client:      h.client,
		logChan:     h.logChan,
	}
}

func (h *LokiHandler) WithGroup(name string) slog.Handler {
	return &LokiHandler{
		parent:      h.parent.WithGroup(name),
		url:         h.url,
		serviceName: h.serviceName,
		env:         h.env,
		client:      h.client,
		logChan:     h.logChan,
	}
}

func (h *LokiHandler) startWorker(ctx context.Context) {
	defer h.wg.Done()
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	var batch []lokiEntry

	flush := func() {
		if len(batch) == 0 {
			return
		}
		entries := batch
		batch = nil

		grouped := make(map[string][][2]string)
		for _, e := range entries {
			tsStr := strconv.FormatInt(e.timestamp, 10)
			grouped[e.level] = append(grouped[e.level], [2]string{tsStr, e.line})
		}

		payload := lokiPushPayload{
			Streams: make([]lokiStream, 0, len(grouped)),
		}

		for lvl, vals := range grouped {
			payload.Streams = append(payload.Streams, lokiStream{
				Stream: map[string]string{
					"service": h.serviceName,
					"level":   lvl,
					"env":     h.env,
				},
				Values: vals,
			})
		}

		body, err := json.Marshal(payload)
		if err != nil {
			return
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodPost, h.url, bytes.NewReader(body))
		if err != nil {
			return
		}
		req.Header.Set("Content-Type", "application/json")

		resp, err := h.client.Do(req)
		if err == nil && resp != nil {
			_ = resp.Body.Close()
		}
	}

	for {
		select {
		case <-ctx.Done():
			for {
				select {
				case entry := <-h.logChan:
					batch = append(batch, entry)
				default:
					flush()
					return
				}
			}
		case entry := <-h.logChan:
			batch = append(batch, entry)
			if len(batch) >= 100 {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}

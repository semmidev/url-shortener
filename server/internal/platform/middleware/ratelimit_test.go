package middleware

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRateLimiterMiddleware(t *testing.T) {
	r := chi.NewRouter()
	r.Use(RateLimiter(2, 1*time.Minute))
	r.Get("/test", func(w http.ResponseWriter, r *http.Request) {
		web.Success(w, http.StatusOK, "success", nil, nil)
	})

	ts := httptest.NewServer(r)
	defer ts.Close()

	client := ts.Client()

	// 1st request -> 200 OK
	resp1, err := client.Get(ts.URL + "/test")
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp1.StatusCode)
	_ = resp1.Body.Close()

	// 2nd request -> 200 OK
	resp2, err := client.Get(ts.URL + "/test")
	require.NoError(t, err)
	assert.Equal(t, http.StatusOK, resp2.StatusCode)
	_ = resp2.Body.Close()

	// 3rd request -> 429 Too Many Requests
	resp3, err := client.Get(ts.URL + "/test")
	require.NoError(t, err)
	defer func() { _ = resp3.Body.Close() }()
	assert.Equal(t, http.StatusTooManyRequests, resp3.StatusCode)

	var apiResp web.Response
	err = json.NewDecoder(resp3.Body).Decode(&apiResp)
	require.NoError(t, err)
	assert.False(t, apiResp.Success)
	assert.Equal(t, "TOO_MANY_REQUESTS", apiResp.Code)
}

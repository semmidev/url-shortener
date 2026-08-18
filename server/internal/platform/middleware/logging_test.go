package middleware

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/stretchr/testify/assert"
)

func TestWideEventLoggingWithRedactedRequestBody(t *testing.T) {
	buf := new(bytes.Buffer)
	appLogger := logger.NewWithConfig(logger.Config{
		Level:  "info",
		Format: "json",
		Out:    buf,
	})

	r := chi.NewRouter()
	r.Use(WideEventLogging(appLogger))
	r.Post("/api/v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
		var req map[string]string
		_ = web.Decode(r, &req)
		assert.Equal(t, "user@example.com", req["email"])
		assert.Equal(t, "secret123", req["password"])
		web.Success(w, http.StatusOK, "login successful", nil, nil)
	})

	body := map[string]string{
		"email":    "user@example.com",
		"password": "secret123",
	}
	bodyBytes, _ := json.Marshal(body)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	rw := httptest.NewRecorder()

	r.ServeHTTP(rw, req)

	assert.Equal(t, http.StatusOK, rw.Code)

	logOutput := buf.String()
	assert.Contains(t, logOutput, `"email":"user@example.com"`)
	assert.Contains(t, logOutput, `"password":"[REDACTED]"`)
	assert.NotContains(t, logOutput, `"secret123"`)
}

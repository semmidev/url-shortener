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

func TestWideEventLogging_SkipsStaticAssetsAndSPARoutes(t *testing.T) {
	buf := new(bytes.Buffer)
	appLogger := logger.NewWithConfig(logger.Config{
		Level:  "info",
		Format: "json",
		Out:    buf,
	})

	r := chi.NewRouter()
	r.Use(WideEventLogging(appLogger))
	r.Get("/assets/vendor-motion.js", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("console.log('motion')"))
	})
	r.Get("/dashboard/urls/{id}", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("<html>SPA</html>"))
	})

	// Test 1: Static asset
	req1 := httptest.NewRequest(http.MethodGet, "/assets/vendor-motion.js", nil)
	rw1 := httptest.NewRecorder()
	r.ServeHTTP(rw1, req1)
	assert.Equal(t, http.StatusOK, rw1.Code)
	assert.Empty(t, buf.String(), "Static asset requests should not generate http_request log lines")

	// Test 2: SPA Dashboard Route
	buf.Reset()
	req2 := httptest.NewRequest(http.MethodGet, "/dashboard/urls/01a0283a-208a-75e3-8097-2c6de3364d2e", nil)
	rw2 := httptest.NewRecorder()
	r.ServeHTTP(rw2, req2)
	assert.Equal(t, http.StatusOK, rw2.Code)
	assert.Empty(t, buf.String(), "SPA page navigation requests should not generate http_request log lines")

	// Test 3: Public Redirection /Yt9Cide (Non-API route)
	buf.Reset()
	r.Get("/{code}", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "https://github.com/semmidev/", http.StatusTemporaryRedirect)
	})
	req3 := httptest.NewRequest(http.MethodGet, "/Yt9Cide", nil)
	rw3 := httptest.NewRecorder()
	r.ServeHTTP(rw3, req3)
	assert.Equal(t, http.StatusTemporaryRedirect, rw3.Code)
	assert.Empty(t, buf.String(), "Non-API public redirection requests should not generate http_request log lines")
}

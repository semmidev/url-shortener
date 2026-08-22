package web_test

import (
	"bytes"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/semmidev/url-shortener/server/internal/platform/web"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type SamplePayload struct {
	Name string `json:"name"`
	Age  int    `json:"age"`
}

func TestGo127GenericMethodsAndDecodeTyped(t *testing.T) {
	t.Parallel()

	jsonBody := `{"name":"Semmi","age":25}`
	req := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(jsonBody))

	// Test Go 1.27 generic function DecodeTyped[T]
	payload, err := web.DecodeTyped[SamplePayload](req)
	require.NoError(t, err)
	assert.Equal(t, "Semmi", payload.Name)
	assert.Equal(t, 25, payload.Age)

	// Test Go 1.27 Generic Method RequestParser.Parse[T]
	jsonBody2 := `{"name":"DeepMind","age":10}`
	req2 := httptest.NewRequest(http.MethodPost, "/test", bytes.NewBufferString(jsonBody2))

	var parser web.RequestParser
	payload2, err := parser.Parse[SamplePayload](req2)
	require.NoError(t, err)
	assert.Equal(t, "DeepMind", payload2.Name)
	assert.Equal(t, 10, payload2.Age)
}

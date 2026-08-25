package url

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateRandomCode(t *testing.T) {
	code1, err := GenerateRandomCode(DefaultCodeLength)
	require.NoError(t, err)
	assert.Len(t, code1, DefaultCodeLength)

	code2, err := GenerateRandomCode(DefaultCodeLength)
	require.NoError(t, err)

	assert.NotEqual(t, code1, code2)
}

func TestCreateURLRequestValidation(t *testing.T) {
	tests := []struct {
		name    string
		req     CreateURLRequest
		wantErr bool
	}{
		{
			name: "valid request",
			req: CreateURLRequest{
				OriginalURL: "https://google.com",
				CustomCode:  "my-custom-link",
			},
			wantErr: false,
		},
		{
			name: "invalid url scheme",
			req: CreateURLRequest{
				OriginalURL: "ftp://google.com",
			},
			wantErr: true,
		},
		{
			name: "invalid custom code format",
			req: CreateURLRequest{
				OriginalURL: "https://google.com",
				CustomCode:  "bad code!",
			},
			wantErr: true,
		},
		{
			name: "rejection of loopback IP (SSRF)",
			req: CreateURLRequest{
				OriginalURL: "http://127.0.0.1/admin",
			},
			wantErr: true,
		},
		{
			name: "rejection of private IP (SSRF)",
			req: CreateURLRequest{
				OriginalURL: "http://192.168.1.1/secret",
			},
			wantErr: true,
		},
		{
			name: "rejection of localhost hostname (SSRF)",
			req: CreateURLRequest{
				OriginalURL: "http://localhost:8080/metrics",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

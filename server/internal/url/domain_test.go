package url

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGenerateRandomCode(t *testing.T) {
	code1, err := GenerateRandomCode(7)
	require.NoError(t, err)
	assert.Len(t, code1, 7)

	code2, err := GenerateRandomCode(7)
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

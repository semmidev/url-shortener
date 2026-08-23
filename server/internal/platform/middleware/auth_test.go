package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
	"uuid"

	"github.com/semmidev/url-shortener/server/internal/platform/token"
	"github.com/semmidev/url-shortener/server/internal/platform/web"
)

func TestAuthMiddleware(t *testing.T) {
	secretKey := "12345678901234567890123456789012"
	maker, err := token.NewJWTMaker(secretKey)
	if err != nil {
		t.Fatalf("failed to create jwt maker: %v", err)
	}

	userID := uuid.New()
	sessionID := uuid.New()
	role := "user"

	validToken, _, err := maker.CreateToken(userID, role, sessionID, time.Minute)
	if err != nil {
		t.Fatalf("failed to create valid token: %v", err)
	}

	expiredToken, _, err := maker.CreateToken(userID, role, sessionID, -time.Minute)
	if err != nil {
		t.Fatalf("failed to create expired token: %v", err)
	}

	nextHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid, ok := web.UserID(r.Context())
		if !ok || uid != userID {
			t.Errorf("expected UserID %v, got %v", userID, uid)
		}
		w.WriteHeader(http.StatusOK)
	})

	mw := Auth(maker)(nextHandler)

	tests := []struct {
		name           string
		setupReq       func(req *http.Request)
		expectedStatus int
	}{
		{
			name: "Valid Bearer token in header",
			setupReq: func(req *http.Request) {
				req.Header.Set("Authorization", "Bearer "+validToken)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Valid token in access_token cookie",
			setupReq: func(req *http.Request) {
				req.AddCookie(&http.Cookie{Name: "access_token", Value: validToken})
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Valid token in token cookie",
			setupReq: func(req *http.Request) {
				req.AddCookie(&http.Cookie{Name: "token", Value: validToken})
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Missing both header and cookie",
			setupReq: func(req *http.Request) {
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "Expired token in header",
			setupReq: func(req *http.Request) {
				req.Header.Set("Authorization", "Bearer "+expiredToken)
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "Expired token in cookie",
			setupReq: func(req *http.Request) {
				req.AddCookie(&http.Cookie{Name: "access_token", Value: expiredToken})
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "Invalid token string",
			setupReq: func(req *http.Request) {
				req.Header.Set("Authorization", "Bearer invalidtokenstring")
			},
			expectedStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/urls", nil)
			tt.setupReq(req)
			rec := httptest.NewRecorder()

			mw.ServeHTTP(rec, req)

			if rec.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, rec.Code)
			}
		})
	}
}

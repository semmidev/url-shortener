package web

import (
	"context"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strings"
	"uuid"

	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/logger"
)

type ctxKey int

const (
	userIDKey ctxKey = iota + 1
	userRoleKey
	sessionIDKey
)

type Response struct {
	Success bool              `json:"success"`
	Code    string            `json:"code,omitempty"`
	Message string            `json:"message"`
	Data    any               `json:"data,omitempty"`
	Meta    any               `json:"meta,omitempty"`
	Errors  map[string]string `json:"errors,omitempty"`
}

// Success writes a standardized JSON success response (omitting redundant success code).
func Success(w http.ResponseWriter, status int, message string, data any, meta any) {
	if message == "" {
		message = "Operation completed successfully"
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Response{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    meta,
	})
}

// JSON writes a JSON response with status code (backward compatible helper).
func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	// Check if data is already wrapped in a response map
	if m, ok := data.(map[string]any); ok {
		d, dataOk := m["data"]
		meta := m["meta"]
		msg, _ := m["message"].(string)

		if dataOk {
			if msg == "" {
				msg = "Operation completed successfully"
			}
			_ = json.NewEncoder(w).Encode(Response{
				Success: true,
				Message: msg,
				Data:    d,
				Meta:    meta,
			})
			return
		}
	}

	_ = json.NewEncoder(w).Encode(Response{
		Success: true,
		Message: "Operation completed successfully",
		Data:    data,
	})
}

// Error writes a standardized JSON error response based on apperr.Error and enriches the wide event context.
func Error(w http.ResponseWriter, r *http.Request, err error) {
	if ev, ok := logger.EventFromContext(r.Context()); ok {
		ev.SetError(err)
	}

	var appErr *apperr.Error
	if errors.As(err, &appErr) {
		status := appErr.HTTPStatusCode()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_ = json.NewEncoder(w).Encode(Response{
			Success: false,
			Code:    appErr.Code,
			Message: appErr.Message,
			Errors:  appErr.Fields,
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusInternalServerError)
	_ = json.NewEncoder(w).Encode(Response{
		Success: false,
		Code:    "INTERNAL_SERVER_ERROR",
		Message: "internal server error",
	})
}

// Decode decodes JSON request body into dst struct.
func Decode(r *http.Request, dst any) error {
	if r.Body == nil {
		return apperr.Invalid("request body cannot be empty")
	}
	defer func() {
		_ = r.Body.Close()
	}()

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(dst); err != nil {
		return apperr.Invalid("invalid JSON body: " + err.Error())
	}
	return nil
}

// DecodeTyped leverages Go 1.27 generic functions to decode request body into a strongly-typed value T.
func DecodeTyped[T any](r *http.Request) (T, error) {
	var dst T
	if err := Decode(r, &dst); err != nil {
		return dst, err
	}
	return dst, nil
}

// RequestParser demonstrates Go 1.27 Generic Methods on structs.
type RequestParser struct{}

// Parse is a Go 1.27 generic method declared on RequestParser struct.
func (p RequestParser) Parse[T any](r *http.Request) (T, error) {
	return DecodeTyped[T](r)
}

// WithUser adds user information to context and enriches wide event context.
func WithUser(ctx context.Context, userID uuid.UUID, role string, sessionID uuid.UUID) context.Context {
	ctx = context.WithValue(ctx, userIDKey, userID)
	ctx = context.WithValue(ctx, userRoleKey, role)
	ctx = context.WithValue(ctx, sessionIDKey, sessionID)

	logger.Enrich(ctx, "auth.user_id", userID.String())
	logger.Enrich(ctx, "auth.role", role)

	return ctx
}

// UserID retrieves user ID from context.
func UserID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(userIDKey).(uuid.UUID)
	return id, ok
}

// UserRole retrieves user role from context.
func UserRole(ctx context.Context) (string, bool) {
	role, ok := ctx.Value(userRoleKey).(string)
	return role, ok
}

// SessionID retrieves session ID from context.
func SessionID(ctx context.Context) (uuid.UUID, bool) {
	id, ok := ctx.Value(sessionIDKey).(uuid.UUID)
	return id, ok
}

// GetClientIP extracts the real client IP address considering proxy headers like CF-Connecting-IP, X-Forwarded-For, and X-Real-IP.
func GetClientIP(r *http.Request) string {
	if ip := r.Header.Get("CF-Connecting-IP"); ip != "" {
		return strings.TrimSpace(ip)
	}
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}
	if ip := r.Header.Get("X-Real-IP"); ip != "" {
		return strings.TrimSpace(ip)
	}
	ip := r.RemoteAddr
	if host, _, err := net.SplitHostPort(ip); err == nil {
		return host
	}
	return ip
}

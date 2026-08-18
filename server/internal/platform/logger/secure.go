package logger

import (
	"fmt"
	"log/slog"
	"strings"
)

// SafeError implements public vs internal error separation as per JetBrains secure Go error handling best practices.
type SafeError struct {
	PublicMsg   string
	InternalErr error
}

func (e *SafeError) Error() string {
	if e.InternalErr != nil {
		return fmt.Sprintf("%s: %v", e.PublicMsg, e.InternalErr)
	}
	return e.PublicMsg
}

func (e *SafeError) PublicMessage() string {
	return e.PublicMsg
}

func (e *SafeError) Unwrap() error {
	return e.InternalErr
}

func NewSafeError(publicMsg string, internalErr error) *SafeError {
	return &SafeError{
		PublicMsg:   publicMsg,
		InternalErr: internalErr,
	}
}

var sensitiveKeys = map[string]bool{
	"password":             true,
	"password_hash":        true,
	"token":                true,
	"access_token":         true,
	"refresh_token":        true,
	"jwt_secret":           true,
	"secret":               true,
	"google_client_secret": true,
}

// RedactReplaceAttr is a slog.ReplaceAttr function that masks sensitive attributes.
func RedactReplaceAttr(groups []string, a slog.Attr) slog.Attr {
	key := strings.ToLower(a.Key)
	if sensitiveKeys[key] {
		return slog.String(a.Key, "[REDACTED]")
	}
	return a
}

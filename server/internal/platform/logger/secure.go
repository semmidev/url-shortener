package logger

import (
	"encoding/json"
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
	"authorization":        true,
	"code":                 true,
	"credit_card":          true,
}

func IsSensitiveKey(key string) bool {
	lowerKey := strings.ToLower(key)
	if sensitiveKeys[lowerKey] {
		return true
	}
	return strings.Contains(lowerKey, "password") || strings.Contains(lowerKey, "secret") || strings.Contains(lowerKey, "token")
}

// RedactReplaceAttr is a slog.ReplaceAttr function that masks sensitive attributes.
func RedactReplaceAttr(groups []string, a slog.Attr) slog.Attr {
	if IsSensitiveKey(a.Key) {
		return slog.String(a.Key, "[REDACTED]")
	}
	return a
}

// RedactValue recursively walks maps and slices to redact sensitive key values.
func RedactValue(val any) any {
	switch v := val.(type) {
	case map[string]any:
		res := make(map[string]any, len(v))
		for k, item := range v {
			if IsSensitiveKey(k) {
				res[k] = "[REDACTED]"
			} else {
				res[k] = RedactValue(item)
			}
		}
		return res
	case []any:
		res := make([]any, len(v))
		for i, item := range v {
			res[i] = RedactValue(item)
		}
		return res
	default:
		return v
	}
}

// RedactJSONBody parses raw request bytes and returns a redacted representation (map or string).
func RedactJSONBody(bodyBytes []byte) any {
	if len(bodyBytes) == 0 {
		return nil
	}
	var parsed any
	if err := json.Unmarshal(bodyBytes, &parsed); err == nil {
		return RedactValue(parsed)
	}
	str := string(bodyBytes)
	if len(str) > 1024 {
		str = str[:1024] + "..."
	}
	return str
}

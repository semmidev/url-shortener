package logger

import (
	"context"
)

// AuditAction represents a security-sensitive auditable event type.
type AuditAction string

const (
	AuditActionUserRegister    AuditAction = "user.register"
	AuditActionUserLogin       AuditAction = "user.login"
	AuditActionUserLoginFailed AuditAction = "user.login_failed"
	AuditActionUserLogout      AuditAction = "user.logout"
	AuditActionUserGoogleLogin AuditAction = "user.google_login"
	AuditActionURLCreate       AuditAction = "url.create"
	AuditActionURLUpdate       AuditAction = "url.update"
	AuditActionURLDelete       AuditAction = "url.delete"
	AuditActionTokenRefresh    AuditAction = "token.refresh"
)

// Audit emits a tamper-evident audit log entry for security-sensitive operations.
// Audit events are always logged at INFO level with the "audit" message key.
// They include the action name, request ID from context, and any additional attributes.
func (l *Logger) Audit(ctx context.Context, action AuditAction, attrs ...any) {
	args := make([]any, 0, len(attrs)+4)
	args = append(args, "audit.action", string(action))
	if reqID := RequestIDFromContext(ctx); reqID != "" {
		args = append(args, "audit.request_id", reqID)
	}
	args = append(args, attrs...)

	l.sl.InfoContext(ctx, "audit", args...)
}

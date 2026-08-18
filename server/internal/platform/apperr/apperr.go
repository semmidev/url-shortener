package apperr

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// Error represents a standardized domain/application error.
type Error struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Status  int               `json:"-"`
	Fields  map[string]string `json:"errors,omitempty"`
	Err     error             `json:"-"`
}

func (e *Error) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *Error) Unwrap() error { return e.Err }

func (e *Error) HTTPStatusCode() int {
	if e.Status != 0 {
		return e.Status
	}
	return http.StatusInternalServerError
}

func Internal(msg string, err error) *Error {
	return &Error{
		Code:    "INTERNAL_SERVER_ERROR",
		Message: msg,
		Status:  http.StatusInternalServerError,
		Err:     err,
	}
}

func Invalid(msg string) *Error {
	return &Error{
		Code:    "INVALID_INPUT",
		Message: msg,
		Status:  http.StatusBadRequest,
	}
}

func ValidationFailed(fields map[string]string) *Error {
	return &Error{
		Code:    "VALIDATION_ERROR",
		Message: "validasi gagal untuk data yang dikirimkan",
		Status:  http.StatusBadRequest,
		Fields:  fields,
	}
}

func NotFound(msg string) *Error {
	return &Error{
		Code:    "NOT_FOUND",
		Message: msg,
		Status:  http.StatusNotFound,
	}
}

func Unauthorized(msg string) *Error {
	return &Error{
		Code:    "UNAUTHORIZED",
		Message: msg,
		Status:  http.StatusUnauthorized,
	}
}

func Forbidden(msg string) *Error {
	return &Error{
		Code:    "FORBIDDEN",
		Message: msg,
		Status:  http.StatusForbidden,
	}
}

func Conflict(msg string) *Error {
	return &Error{
		Code:    "CONFLICT",
		Message: msg,
		Status:  http.StatusConflict,
	}
}

// MapDBError converts raw PostgreSQL & pgx database errors into clean domain apperr.Errors.
func MapDBError(err error, notFoundMsg, conflictMsg string) *Error {
	if err == nil {
		return nil
	}

	// 1. If already an *apperr.Error, return as-is
	var appErr *Error
	if errors.As(err, &appErr) {
		return appErr
	}

	// 2. Check pgx.ErrNoRows (404)
	if errors.Is(err, pgx.ErrNoRows) {
		if notFoundMsg == "" {
			notFoundMsg = "resource yang diminta tidak ditemukan"
		}
		return NotFound(notFoundMsg)
	}

	// 3. Check PostgreSQL error codes (*pgconn.PgError)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) {
		switch pgErr.Code {
		case "23505": // unique_violation
			if conflictMsg == "" {
				conflictMsg = "data dengan rincian ini sudah ada sebelumnya"
			}
			return Conflict(conflictMsg)
		case "23503": // foreign_key_violation
			return Invalid("referensi data tidak ditemukan")
		case "23502": // not_null_violation
			return Invalid("bidang wajib diisi dalam operasi database")
		}
	}

	// 4. Fallback to safe internal server error
	return Internal("operasi database gagal", err)
}

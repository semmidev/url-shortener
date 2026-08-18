package validator

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type sampleStruct struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
	Website  string `json:"website" validate:"omitempty,http_url"`
}

func TestValidateStruct(t *testing.T) {
	s := sampleStruct{
		Email:    "invalid-email",
		Password: "123",
		Website:  "ftp://example.com",
	}

	errs := ValidateStruct(s)
	require.Len(t, errs, 3)

	assert.Contains(t, errs, "email")
	assert.Contains(t, errs, "password")
	assert.Contains(t, errs, "website")
}

func TestValidateStructSuccess(t *testing.T) {
	s := sampleStruct{
		Email:    "test@example.com",
		Password: "securepassword",
		Website:  "https://example.com",
	}

	errs := ValidateStruct(s)
	assert.Empty(t, errs)
}

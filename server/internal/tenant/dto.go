package tenant

import (
	"time"

	"uuid"

	"github.com/semmidev/url-shortener/server/internal/platform/validator"
)

type TenantResponse struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	JoinCode  string    `json:"join_code"`
	Role      string    `json:"role,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type CreateTenantRequest struct {
	Name string `json:"name" validate:"required,min=2,max=100"`
	Slug string `json:"slug"`
}

func (r *CreateTenantRequest) Validate() error {
	return validator.Check(r)
}

type UpdateTenantRequest struct {
	Name string `json:"name" validate:"required,min=2,max=100"`
	Slug string `json:"slug"`
}

func (r *UpdateTenantRequest) Validate() error {
	return validator.Check(r)
}

type JoinTenantRequest struct {
	JoinCode string `json:"join_code" validate:"required"`
}

func (r *JoinTenantRequest) Validate() error {
	return validator.Check(r)
}

type TenantMemberResponse struct {
	UserID    uuid.UUID `json:"user_id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	AvatarURL string    `json:"avatar_url"`
	Role      string    `json:"role"`
	CreatedAt time.Time `json:"created_at"`
}

type AddTenantMemberRequest struct {
	Email string `json:"email" validate:"required,email"`
	Role  string `json:"role" validate:"required"`
}

func (r *AddTenantMemberRequest) Validate() error {
	return validator.Check(r)
}

type UpdateTenantMemberRoleRequest struct {
	Role string `json:"role" validate:"required"`
}

func (r *UpdateTenantMemberRoleRequest) Validate() error {
	return validator.Check(r)
}

type TenantRoleResponse struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    *uuid.UUID `json:"tenant_id,omitempty"`
	Name        string     `json:"name"`
	DisplayName string     `json:"display_name"`
	Description string     `json:"description"`
	IsSystem    bool       `json:"is_system"`
	Permissions []string   `json:"permissions"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type CreateTenantRoleRequest struct {
	Name        string   `json:"name" validate:"required,min=2,max=50"`
	DisplayName string   `json:"display_name" validate:"required,min=2,max=100"`
	Description string   `json:"description"`
	Permissions []string `json:"permissions"`
}

func (r *CreateTenantRoleRequest) Validate() error {
	return validator.Check(r)
}

type UpdateTenantRolePermissionsRequest struct {
	Permissions []string `json:"permissions"`
}

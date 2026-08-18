package user

// Role represents the user domain authorization role.
type Role string

const (
	RoleUser  Role = "user"
	RoleAdmin Role = "admin"
)

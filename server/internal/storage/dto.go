package storage

import (
	"errors"
	"slices"
	"strings"

	"github.com/semmidev/url-shortener/server/internal/platform/validator"
)

var allowedMimeTypes = []string{
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
	"image/gif",
	"image/svg+xml",
}

type PresignedURLRequest struct {
	FileName    string `json:"file_name" validate:"required"`
	ContentType string `json:"content_type" validate:"required"`
	FileSize    int64  `json:"file_size" validate:"required,min=1,max=10485760"`
	Category    string `json:"category"` // "avatars" or "uploads"
}

func (r *PresignedURLRequest) Validate() error {
	if err := validator.Check(r); err != nil {
		return err
	}

	ct := strings.ToLower(strings.TrimSpace(r.ContentType))
	if !slices.Contains(allowedMimeTypes, ct) {
		return errors.New("tipe file tidak didukung. Format yang diperbolehkan: JPEG, PNG, WEBP, GIF, SVG")
	}

	return nil
}

type PresignedURLResponse struct {
	UploadURL   string `json:"upload_url"`
	FileKey     string `json:"file_key"`
	PublicURL   string `json:"public_url"`
	ContentType string `json:"content_type"`
	ExpiresIn   int64  `json:"expires_in"` // expiration in seconds
}

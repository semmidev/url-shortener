package storage

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"path/filepath"
	"strings"
	"time"
	"uuid"

	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	platformStorage "github.com/semmidev/url-shortener/server/internal/platform/storage"
)

type Service struct {
	provider platformStorage.Provider
}

func NewService(provider platformStorage.Provider) *Service {
	return &Service{provider: provider}
}

func (s *Service) GetProvider() platformStorage.Provider {
	if s == nil {
		return nil
	}
	return s.provider
}

func (s *Service) GeneratePresignedUploadURL(ctx context.Context, userID uuid.UUID, req PresignedURLRequest) (*PresignedURLResponse, error) {
	if err := req.Validate(); err != nil {
		return nil, apperr.Invalid(err.Error())
	}

	if s.provider == nil {
		return nil, apperr.Internal("storage provider is not configured", nil)
	}

	category := strings.TrimSpace(req.Category)
	if category == "" {
		category = "avatars"
	}

	ext := strings.ToLower(filepath.Ext(req.FileName))
	if ext == "" {
		switch strings.ToLower(req.ContentType) {
		case "image/jpeg", "image/jpg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		case "image/gif":
			ext = ".gif"
		case "image/svg+xml":
			ext = ".svg"
		default:
			ext = ".bin"
		}
	}

	b := make([]byte, 8)
	_, _ = rand.Read(b)
	randomHash := hex.EncodeToString(b)

	// Object key best practice: {category}/{user_id}/{timestamp}-{hash}{ext}
	key := fmt.Sprintf("%s/%s/%d-%s%s", category, userID.String(), time.Now().Unix(), randomHash, ext)
	expiresIn := 15 * time.Minute

	uploadURL, publicURL, err := s.provider.GeneratePresignedUploadURL(ctx, key, req.ContentType, expiresIn)
	if err != nil {
		return nil, apperr.Internal("failed to generate presigned upload URL", err)
	}

	return &PresignedURLResponse{
		UploadURL:   uploadURL,
		FileKey:     key,
		PublicURL:   publicURL,
		ContentType: req.ContentType,
		ExpiresIn:   int64(expiresIn.Seconds()),
	}, nil
}

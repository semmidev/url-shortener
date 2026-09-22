package url_test

import (
	"context"
	"testing"

	"uuid"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/semmidev/url-shortener/server/internal/config"
	"github.com/semmidev/url-shortener/server/internal/platform/apperr"
	"github.com/semmidev/url-shortener/server/internal/platform/permission"
	"github.com/semmidev/url-shortener/server/internal/url"
)

type mockAuthorizer struct {
	allowed map[string]bool
}

func (m *mockAuthorizer) Can(ctx context.Context, userID uuid.UUID, domain string, permissionCode string) (bool, error) {
	return m.allowed[permissionCode], nil
}

func (m *mockAuthorizer) Enforce(ctx context.Context, sub string, dom string, obj string, act string) (bool, error) {
	return true, nil
}

func (m *mockAuthorizer) GetPermissionsForUser(ctx context.Context, userID uuid.UUID, domain string) ([]string, error) {
	var perms []string
	for k, v := range m.allowed {
		if v {
			perms = append(perms, k)
		}
	}
	return perms, nil
}

func (m *mockAuthorizer) SyncPolicies(ctx context.Context) error {
	return nil
}

func (m *mockAuthorizer) AddUserRole(ctx context.Context, userID uuid.UUID, roleName string, domain string) error {
	return nil
}

func TestService_Authorization(t *testing.T) {
	ctx := context.Background()
	userID := uuid.New()

	t.Run("Create denied when UrlsCreate permission is missing", func(t *testing.T) {
		mockAuth := &mockAuthorizer{
			allowed: map[string]bool{
				permission.UrlsCreate: false,
			},
		}
		svc := url.NewService(nil, config.Config{AppBaseURL: "http://localhost:8080"}, nil, mockAuth, nil)

		_, err := svc.Create(ctx, url.CreateURLRequest{
			OriginalURL: "https://example.com",
			UserID:      &userID,
		})

		require.Error(t, err)
		var appErr *apperr.Error
		require.ErrorAs(t, err, &appErr)
		assert.Equal(t, 403, appErr.Status)
		assert.Equal(t, "FORBIDDEN", appErr.Code)
		assert.Contains(t, appErr.Message, "urls.create")
	})

	t.Run("List denied when UrlsRead permission is missing", func(t *testing.T) {
		mockAuth := &mockAuthorizer{
			allowed: map[string]bool{
				permission.UrlsRead: false,
			},
		}
		svc := url.NewService(nil, config.Config{AppBaseURL: "http://localhost:8080"}, nil, mockAuth, nil)

		_, err := svc.List(ctx, url.ListUserShortURLsRequest{
			UserID: userID,
		})

		require.Error(t, err)
		var appErr *apperr.Error
		require.ErrorAs(t, err, &appErr)
		assert.Equal(t, 403, appErr.Status)
		assert.Equal(t, "FORBIDDEN", appErr.Code)
		assert.Contains(t, appErr.Message, "urls.read")
	})

	t.Run("GetByID denied when UrlsRead permission is missing", func(t *testing.T) {
		mockAuth := &mockAuthorizer{
			allowed: map[string]bool{
				permission.UrlsRead: false,
			},
		}
		svc := url.NewService(nil, config.Config{AppBaseURL: "http://localhost:8080"}, nil, mockAuth, nil)

		_, err := svc.GetByID(ctx, url.GetURLByIDRequest{
			ID:     uuid.New(),
			UserID: userID,
		})

		require.Error(t, err)
		var appErr *apperr.Error
		require.ErrorAs(t, err, &appErr)
		assert.Equal(t, 403, appErr.Status)
		assert.Equal(t, "FORBIDDEN", appErr.Code)
		assert.Contains(t, appErr.Message, "urls.read")
	})

	t.Run("Update denied when UrlsUpdate permission is missing", func(t *testing.T) {
		mockAuth := &mockAuthorizer{
			allowed: map[string]bool{
				permission.UrlsUpdate: false,
			},
		}
		svc := url.NewService(nil, config.Config{AppBaseURL: "http://localhost:8080"}, nil, mockAuth, nil)

		origURL := "https://example.com/updated"
		title := "Updated Title"
		_, err := svc.Update(ctx, url.UpdateURLRequest{
			ID:          uuid.New(),
			UserID:      userID,
			OriginalURL: &origURL,
			Title:       &title,
		})

		require.Error(t, err)
		var appErr *apperr.Error
		require.ErrorAs(t, err, &appErr)
		assert.Equal(t, 403, appErr.Status)
		assert.Equal(t, "FORBIDDEN", appErr.Code)
		assert.Contains(t, appErr.Message, "urls.update")
	})

	t.Run("Delete denied when UrlsDelete permission is missing", func(t *testing.T) {
		mockAuth := &mockAuthorizer{
			allowed: map[string]bool{
				permission.UrlsDelete: false,
			},
		}
		svc := url.NewService(nil, config.Config{AppBaseURL: "http://localhost:8080"}, nil, mockAuth, nil)

		_, err := svc.Delete(ctx, url.DeleteURLRequest{
			ID:     uuid.New(),
			UserID: userID,
		})

		require.Error(t, err)
		var appErr *apperr.Error
		require.ErrorAs(t, err, &appErr)
		assert.Equal(t, 403, appErr.Status)
		assert.Equal(t, "FORBIDDEN", appErr.Code)
		assert.Contains(t, appErr.Message, "urls.delete")
	})

	t.Run("Restore denied when UrlsUpdate permission is missing", func(t *testing.T) {
		mockAuth := &mockAuthorizer{
			allowed: map[string]bool{
				permission.UrlsUpdate: false,
			},
		}
		svc := url.NewService(nil, config.Config{AppBaseURL: "http://localhost:8080"}, nil, mockAuth, nil)

		_, err := svc.Restore(ctx, url.RestoreURLRequest{
			ID:     uuid.New(),
			UserID: userID,
		})

		require.Error(t, err)
		var appErr *apperr.Error
		require.ErrorAs(t, err, &appErr)
		assert.Equal(t, 403, appErr.Status)
		assert.Equal(t, "FORBIDDEN", appErr.Code)
		assert.Contains(t, appErr.Message, "urls.update")
	})
}

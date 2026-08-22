package cache_test

import (
	"context"
	"testing"
	"time"

	"github.com/semmidev/url-shortener/server/internal/platform/cache"
	"github.com/stretchr/testify/assert"
)

type UserCacheData struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

func TestGo127RedisCacheGenericMethods(t *testing.T) {
	t.Parallel()

	// Test nil RedisCache receiver safe behavior with Go 1.27 generic method GetTyped[T]
	var nilCache *cache.RedisCache
	ctx := context.Background()

	data, err := nilCache.GetTyped[UserCacheData](ctx, "user:123")
	assert.ErrorIs(t, err, cache.ErrCacheMiss)
	assert.Equal(t, UserCacheData{}, data)

	err = nilCache.SetTyped(ctx, "user:123", UserCacheData{ID: "123", Email: "test@example.com"}, 5*time.Minute)
	assert.NoError(t, err)
}

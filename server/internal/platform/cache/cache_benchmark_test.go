package cache

import (
	"encoding/json"
	"sync"
	"testing"
)

func BenchmarkSyncMapCacheHit(b *testing.B) {
	var m sync.Map

	type CachedData struct {
		OriginalURL string `json:"original_url"`
		IsActive    bool   `json:"is_active"`
	}
	data := CachedData{OriginalURL: "https://example.com/long-url-path", IsActive: true}
	bytes, _ := json.Marshal(data)

	m.Store("url:code:abc1234", bytes)

	for b.Loop() {
		if val, ok := m.Load("url:code:abc1234"); ok {
			var out CachedData
			_ = json.Unmarshal(val.([]byte), &out)
		}
	}
}

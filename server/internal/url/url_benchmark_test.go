package url

import (
	"testing"
)

func BenchmarkBase62Generate(b *testing.B) {
	for b.Loop() {
		_, _ = GenerateRandomCode(7)
	}
}

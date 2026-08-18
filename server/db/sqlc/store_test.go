package db

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestStoreInterface(t *testing.T) {
	var store Store = (*SQLStore)(nil)
	assert.Nil(t, store)
}

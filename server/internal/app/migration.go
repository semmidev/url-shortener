package app

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// RunDBMigration runs database migrations from migrationURL against dbSource with retry mechanism.
func RunDBMigration(migrationURL string, dbSource string) error {
	if migrationURL == "" || dbSource == "" {
		return nil
	}

	var lastErr error
	for i := 0; i < 15; i++ {
		migration, err := migrate.New(migrationURL, dbSource)
		if err != nil {
			lastErr = err
			time.Sleep(1 * time.Second)
			continue
		}

		err = migration.Up()
		srcErr, dbErr := migration.Close()
		if srcErr != nil || dbErr != nil {
			_ = fmt.Sprintf("migration close info: src=%v, db=%v", srcErr, dbErr)
		}

		if err == nil || errors.Is(err, migrate.ErrNoChange) {
			return nil
		}

		lastErr = err
		time.Sleep(1 * time.Second)
	}

	return fmt.Errorf("database migration failed after retries: %w", lastErr)
}

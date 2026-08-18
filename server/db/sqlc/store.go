package db

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/semmidev/url-shortener/server/internal/platform/retry"
)

// Store defines all functions to execute db queries and transactions.
type Store interface {
	Querier
	ExecTx(ctx context.Context, fn func(*Queries) error) error
}

// SQLStore provides all functions to execute SQL queries and transactions against PostgreSQL.
type SQLStore struct {
	*Queries
	connPool *pgxpool.Pool
}

// NewStore creates a new SQLStore.
func NewStore(connPool *pgxpool.Pool) Store {
	return &SQLStore{
		Queries:  New(connPool),
		connPool: connPool,
	}
}

// ExecTx executes a callback function within a database transaction context with transient retry logic.
func (s *SQLStore) ExecTx(ctx context.Context, fn func(*Queries) error) error {
	return retry.Do(ctx, retry.DefaultConfig(), func() error {
		tx, err := s.connPool.BeginTx(ctx, pgx.TxOptions{})
		if err != nil {
			return err
		}

		q := New(tx)
		err = fn(q)
		if err != nil {
			if rbErr := tx.Rollback(ctx); rbErr != nil {
				return fmt.Errorf("tx error: %v, rollback error: %v", err, rbErr)
			}
			return err
		}

		return tx.Commit(ctx)
	})
}

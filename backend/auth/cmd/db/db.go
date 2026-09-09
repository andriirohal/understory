package db

import (
  "context"
  "os"
  "github.com/jackc/pgx/v5/pgxpool"
);

var DB *pgxpool.Pool;

func Connect() error {
  connString := os.Getenv("DATABASE_URL");

  ctx := context.Background();

  pool, err := pgxpool.New(ctx, connString);

  if err != nil {
    return err;
  };

  if err := pool.Ping(ctx); err != nil {
    pool.Close();
    return err;
  };

  DB = pool;

  return nil;
};
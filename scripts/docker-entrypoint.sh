#!/bin/sh
set -e

cd /app

echo "==> Waiting for PostgreSQL..."

MAX_RETRIES=30
RETRY_COUNT=0

until node -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$connect().then(() => { p.\$disconnect(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ "$RETRY_COUNT" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: PostgreSQL not reachable after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "  Waiting for database... (attempt $RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

echo "==> PostgreSQL is ready."

echo "==> Running Prisma migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

if [ "$SEED_DATABASE" = "true" ]; then
  echo "==> Seeding database..."
  node prisma/dist/seed.js || echo "  Seeding skipped or failed (may already be seeded)."
fi

echo "==> Starting application..."
exec "$@"

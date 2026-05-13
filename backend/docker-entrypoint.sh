#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy --schema=./src/prisma/schema.prisma 2>&1 && echo "Migrations complete" || {
  echo "Migrate failed, trying db push..."
  npx prisma db push --schema=./src/prisma/schema.prisma 2>&1
}

echo "Starting app..."
exec node src/index.js

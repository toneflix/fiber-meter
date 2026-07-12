#!/bin/sh
# Container entrypoint for the FiberMeter API.
# Applies migrations, seeds idempotent demo data, then starts the server.
set -e

cd /app/apps/api

echo "[fibermeter-api] applying database migrations..."
npx prisma migrate deploy

echo "[fibermeter-api] seeding demo data (idempotent)..."
# The seed uses upserts, so it is safe to run on every boot. Don't block startup
# if seeding hits a transient issue.
npx tsx prisma/seed.ts || echo "[fibermeter-api] seed skipped/failed (continuing)"

echo "[fibermeter-api] starting server on :${PORT:-4000}..."
exec npx tsx src/server.ts

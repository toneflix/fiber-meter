# FiberMeter API — Express + Prisma.
# On boot it applies migrations and seeds demo data, then serves on :4000.
# Build context is the repo root (pnpm workspace): docker build -f apps/api/Dockerfile .
FROM node:20-slim

# Prisma needs openssl + CA certs on debian-slim.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable
WORKDIR /app

# Copy the whole workspace (node_modules/dist excluded via .dockerignore) and install.
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fibermeter/api prisma:generate

ENV PORT=4000
EXPOSE 4000

CMD ["sh", "apps/api/docker-start.sh"]

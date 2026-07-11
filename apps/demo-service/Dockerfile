# FiberMeter demo service (AI Summary API demo) — Vite SPA, self-contained.
# Build context is the repo root: docker build -f apps/demo-service/Dockerfile .
FROM node:20-slim

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @fibermeter/demo-service build

EXPOSE 5174
CMD ["pnpm", "--filter", "@fibermeter/demo-service", "exec", "vite", "preview", "--host", "0.0.0.0", "--port", "5174"]

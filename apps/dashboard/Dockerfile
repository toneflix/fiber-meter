# FiberMeter dashboard — Vite SPA served with `vite preview`.
# VITE_API_URL is baked at build time; the browser (on the host) calls the
# host-exposed API port, so it points at localhost:4000, not the container name.
# Build context is the repo root: docker build -f apps/dashboard/Dockerfile .
FROM node:20-slim

RUN corepack enable
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @fibermeter/dashboard build

EXPOSE 5173
CMD ["pnpm", "--filter", "@fibermeter/dashboard", "exec", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]

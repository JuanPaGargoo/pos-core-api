# syntax=docker/dockerfile:1

# ───────────────────────── build ─────────────────────────
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable

# Dependencias (capa cacheada mientras no cambien los manifiestos).
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Código fuente y compilación.
COPY . .
RUN pnpm prisma generate
RUN pnpm build

# ──────────────────────── runtime ────────────────────────
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production
WORKDIR /app

# Se conservan todas las dependencias: el contenedor también ejecuta
# `prisma migrate deploy` (CLI) y, puntualmente, el seed (tsx).
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3100
ENTRYPOINT ["./docker-entrypoint.sh"]

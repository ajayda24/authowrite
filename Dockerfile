# syntax=docker/dockerfile:1
# Authowrite production image. See docs/self-hosting.md.

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

# --- Dependencies ----------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build -----------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build && pnpm build:migrate

# --- Runtime ---------------------------------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    STORAGE_LOCAL_DIR=/data/uploads \
    MIGRATIONS_DIR=/app/drizzle

RUN addgroup -S authowrite && adduser -S authowrite -G authowrite \
 && mkdir -p /data/uploads && chown -R authowrite:authowrite /data

COPY --from=builder --chown=authowrite:authowrite /app/.next/standalone ./
COPY --from=builder --chown=authowrite:authowrite /app/.next/static ./.next/static
COPY --from=builder --chown=authowrite:authowrite /app/public ./public
COPY --from=builder --chown=authowrite:authowrite /app/dist/migrate.mjs ./migrate.mjs
COPY --from=builder --chown=authowrite:authowrite /app/drizzle ./drizzle
COPY --chown=authowrite:authowrite docker/entrypoint.sh ./entrypoint.sh

USER authowrite
EXPOSE 3000
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["sh", "./entrypoint.sh"]

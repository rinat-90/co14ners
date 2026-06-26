# Build context: monorepo root

# ── builder stage: install + compile Next.js ──────────────────────────────────
# Debian-based (not Alpine) — Next.js SWC native binaries require glibc
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy manifests first so this layer is cached until deps change
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY packages/api/package.json ./packages/api/package.json
COPY packages/app/package.json ./packages/app/package.json
RUN bun install

# Copy full source (after install so the layer above stays cached)
COPY packages/api ./packages/api
COPY packages/app ./packages/app

ENV NEXT_TELEMETRY_DISABLED=1

# Injected at build time — set NEXT_PUBLIC_API_URL in Railway's build variables
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Generate Prisma client so @prisma/client types (e.g. Role) are available
RUN cd packages/api && bunx prisma generate

RUN cd packages/app && bun run build

# ── runner stage: minimal production image ────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# standalone output mirrors the monorepo directory structure
COPY --from=builder --chown=nextjs:nodejs /app/packages/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/app/.next/static ./packages/app/.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# server.js lives at packages/app/server.js inside the standalone output
CMD ["node", "packages/app/server.js"]

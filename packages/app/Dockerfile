# Build context: monorepo root

# ── deps stage: install dependencies (cached) ─────────────────────────────────
FROM oven/bun:1-alpine AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY packages/api/package.json ./packages/api/package.json
COPY packages/app/package.json ./packages/app/package.json
RUN bun install --frozen-lockfile

# ── builder stage: compile Next.js ────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY packages/api ./packages/api
COPY packages/app ./packages/app
# Recreate workspace symlinks with source present
RUN bun install --frozen-lockfile
ENV NEXT_TELEMETRY_DISABLED=1
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

# server.js is at packages/app/server.js inside the standalone output
CMD ["node", "packages/app/server.js"]

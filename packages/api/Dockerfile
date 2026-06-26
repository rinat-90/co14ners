# Build context: monorepo root
FROM oven/bun:1-alpine
WORKDIR /app

# Copy workspace manifests first (cached layer for installs)
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY packages/api/package.json ./packages/api/package.json

# Install dependencies
RUN bun install

# Copy API source
COPY packages/api ./packages/api

# Generate Prisma client
RUN cd packages/api && bunx prisma generate

EXPOSE 3001
ENV PORT=3001

CMD ["sh", "-c", "cd packages/api && bunx prisma db push --skip-generate --accept-data-loss && cd /app && bun run packages/api/src/index.ts"]

# Build context: monorepo root
FROM oven/bun:1
WORKDIR /app

# Copy workspace manifests first (cached layer for installs)
COPY package.json bun.lock ./
COPY tsconfig.json ./
COPY packages/api/package.json ./packages/api/package.json

# Install dependencies
RUN bun install --ignore-scripts

# Copy API source
COPY packages/api ./packages/api

# Generate Prisma client
RUN cd packages/api && node -e "const p=require.resolve('prisma/build/index.js');require('child_process').execSync('node '+p+' generate',{stdio:'inherit'})"

EXPOSE 3001
ENV PORT=3001

CMD ["bun", "run", "packages/api/src/index.ts"]

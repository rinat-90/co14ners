# co14ners

A full-stack monorepo for tracking Colorado 14er summit logs. Built with **Bun workspaces**, **TypeScript**, **Next.js**, **Express**, **tRPC**, and **Prisma**.

---

## Packages

| Package | Description | Port |
|---|---|---|
| [`packages/api`](./packages/api) | Express + tRPC + Prisma REST/RPC API | `3001` |
| [`packages/app`](./packages/app) | Next.js 15 App Router frontend (MUI) | `3000` |

---

## Prerequisites

- [Bun](https://bun.sh) `>= 1.2`
- [Docker](https://www.docker.com) (for the local database)

---

## Getting started

### 1. Install dependencies

```bash
bun install
```

### 2. Start the database

```bash
docker compose up db -d
```

### 3. Configure environment

```bash
cp packages/api/.env.example packages/api/.env
# Edit packages/api/.env — set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET
openssl rand -base64 64   # run twice to generate two secrets
```

### 4. Push the schema and generate the Prisma client

```bash
cd packages/api
bunx prisma db push
bunx prisma generate
cd ../..
```

### 5. Run both services

```bash
# Two terminals:
bun run dev:api   # http://localhost:3001
bun run dev:app   # http://localhost:3000
```

---

## Docker (full stack)

Builds and starts all three services (db, api, app):

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| API | http://localhost:3001 |
| Postgres | `localhost:5432` |

---

## Scripts (root)

| Command | Description |
|---|---|
| `bun run dev:api` | Start API in watch mode |
| `bun run dev:app` | Start Next.js dev server |
| `bun run test` | Run API unit tests |
| `bun run lint` | Lint both packages |
| `bun run lint:fix` | Auto-fix lint issues |
| `bun run format` | Format all source files with Prettier |
| `bun run format:check` | Check formatting (CI) |

---

## Tech stack

**API** — Express · tRPC v11 · Prisma 6 · PostgreSQL · bcryptjs · JWT · Nodemailer
**App** — Next.js 15 · React 19 · MUI v7 · tRPC React Query · Tanstack Query v5
**Tooling** — Bun · TypeScript 5 · ESLint 9 · Prettier 3 · Docker

---

## Deployment (Railway)

Each package has its own `Dockerfile` built from the monorepo root context.

1. Create two Railway services pointing to this repo
2. **API service** — Dockerfile path: `packages/api/Dockerfile`
   - Set env vars: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `APP_URL`
   - Release command: `cd packages/api && bunx prisma migrate deploy`
3. **App service** — Dockerfile path: `packages/app/Dockerfile`
   - Set build variable: `NEXT_PUBLIC_API_URL=https://your-api.up.railway.app`

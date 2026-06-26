# @co14ners/api

Express + tRPC + Prisma API for the co14ners platform.

## Stack

- **Runtime** — Bun
- **Framework** — Express 4
- **API layer** — tRPC v11 (HTTP batch link)
- **ORM** — Prisma 6 (PostgreSQL)
- **Auth** — JWT (access + refresh tokens), bcryptjs
- **Email** — Nodemailer (SMTP or console log in dev)

---

## Structure

```
src/
├── auth/
│   ├── auth.router.ts     # tRPC procedures
│   ├── auth.service.ts    # Business logic
│   └── auth.schema.ts     # Zod input validators
├── lib/
│   ├── prisma.ts          # Singleton PrismaClient
│   ├── jwt.ts             # sign / verify access & refresh tokens
│   └── email.ts           # Password reset email helper
├── index.ts               # Express server entry
├── router.ts              # Root tRPC router
└── trpc.ts                # tRPC init, context, procedure types
prisma/
└── schema.prisma          # Database schema
```

---

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing 15-min access tokens |
| `JWT_REFRESH_SECRET` | Secret for signing 7-day refresh tokens |
| `CORS_ORIGIN` | Allowed frontend origin (e.g. `http://localhost:3000`) |
| `APP_URL` | Frontend URL used in password-reset emails |
| `SMTP_HOST` | *(optional)* SMTP host — if unset, links are logged to console |
| `SMTP_PORT` | SMTP port (default `587`) |
| `SMTP_SECURE` | `true` for port 465 TLS |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address for outbound emails |

Generate secrets:
```bash
openssl rand -base64 64   # run twice
```

---

## Scripts

```bash
bun run dev          # Watch mode (restarts on file change)
bun run start        # Production start
bun run test         # Run unit tests with Bun test runner
bun run test:watch   # Watch mode tests
bun run lint         # ESLint
bun run lint:fix     # ESLint auto-fix
bun run db:generate  # prisma generate
bun run db:push      # prisma db push (dev)
bun run db:studio    # Prisma Studio (run from this directory)
```

---

## tRPC procedures

All procedures are under the `/trpc` endpoint.

### `auth.*`

| Procedure | Type | Auth | Description |
|---|---|---|---|
| `auth.register` | mutation | public | Create account, returns token pair |
| `auth.login` | mutation | public | Sign in, returns token pair |
| `auth.logout` | mutation | public | Invalidate refresh token |
| `auth.refresh` | mutation | public | Rotate refresh token, returns new pair |
| `auth.forgotPassword` | mutation | public | Send password-reset email |
| `auth.resetPassword` | mutation | public | Set new password via reset token |
| `auth.me` | query | 🔒 protected | Return current user's profile |

---

## Auth flow

```
Register / Login  →  { accessToken, refreshToken }
                         │                │
                    15-min JWT       7-day JWT (stored in DB)
                         │
              Authorization: Bearer <accessToken>
                         │
              protectedProcedure checks token
```

Refresh tokens are **rotated** on each use and **invalidated** on password reset.

---

## Database schema

Models: `User` · `RefreshToken` · `Mountain` · `Trail` · `Review` · `Favorite` · `Completion`

See [`prisma/schema.prisma`](./prisma/schema.prisma) for full field definitions.

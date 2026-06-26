# @co14ners/app

Next.js 15 frontend for the co14ners platform.

## Stack

- **Framework** — Next.js 15 (App Router)
- **UI library** — MUI v7 (Material UI)
- **Data fetching** — tRPC React Query + Tanstack Query v5
- **Auth** — JWT tokens stored in `localStorage`, auto-attached to every tRPC request
- **Runtime** — Bun

---

## Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── layout.tsx           # Centered auth card layout
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   ├── layout.tsx               # Root layout (AppRouterCacheProvider)
│   └── page.tsx                 # Protected home page
├── components/
│   └── auth/
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       ├── ForgotPasswordForm.tsx
│       └── ResetPasswordForm.tsx
└── lib/
    ├── auth-context.tsx         # Auth state + useAuth hook
    ├── providers.tsx            # ThemeProvider + tRPC + QueryClient + AuthProvider
    ├── theme.ts                 # MUI theme (blue sky + alpine green)
    └── trpc.ts                  # createTRPCReact<AppRouter>
```

---

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | API base URL (baked in at build time) | `http://localhost:3001` |

> `NEXT_PUBLIC_*` vars must be available **at build time**. Pass them as Docker build args or Railway build variables.

---

## Scripts

```bash
bun run dev          # Next.js dev server (http://localhost:3000)
bun run build        # Production build
bun run start        # Start production server
bun run lint         # ESLint
bun run lint:fix     # ESLint auto-fix
```

---

## Auth pages

| Route | Description |
|---|---|
| `/login` | Sign in with email + password |
| `/register` | Create a new account |
| `/forgot-password` | Request a password-reset email |
| `/reset-password?token=…` | Set a new password via reset link |

After a successful login or register, tokens are stored in `localStorage` and the user is redirected to `/`.

The tRPC client automatically reads `localStorage.accessToken` and sends it as `Authorization: Bearer …` on every request.

---

## MUI setup

`AppRouterCacheProvider` (from `@mui/material-nextjs/v15-appRouter`) is placed in the root layout to prevent emotion style conflicts during SSR. The theme is defined in `src/lib/theme.ts`.

# TrackSentinel — Engineering Guide

## Rules
1. Read this file before working.
2. Never hardcode secrets — use environment variables only.
3. Never commit .env files.
4. Run TypeScript type checking and lint before declaring a feature complete.
5. Inspect existing code before editing any file.
6. Never rewrite unrelated modules.
7. Do not introduce dependencies without a clear reason.
8. Preserve all comments and docstrings in existing code.
9. Use pnpm (not npm or yarn).
10. All API routes must validate authentication and workspace membership server-side.

## Project Structure
- `apps/web` — Next.js 15 application (App Router, TypeScript, Tailwind, shadcn/ui)
- `packages/worker` — Playwright monitoring worker (Node.js, TypeScript, pg-boss)
- `supabase/` — Database migrations managed via Supabase CLI

## Stack
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes (`/api/v1/`)
- **Database**: Supabase Cloud PostgreSQL
- **Auth**: Supabase Auth
- **Job queue**: pg-boss (PostgreSQL-backed, inside worker)
- **Browser automation**: Playwright
- **Notifications**: Telegram Bot API + Resend (email)
- **Error tracking**: Sentry

## Environment Variables
See `.env.example` for all required variables.
Variables prefixed with `NEXT_PUBLIC_` are safe for the browser.
Never add `NEXT_PUBLIC_` to server-only secrets.

## Database Migrations
- Stored in `supabase/migrations/`
- Never write destructive migrations without explicit approval.
- Run via: `supabase db push` (dev) or via CI (prod)

## Security Non-Negotiables
- All customer URLs must pass SSRF validation before Playwright navigates to them.
- Never execute Playwright inside an HTTP request handler — enqueue jobs only.
- Workspace_id from the frontend is never trusted without server-side membership verification.
- PostgreSQL is never exposed publicly.

## Testing Requirements
Before marking any feature done:
- `pnpm typecheck`
- `pnpm lint`
- Run relevant tests

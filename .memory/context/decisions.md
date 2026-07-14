---
name: decisions
type: context
last_updated: 2026-04-15
updated_by: codex-gpt-5
staleness_days: 14
---

# Technical Decisions

## Next.js App Router (not Pages Router)

Chosen for layouts, route groups, server/client component split, and co-located API routes. Route groups `(auth)` and `(dashboard)` separate public and protected UX without changing URLs.

## MongoDB + Mongoose (not SQL)

Health logs are semi-structured and evolve often. `DailyLog` keeps meals, workouts, water entries, sleep, todo completions, and synced metrics in one document per user-day, which fits Mongo better than join-heavy SQL tables.

## Daily-Centric Mongo Modeling

`DailyLog` remains the central fact table for user-day activity and keeps the compound unique index on `{userId, date}`. The app has grown beyond two models, though: `User`, `DailyLog`, `DailyPlan`, and cached `Food` documents are all first-class. The decision is still to keep day activity denormalized while allowing specialized supporting models where they reduce repeated AI work or external API fetches.

## NextAuth.js with Credentials Provider

No OAuth for now - users register with email/password. JWT strategy (not database sessions) for stateless auth. 30-day token expiry. `NEXTAUTH_SECRET` fallback exists in `lib/auth.ts` for dev.

## Auth Enforcement Split Between Layout And API Helpers

The repo currently protects the dashboard in `components/layout/DashboardLayoutClient.tsx` using `useSession()` and onboarding checks, while API routes use `lib/session.ts` helpers (`getAuthUserId`, `getAuthUserIdWithBypass`). This keeps route handlers simple and supports cron bypass headers, but it also means there is no single root `middleware.ts` gate today.

## User-Provided API Keys (Encrypted)

Rather than requiring only server-owned integrations, users can provide their own OpenAI and USDA FoodData Central keys. Keys are AES-256-GCM encrypted before storage. Server fallbacks still exist to reduce setup friction.

## Response Masking Pattern

Every API route passes user data through `maskUser()` from `lib/apiMask.ts` before returning it. This centralized pattern ensures sensitive fields (`password`, `apiKeys`, internal IDs, encrypted mail passwords) are never returned to the client.

## Tailwind + Custom `globals.css` (not a Component Library)

No Radix/Chakra/shadcn stack. Layout and feel come from Tailwind plus a large handwritten CSS layer in `app/globals.css`, including safe-area logic, hidden scrollbars, dashboard grid primitives, and animation helpers.

## OpenAI Responses API With `gpt-4o-mini`

Chosen for cost efficiency and structured tool/output handling. The AI features mostly use direct calls to the OpenAI Responses API with `gpt-4o-mini`, especially in orchestrator-style flows. This keeps AI endpoints uniform and makes intent routing easier to inspect in debug logs.

## Cache-First Food Search

Food search first queries the local `Food` collection and only falls back to USDA FoodData Central when local coverage is thin. Imported foods are normalized and cached back into Mongo so later searches are cheaper and faster.

## Env-Driven Local Port

The active implementation uses `PORT` from the environment for local dev. Some docs still mention 30000 from older project state, so agents should trust `.env.example`, local env, and `package.json` over older prose.

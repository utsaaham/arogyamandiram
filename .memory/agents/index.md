# Agents

> Agent folders are named after human first names. Each agent's role lives inside their `persona.md`.
> See `skills/agent-naming.md` for the naming rule.

## Team Roster

| Agent | Role | Domain | Technologies | Folder |
|-------|------|--------|-------------|--------|
| Priya | Next.js Fullstack Engineer | API routes, DB models, auth, AI/data flows | Next.js API routes, Mongoose, NextAuth, encryption, OpenAI | `agents/priya/` |
| Mateo | UI Frontend Engineer | Pages, components, styling, interactions | Tailwind CSS, Framer Motion, Recharts, Lucide | `agents/mateo/` |
| Kevin | DevOps Engineer | Deployment, env config, build, cron/runtime wiring | Vercel, MongoDB Atlas, next.config.js, local cron | `agents/kevin/` |

## What Each Agent Owns

### Priya (Next.js Fullstack)
- `app/api/` - all API route handlers
- `models/` - `User.ts`, `DailyLog.ts`, `DailyPlan.ts`, `Food.ts`
- `lib/auth.ts`, `lib/session.ts`, `lib/db.ts`, `lib/encryption.ts`, `lib/apiMask.ts`
- `lib/openaiKey.ts`, `lib/aiHealthPlan.ts`, `lib/mealIdeasService.ts`, `lib/healthDataSync.ts`
- `lib/health.ts`, `lib/gamification.ts`, `lib/calorieBurn.ts`

### Mateo (UI Frontend)
- `app/(dashboard)/` and `app/(auth)/`
- `components/` - including orchestrator views and browser telemetry initialization
- `app/globals.css`, `tailwind.config.ts`
- `hooks/`, `contexts/`
- `lib/apiClient.ts`

### Kevin (DevOps)
- `vercel.json`, `next.config.js`, `.env.local`
- `package.json`, `instrumentation.ts`, `instrumentation-node.ts`
- `scripts/local-cron.mjs`

## Actions

- **Add an agent?** Only if a new distinct technology domain appears. Use a human first name for the folder.
- **Task spans two agents?** Priya handles data/contracts; Mateo handles display and interaction. Coordinate at the API contract boundary.
- **Task spans product runtime concerns?** Kevin owns env consistency, Vercel cron wiring, and local-dev runtime assumptions.

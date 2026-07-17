---
name: progress
type: context
last_updated: 2026-04-30
updated_by: codex-5.3
staleness_days: 3
---

# Progress

## Done (Stable Features)

- [x] User authentication (NextAuth.js, JWT, bcrypt)
- [x] 4-step onboarding wizard with auto-calculated health targets
- [x] Food logger - cache-first Mongo food search, USDA fallback import, custom food entry
- [x] AI food logger (natural language parsing via GPT-4o-mini)
- [x] Meal ideas AI modal (`lib/mealIdeasService.ts`)
- [x] Water tracker with animated glass visualization
- [x] Weight journal with trend charts (7D–1Y range)
- [x] Workout planner/tracker - exercise library, calorie burn, edit flow
- [x] AI workout logger and AI workout plan modal
- [x] Sleep tracker (bedtime, wake time, quality rating)
- [x] AI insights (period-based: yesterday, week, month, year)
- [x] Health plan AI generation (`lib/aiHealthPlan.ts`)
- [x] AI recommendations (`app/api/ai/recommendations/`)
- [x] AI orchestrator route (`app/api/ai/orchestrator/`) with text/image-assisted intent classification
- [x] AI daily plan generation (`app/api/ai/daily-plan/`, `models/DailyPlan.ts`)
- [x] Nightly and interval cron jobs - generate daily plans, send reminders, process email replies, sync health data
- [x] Email reminders system - SMTP/IMAP (`lib/email/`), templates, scheduling
- [x] Fitness level auto-detection (`lib/deriveFitnessLevel.ts`)
- [x] Gamification: streaks, badges, XP (`lib/xp.ts`), leveling (`lib/level.ts`)
- [x] Achievements page (badge grid, streak overview, progress)
- [x] Settings: profile edit, API key management, todos, email, health-data sync, customizations
- [x] User preferences (units, notifications, email scheduling)
- [x] Timezone-aware reminder scheduling with profile timezone persistence and configurable water reminder window/frequency
- [x] Dashboard tour (interactive, version-controlled)
- [x] Debug logging panel and typed AI log viewers
- [x] AES-256-GCM encryption for user API keys
- [x] Server-side response masking (no sensitive data leaked)
- [x] Mobile-responsive layout (bottom nav + sidebar)
- [x] Vercel deployment configuration
- [x] Today's Plan UX improvements - per-tab generation, quick add planned workout exercises with custom reps/time, and Request Inspector logs for today's plan generation
- [x] Settings profile sync + body UX refresh - latest weight sync, derived activity level, plain-language body guidance
- [x] Health data sync provenance + automation - sync source (`manual` vs `auto`) and cron-based interval sync
- [x] Water customizations flow - Settings edits the 4 water quick-add button amounts and the Water tracker uses those values directly
- [x] Daily todo templates and completions (`app/api/todos*`, settings tab, `DailyLog.todoCompletions`)
- [x] Daily-plan codebase hardening and de-duplication - centralized OpenAI JSON client (`lib/openaiJson.ts`), shared prompt/normalization helpers (`app/api/ai/daily-plan/shared.ts`), dead field/function removal, and lighter API route implementations

## In Progress

- [ ] Wire AI daily plan to dashboard UI more completely
- [ ] End-to-end email reminder delivery testing
- [ ] Reconcile stale top-level docs (`README.md`) with the implementation

## Known Gaps

- No formal test suite (no Jest/Vitest/Cypress)
- Debug mode is manual (env var toggle)
- Landing page (`app/page.tsx`) is minimal - not a polished marketing page
- `lib/seedFoodsData.ts` exists but is empty
- A few older routes/docs still mention Edamam even though the active food fallback path is USDA FoodData Central
- Dashboard auth gating is client-layout based today; if SSR protection becomes important, this should be revisited

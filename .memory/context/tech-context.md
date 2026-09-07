---
name: tech-context
type: context
last_updated: 2026-09-07
updated_by: codex
staleness_days: 7
---

# Tech Context

## Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.5.x |
| Language | TypeScript | 5.7 (strict mode) |
| Database | MongoDB Atlas + Mongoose | 8 |
| Auth | NextAuth.js | 4 (JWT, Credentials provider) |
| Styling | Tailwind CSS + `globals.css` | 3.4 |
| Charts | Recharts | 2.15 |
| Animation | Framer Motion + CSS keyframes | 11.15 |
| Icons | Lucide React | 0.468 |
| AI | OpenAI Responses API + `gpt-4o-mini` | via route handlers / fetch |
| Food Search | Mongo `Food` cache + USDA FoodData Central fallback | current implementation |
| Encryption | Node.js crypto (AES-256-GCM) | built-in |
| Password | bcryptjs | 2.4.3 (12 rounds) |
| Validation | Zod | 3.24 |
| Dates | date-fns | 4.1 |
| Deployment | Vercel | nextjs framework |
| Observability | Pydantic Logfire + OpenTelemetry | Node and browser SDKs |

## Directory Map

```text
app/
  (auth)/           # login, register, onboarding - public routes
  (dashboard)/      # protected pages + layout with sidebar/mobile nav
    dashboard, food, water, weight, workout, sleep, ai, ai-insights,
    achievements, settings, api-keys, preferences, targets, more, project,
    health-data, todos
  api/
    ai/             # daily-plan, food-logger, health-plan, insights-eligibility,
                    # meal-ideas, orchestrator, recommendations, workout-logger
    auth/           # next-auth + registration
    cron/           # generate-daily-plans, send-reminders, process-email-replies, sync-health-data
    email/          # send-reminder, process-replies, verify-imap
    user/           # profile, onboarding, API keys, email settings, targets
    daily-log/      # core meals/log APIs + recent foods
    foods/          # local cache + USDA fallback food search
    workouts/       # workout CRUD + exercise helpers
    water, weight, sleep, todos, achievements, health-data, health-metrics, logfire
  globals.css       # dark theme, glassmorphism, animations, layout utilities
  layout.tsx        # root layout with fonts
  page.tsx          # landing page

components/
  layout/           # Sidebar, MobileNav, DashboardLayoutClient, shells, AI sidebars
  ui/               # ProgressRing, MacroBar, MetricChart, StatCard, Toast, Skeleton, etc.
  food/             # AddMealModal, FoodResultCard, RecentFoodCard
  water/            # WaterGlass
  workout/          # EditWorkoutModal
  achievements/     # BadgeCard, BadgeGrid, StreakCard, StreakBar, BadgeIcon, etc.
  orchestrator/     # chat/history/confirmation UI for AI command routing
  tour/             # DashboardTour

lib/
  auth.ts           # NextAuth config
  session.ts        # API auth + cron bypass helpers
  db.ts             # MongoDB connection
  encryption.ts     # AES-256-GCM encrypt/decrypt
  apiClient.ts      # frontend fetch wrapper
  apiMask.ts        # server-side response masking
  openaiKey.ts      # user key -> fallback key resolution
  health.ts         # BMR, TDEE, macro, water, sleep target calculations
  gamification.ts   # streaks, achievements, XP orchestration
  badgeDefinitions.ts
  xp.ts
  level.ts
  calorieBurn.ts
  deriveFitnessLevel.ts
  deriveActivityLevel.ts
  latestWeight.ts
  aiHealthPlan.ts
  mealIdeasService.ts
  healthDataSync.ts
  utils.ts
  constants.ts
  email/
    smtp.ts
    imap.ts
    templates.ts

models/
  User.ts
  DailyLog.ts
  DailyPlan.ts
  Food.ts

contexts/
  DebugLogsContext.tsx
  OrchestratorSidebarContext.tsx

hooks/
  useDailyLog.ts
  useUser.ts
  useAchievements.ts

types/
  index.ts
```

## Environment Variables

### Required

```text
MONGODB_URI             # MongoDB Atlas connection string
MONGO_DB                # explicit database name
NEXTAUTH_SECRET         # 32+ char random string
ENCRYPTION_KEY          # 32-byte hex (for AES-256)
NEXTAUTH_URL            # app URL; should match local PORT or deployed URL
CRON_SECRET             # required for /api/cron/* auth and internal cron fan-out
```

### Optional

```text
OPENAI_API_KEY          # server-wide AI fallback
FDC_API_KEY             # USDA FoodData Central fallback key
FOOD_CACHE_TTL_DAYS     # cache freshness window for imported foods
PORT                    # local dev server port; .env.example defaults to 30000
LOGFIRE_TOKEN                        # server-only Logfire write token
LOGFIRE_ENVIRONMENT                  # deployment label (development/preview/production)
NEXT_PUBLIC_LOGFIRE_BROWSER_ENABLED  # true = browser traces, errors, and Web Vitals
NEXT_PUBLIC_DASHBOARD_TOUR_VERSION
SMTP_HOST / SMTP_PORT
IMAP_HOST / IMAP_PORT
```

## Dev Port

Port is **environment-driven**. `.env.example`, the local cron runner, and the development `NEXTAUTH_URL` fallback all default to **30000**, so local env values should be kept consistent.

## How to Run

```bash
npm install
npm run dev
```

`npm run dev` starts both Next dev and the local cron simulator.

## Key Architectural Patterns

- **Server Components** for page shells; **Client Components** for interactive UI
- **API routes** are the only backend - no separate app server
- **Response masking** (`lib/apiMask.ts`): mask before returning user-shaped data
- **Request sanitization** (`lib/apiClient.ts`): frontend strips blocked fields before sending
- **Session helpers instead of middleware-first auth**: API routes use `lib/session.ts`; dashboard redirects happen in `DashboardLayoutClient`
- **User-provided API keys**: OpenAI and USDA FDC keys can be user-owned and are stored encrypted
- **Cron fan-out pattern**: cron routes authenticate with `x-cron-secret`, then may call internal routes with `x-internal-user-id`
- **Food cache-first search**: search Mongo first, then hydrate from USDA and persist
- **OpenAI Responses API**: AI routes frequently use direct `fetch('https://api.openai.com/v1/responses')`
- **Centralized observability**: `instrumentation.ts` configures Pydantic Logfire for server requests, dependencies, and uncaught errors; browser telemetry uses `/api/logfire/v1/traces` so the write token never reaches the client
- **Telemetry privacy boundary**: do not attach prompts, health payloads, credentials, raw emails, cookies, or authorization headers to Logfire spans

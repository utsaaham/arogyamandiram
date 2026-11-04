# ఆరోగ్యమందిరం ( Arogyamandiram ) 

A practical health companion for daily tracking.

Arogyamandiram is a full-stack health tracking app built with Next.js 15. You log your food, water, weight, workouts and sleep, and the app does the math on calories, macros and streaks. Add an OpenAI key and it will also write meal ideas, workout plans and a daily plan for you.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8) ![License](https://img.shields.io/badge/License-MIT-yellow)

There is also a native iOS app, [ArogyaM-iOS-v1](https://github.com/utsaaham/ArogyaM-iOS-v1), which talks to this same backend. More on it [below](#mobile-app-ios).

---

## What you can do with it

### Track your day

- The dashboard has calorie and macro progress rings, a daily summary, and quick actions for whatever you log most.
- The food logger ships with 150+ built-in foods. Search is fuzzy, there are category filters, and anything missing can be added as a custom food or pulled from USDA FoodData Central. The meal type (breakfast, lunch, dinner, snack) is guessed from the time of day.
- The water tracker is an animated glass with quick-add buttons for common amounts.
- The weight journal has a trend chart with period selectors from 7 days up to a year, a BMI calculator, and a history table with change indicators.
- The workout planner has 50+ preset exercises with automatic calorie estimates. Strength workouts also track sets, reps and weight.
- Sleep, vitals and todos each get their own page. "Today's plan" pulls everything planned for the day into a single view.

### Keep yourself honest

Logging consistently builds streaks. Streaks and milestones earn badges and XP, and your latest badge shows up on the dashboard. There's a dedicated achievements page with streak overview cards.

### Let the AI help

- Insights: yesterday, weekly, monthly and yearly summaries of what you logged. Privacy comes first here: the app never sends your name or email to the model, only anonymized numbers.
- Ciel: a daily guide that plans your meals and workouts around your diet type (veg, non-veg, eggetarian, vegan, pescatarian, flexitarian), your favorite cuisines, allergies, and how long you're willing to cook. Every generated dish comes with ingredients, timings and steps.
- Coach: an AI coach that remembers past conversations, writes weekly summaries and tracks health scores over time.

AI needs an OpenAI key. You can set one server-wide, or each user can add their own in Settings (stored AES-256 encrypted).

### Get nudged by email

The app can send reminder emails over SMTP, and you can reply to them to log data. Replies are read over IMAP by a cron job. Users bring their own email and app password.

### Set it up your way

A 4-step onboarding wizard collects height, weight, activity level and goal. Settings covers daily targets, metric or imperial units, notification preferences, and the food and cooking preferences Ciel uses.

---

## Security

- All API responses pass through a server-side mask (`lib/apiMask.ts`), so sensitive fields never reach the browser's network tab.
- User API keys are encrypted with AES-256-GCM before they touch the database.
- Passwords are hashed with bcrypt (12 rounds).
- Sessions are JWTs via NextAuth.js with a 30-day expiry.
- The dashboard layout and the API routes both check the session.
- The frontend API client strips blocked fields before sending anything.
- There is a proper forgot/reset password flow.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack in dev) |
| Language | TypeScript 5.7, strict mode |
| Styling | Tailwind CSS 3.4 |
| Database | MongoDB with Mongoose 8 |
| Auth | NextAuth.js 4 (JWT) |
| Charts | Recharts 2.15 |
| Icons | Lucide React |
| AI | OpenAI SDK, models set via env |
| Email | Nodemailer (SMTP) and ImapFlow (IMAP) |
| Validation | Zod |
| Animation | Framer Motion and CSS |
| Encryption | Node.js crypto, AES-256-GCM |

---

## Getting started

You'll need:

- Node.js 20.19+ (or 22.13+)
- A MongoDB Atlas account (the free tier is fine)
- Optionally an OpenAI API key for the AI pages
- Optionally a USDA FoodData Central key for wider food search

| Variable | Required? | Where to get it | Notes |
|----------|-----------|-----------------|-------|
| `MONGODB_URI` | Yes | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), create a free cluster and copy the connection string | Use the same cluster for local and Vercel if you want shared data. |
| `NEXTAUTH_SECRET` | Yes | `openssl rand -base64 32` | Keep it stable per environment. |
| `ENCRYPTION_KEY` | Yes | `openssl rand -hex 32` | If local and Vercel share a database, this must be the same value in both places. Changing it makes stored API keys unreadable until users re-enter them. |
| `NEXTAUTH_URL` | Yes | `http://localhost:30000` for local dev | Your Vercel URL in production. |
| `CRON_SECRET` | For cron | Any random string | Authenticates calls to `/api/cron/*`. |
| `OPENAI_API_KEY` | Optional | [OpenAI](https://platform.openai.com/api-keys) | Server-wide fallback. Users can also bring their own key in Settings. |
| `LOGFIRE_TOKEN` | Optional | [Pydantic Logfire](https://logfire.pydantic.dev/) | Server-only write token for request, database, outbound HTTP, error, and browser telemetry. |
| `FDC_API_KEY` | Optional | [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide/) | Fallback for food lookups beyond the built-in catalog. |

### Install

```bash
git clone https://github.com/utsaaham/arogyamandiram.git
cd arogyamandiram
npm install
cp .env.example .env.local
```

Then edit `.env.local`:

```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/arogyamandiram
MONGO_DB=arogyamandiram
NEXTAUTH_URL=http://localhost:30000
NEXTAUTH_SECRET=your-secret-key-min-32-characters-long
ENCRYPTION_KEY=your-32-byte-hex-string-for-aes256
CRON_SECRET=any-random-string

# Optional, server defaults for AI and food search
OPENAI_API_KEY=sk-...
FDC_API_KEY=your-usda-fooddata-central-api-key

# Optional, Pydantic Logfire observability
LOGFIRE_TOKEN=your-logfire-write-token
LOGFIRE_ENVIRONMENT=development
NEXT_PUBLIC_LOGFIRE_BROWSER_ENABLED=true

# Optional, email reminders (Gmail defaults)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
IMAP_HOST=imap.gmail.com
IMAP_PORT=993

# Required for signup email verification and logged-out password recovery
AUTH_SMTP_HOST=smtp.gmail.com
AUTH_SMTP_PORT=587
AUTH_SMTP_SECURE=false
AUTH_SMTP_USER=security@example.com
AUTH_SMTP_PASS=your-smtp-app-password
AUTH_EMAIL_FROM="Arogyamandiram Security <security@example.com>"
```

New accounts and guest-account upgrades must confirm a six-digit email code before an email can be attached. Codes expire after 10 minutes, verification proofs expire after 15 minutes, and repeated sends or guesses are rate-limited.

### Run it

```bash
npm run dev
```

This starts Next.js and a local cron runner together, with their logs interleaved. Open [http://localhost:30000](http://localhost:30000). The port can be changed with `PORT` in `.env.local`.

For a production build:

```bash
npm run build
npm start
```

### Deploy to Vercel

The repo has a `vercel.json`, so you can deploy straight from GitHub. Two cron jobs come pre-configured: guest account cleanup runs daily at 03:00 and daily plan generation runs at 23:55. Set the same env vars in your Vercel project, and keep `ENCRYPTION_KEY` identical to local if the two share a database.

---

## Mobile app (iOS)

The native iOS app lives in its own repo: [utsaaham/ArogyaM-iOS-v1](https://github.com/utsaaham/ArogyaM-iOS-v1).

It's built with SwiftUI and mirrors the web app's tabs and structure, so both feel like one product. It logs in with the same credentials and calls the same `/api/*` routes, either against your deployed URL or a locally running copy of this app. That repo's README covers Xcode setup, connecting to a backend, and running on a simulator or a real iPhone.

---

## Project structure

```
arogyamandiram/
├── app/
│   ├── (auth)/                   # login, register, onboarding,
│   │                             # forgot-password, reset-password
│   ├── (dashboard)/
│   │   ├── layout.tsx            # sidebar + mobile nav wrapper
│   │   ├── home/                 # main dashboard
│   │   ├── food/                 # food logger
│   │   ├── water/                # water tracker
│   │   ├── weight/               # weight journal
│   │   ├── workout/              # workout planner
│   │   ├── sleep/                # sleep tracker
│   │   ├── vitals/               # vitals
│   │   ├── todos/                # todos and checklists
│   │   ├── todays-plan/          # the day's plan in one view
│   │   ├── coach/                # AI coach
│   │   ├── ai/                   # insights
│   │   ├── achievements/         # streaks and badges
│   │   └── settings/
│   ├── api/
│   │   ├── auth/                 # NextAuth, register, mobile login, password reset
│   │   ├── user/                 # profile, API keys, onboarding
│   │   ├── foods/                # food search + USDA fallback
│   │   ├── daily-log/            # daily log and meals
│   │   ├── water/ weight/ workouts/ sleep/ todos/
│   │   ├── achievements/ scores/ health-snapshots/
│   │   ├── coach/ intelligence/
│   │   ├── email/                # reminder setup
│   │   ├── cron/                 # reminders, daily plans, email replies, cleanup
│   │   └── ai/                   # daily plan, meal ideas, loggers, orchestrator
│   ├── globals.css               # dark theme + glassmorphism
│   ├── layout.tsx
│   └── page.tsx                  # landing page
├── components/                   # ui, food, water, workout, layout,
│                                 # achievements, landing, tour, orchestrator
├── contexts/                     # user and orchestrator sidebar state
├── hooks/                        # useUser, useDailyLog, useAchievements, usePlanAutoRefresh
├── lib/                          # apiClient, apiMask, auth, db, encryption,
│                                 # health, gamification, xp, level, adherence,
│                                 # email/, intelligence/, scores/, ...
├── models/                       # User, DailyLog, DailyPlan, Food,
│                                 # CoachMemory, HealthSnapshot, WeeklySummary
├── scripts/                      # dev.mjs, local-cron.mjs, logger.mjs
├── instrumentation.ts            # Pydantic Logfire server instrumentation
├── types/
└── public/                       # icons, badges, manifest.json (PWA)
```

---

## Design

Dark theme with glassmorphism and a noise texture overlay. Violet is the primary color, with emerald for success, amber for warnings, rose for danger and cyan for water. Type is DM Sans for body text, Satoshi as the heading fallback, and JetBrains Mono for code.

On desktop you get a collapsible sidebar; on mobile, bottom tabs and stacked layouts. Modals open centered on desktop and as bottom sheets on mobile. There's a PWA manifest too.

---

## Food catalog

150+ built-in foods with per-serving nutrition data: calories, protein, carbs, fat, fiber, serving size, and veg/vegan flags. The catalog spans mains, legumes, breads, rice dishes, snacks, sweets, drinks, fruits and seafood.

---

## AI coding tools and the .memory folder

This project uses [Gnanam](https://github.com/utsaaham/gnanam), a portable memory system for AI coding agents. The `.memory/` folder and `project-memory.md` come from that repo. Any agent that reads them gets the project context, coding rules and workflows without you re-explaining everything.

Each tool has its own entry file, and they all point at the same memory:

| Tool | File |
|------|------|
| Claude Code | `CLAUDE.md` |
| Codex / OpenAI Agents | `AGENTS.md` |
| Cursor | `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |

If you want the same setup in your own project, grab it from the [gnanam repo](https://github.com/utsaaham/gnanam).

---

## Related repos

| Repo | What it is |
|------|-----------|
| [utsaaham/arogyamandiram](https://github.com/utsaaham/arogyamandiram) | This repo. Next.js web app and backend API. |
| [utsaaham/ArogyaM-iOS-v1](https://github.com/utsaaham/ArogyaM-iOS-v1) | Native iOS app, SwiftUI. |
| [utsaaham/gnanam](https://github.com/utsaaham/gnanam) | The portable AI memory system used in this repo. |

---

## License

MIT

## About the name Ciel

The name Ciel is a fan tribute inspired by *That Time I Got Reincarnated as a Slime* (*Tensura*). The original work, names and characters belong to their respective creators and rights holders. Arogyamandiram is an independent open-source project and is not affiliated with or endorsed by the franchise.

---

Built for everyday health tracking, anywhere.

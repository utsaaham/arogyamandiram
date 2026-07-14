# 🏥 Arogyamandiram

**Your Premium Health & Wellness Companion**

A full-stack health tracking web app built with Next.js 15, featuring food logging, water tracking, weight journal, workout planning, sleep tracking, and AI-powered recommendations.

![Next.js](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

---

## ✨ Features

### 📊 Dashboard
- Real-time calorie & macro tracking with progress rings
- Daily summary: calories, water, workouts, meals
- Meal breakdown by type (breakfast/lunch/dinner/snack)
- Quick action shortcuts

### 🏅 Achievements & Streaks
- Habit streaks for logging, water, workouts, sleep, and weight
- Badge collection for first-time milestones and longer streaks
- Dedicated achievements page with streak overview cards
- Motivation section on the dashboard with your latest badge

### 🍛 Food Logger
- **150+ curated foods** built-in for quick logging across common meal types and staples
- Fuzzy search with relevance scoring
- Category filters for mains, legumes, breads, grains, snacks, desserts, drinks, protein, fruits, dips, and more
- Custom food entry for anything not in the database
- Quantity adjustor with scaled nutrition preview
- Auto meal-type detection by time of day
- USDA FoodData Central fallback for broader food search coverage

### 💧 Water Tracker
- Animated water glass visualization with wave effects
- Quick-add buttons (100ml, 250ml, 500ml, 750ml)
- Custom amount picker
- Glass tracker visualization
- Contextual hydration tips

### ⚖️ Weight Journal
- Interactive weight trend chart (recharts)
- Period selector: 7D, 2W, 1M, 3M, 6M, 1Y
- BMI calculator with visual scale
- Weight history table with change indicators
- Target weight reference line

### 🏋️ Workout Planner
- 50+ preset exercises across 5 categories (Cardio, Strength, Flexibility, Sports, Other)
- Auto calorie estimation per exercise
- Strength-specific: sets, reps, weight tracking
- Burn goal progress ring
- Category breakdown visualization

### 🤖 Insights
- AI-powered insights: yesterday, weekly, monthly, yearly (gated by logged data)
- Privacy-first: we never send your name or email—only anonymized health metrics
- Personalized meal suggestions
- Custom workout plan generator
- Requires OpenAI API key (user provides their own)

### ✨ Ciel
- A personalized daily health guide for outlooks, meals, workouts, and weekly direction
- Food plans respect vegetarian, non-vegetarian, eggetarian, vegan, pescatarian, and flexitarian choices
- Favorite cuisines, allergies, cooking comfort, and maximum cooking time are configured in **Settings → Customizations**
- Every generated dish includes ingredients, prep/cook time, and step-by-step instructions

### ⚙️ Settings & Onboarding
- 4-step onboarding wizard
- Profile management (height, weight, activity, goal)
- API key management (AES-256 encrypted)
- Custom daily targets
- Metric/Imperial units
- Notification preferences
- Food, cuisine, allergy, and cooking preferences for Ciel

---

## 🔒 Security Features

- **API Masking**: All API responses are filtered server-side — no sensitive data in browser network tab
- **Encrypted API Keys**: User API keys encrypted with AES-256-GCM before storage
- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Sessions**: 30-day expiry via NextAuth.js
- **Route Protection**: Dashboard layout guards plus API session checks for protected flows
- **Request Sanitization**: Frontend API client strips blocked fields before sending

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.7 (strict) |
| Styling | Tailwind CSS 3.4 |
| Database | MongoDB (Mongoose 8) |
| Auth | NextAuth.js 4 (JWT) |
| Charts | Recharts 2.15 |
| Icons | Lucide React |
| AI | OpenAI GPT-4o-mini |
| Animation | Framer Motion + CSS |
| Encryption | Node.js crypto (AES-256-GCM) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.19+ (or Node.js 22.13+)
- MongoDB Atlas account (free tier works)
- (Optional) OpenAI API key for AI features
- (Optional) USDA FoodData Central API key for broader food search coverage

**What you need to provide:**

| Item | Required? | Where to get it | Notes |
|------|-----------|-----------------|-------|
| `MONGODB_URI` | Yes | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) — create a free cluster, copy connection string | Use the same cluster for local + Vercel if you want to share data. |
| `NEXTAUTH_SECRET` | Yes | Run `openssl rand -base64 32` | Must stay stable per deployed environment. |
| `ENCRYPTION_KEY` | Yes | Run `openssl rand -hex 32` | **If you share a MongoDB cluster between local and Vercel, this MUST be the same value everywhere. Changing it will make all previously stored API keys undecryptable until users re-enter them.** |
| `NEXTAUTH_URL` | Yes | Use `http://localhost:3000` for local dev | Set to your Vercel URL in production. |
| `OPENAI_API_KEY` | Optional | [OpenAI](https://platform.openai.com/api-keys) — for insights, meal ideas, workout plans | Optional server-wide fallback. Users can also add their own key in **Settings → API Keys**, which is AES-256 encrypted in MongoDB. In production (Vercel), it is recommended to set this so AI continues to work even if a user key is missing or broken. |
| `FDC_API_KEY` | Optional | [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide/) — for broader food search | Optional server-wide fallback for external food lookup beyond the built-in catalog. |

### Installation

```bash
# Clone the repository
git clone https://github.com/utsaaham/arogyamandiram.git
cd arogyamandiram

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Edit `.env.local` with your values:

```env
# Required
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/arogyamandiram
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-min-32-characters-long
ENCRYPTION_KEY=your-32-byte-hex-string-for-aes256

# Optional - Server defaults for AI & food search
OPENAI_API_KEY=sk-...
FDC_API_KEY=your-usda-fooddata-central-api-key

NODE_ENV=development
```

**Generate secure keys:**

```bash
# NEXTAUTH_SECRET
openssl rand -base64 32

# ENCRYPTION_KEY (32 bytes hex)
openssl rand -hex 32
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

---

## 📁 Project Structure

```
arogyamandiram/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── onboarding/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Sidebar + mobile nav wrapper
│   │   ├── dashboard/page.tsx    # Main dashboard
│   │   ├── food/page.tsx         # Food logger
│   │   ├── water/page.tsx        # Water tracker
│   │   ├── weight/page.tsx       # Weight journal
│   │   ├── workout/page.tsx      # Workout planner
│   │   ├── sleep/page.tsx        # Sleep tracker
│   │   ├── ai-insights/page.tsx  # Insights (yesterday, weekly, monthly, yearly)
│   │   ├── achievements/page.tsx # Achievements & streaks
│   │   └── settings/page.tsx     # Settings
│   ├── api/
│   │   ├── auth/                 # NextAuth + register
│   │   ├── user/                 # Profile, API keys, onboarding
│   │   ├── foods/                # Food search + USDA fallback
│   │   ├── daily-log/            # Daily log + meals
│   │   ├── water/                # Water intake
│   │   ├── weight/               # Weight history
│   │   ├── workouts/             # Workout CRUD
│   │   ├── cron/                 # Scheduled syncs, reminders, daily plans
│   │   └── ai/                   # AI plans, recommendations, logging
│   ├── globals.css               # Dark theme + glassmorphism
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── food/                     # Food search cards, modals
│   ├── layout/                   # Sidebar, MobileNav
│   ├── achievements/             # Streak and badge cards
│   ├── ui/                       # ProgressRing, MacroBar, Chart, Toast, etc.
│   └── workout/                  # Workout modal
├── hooks/
│   ├── useDailyLog.ts            # Daily log data hook
│   ├── useUser.ts                # User data hook
│   └── useAchievements.ts        # Achievements (streaks + badges) hook
├── lib/
│   ├── apiClient.ts              # Frontend API wrapper (sanitized)
│   ├── apiMask.ts                # Server-side response masking
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # MongoDB connection
│   ├── encryption.ts             # AES-256 encryption
│   ├── health.ts                 # BMR, TDEE, macro calculations
│   ├── session.ts                # Auth helpers
│   ├── gamification.ts           # Streak and badge calculation logic
│   └── utils.ts                  # Formatters, validators
├── models/
│   ├── User.ts                   # User schema
│   ├── DailyLog.ts               # Daily log schema
│   ├── DailyPlan.ts              # AI daily plan schema
│   └── Food.ts                   # Food cache/search schema
├── types/
│   └── index.ts                  # TypeScript definitions
```

---

## 🎨 Design System

- **Theme**: Dark with glassmorphism (noise texture overlay)
- **Colors**: Violet (primary), Emerald (success), Amber (warning), Rose (danger), Cyan (water)
- **Typography**: DM Sans (body), Satoshi fallback (headings), JetBrains Mono (code)
- **Components**: Glass cards, progress rings, macro bars, stat cards, modals

---

## 📱 Responsive Design

- **Desktop**: Full sidebar navigation (collapsible)
- **Mobile**: Bottom tab navigation, stacked layouts
- **Modals**: Bottom-sheet style on mobile, centered on desktop

---

## 🍛 Food Catalog

150+ built-in foods with accurate per-serving nutrition data across mains, legumes, breads, rice dishes, snacks, sweets, drinks, fruits, seafood, and more.

Each item includes: calories, protein, carbs, fat, fiber, serving size, veg/vegan flags.

---

## 🤖 Integrating with AI Tools

This project ships with a shared memory system (`.memory/`) that any AI coding tool can load. The entry point is `project-memory.md` + `.memory/README.md`.

Each tool reads its own instruction file:

| Tool | File |
|------|------|
| Claude Code | `CLAUDE.md` |
| Codex / OpenAI Agents | `AGENTS.md` |
| Cursor | `.cursorrules` |
| GitHub Copilot | `.github/copilot-instructions.md` |

All files point to the same `.memory/` system — no duplication.

---

## 📄 License

MIT

## 💙 Inspiration Credit

The name **Ciel** is a fan tribute inspired by *That Time I Got Reincarnated as a Slime* (*Tensura*). The original work, names, and characters belong to their respective creators and rights holders. Arogyamandiram is an independent open-source project and is not affiliated with or endorsed by the franchise.

---

Built for everyday health tracking, anywhere

# 🏥 Arogyamandiram

**Your Premium Health & Wellness Companion**

A full-stack health tracking web app built with Next.js 14, featuring Indian food database, water tracking, weight journal, workout planner, and AI-powered recommendations.

![Next.js](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue) ![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green) ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

---

## ✨ Features

### 📊 Dashboard
- Real-time calorie & macro tracking with progress rings
- Daily summary: calories, water, workouts, meals
- Meal breakdown by type (breakfast/lunch/dinner/snack)
- Quick action shortcuts

### 🍛 Food Logger
- **150+ Indian foods** built-in: curries, dals, breads, rice, sweets, snacks, beverages, dry fruits
- Fuzzy search with relevance scoring
- Category filters (Curries, Dals, Breads, Rice, Snacks, Sweets, Drinks, Non-Veg, Fruits)
- Custom food entry for anything not in the database
- Quantity adjustor with scaled nutrition preview
- Auto meal-type detection by time of day
- Optional Edamam API integration for 900k+ international foods

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

### 🤖 AI Insights
- AI-powered weekly health insights
- Personalized Indian meal suggestions
- Custom workout plan generator
- Requires OpenAI API key (user provides their own)

### ⚙️ Settings & Onboarding
- 4-step onboarding wizard
- Profile management (height, weight, activity, goal)
- API key management (AES-256 encrypted)
- Custom daily targets
- Metric/Imperial units
- Notification preferences

---

## 🔒 Security Features

- **API Masking**: All API responses are filtered server-side — no sensitive data in browser network tab
- **Encrypted API Keys**: User API keys encrypted with AES-256-GCM before storage
- **Password Hashing**: bcrypt with 12 salt rounds
- **JWT Sessions**: 30-day expiry via NextAuth.js
- **Route Protection**: Middleware-based auth for all dashboard routes
- **Request Sanitization**: Frontend API client strips blocked fields before sending

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
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

- Node.js 18+
- MongoDB Atlas account (free tier works)
- (Optional) OpenAI API key for AI features
- (Optional) Edamam API key for international food search

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
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
EDAMAM_APP_ID=your-edamam-app-id
EDAMAM_APP_KEY=your-edamam-app-key

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
│   │   ├── ai-insights/page.tsx  # AI recommendations
│   │   └── settings/page.tsx     # Settings
│   ├── api/
│   │   ├── auth/                 # NextAuth + register
│   │   ├── user/                 # Profile, API keys, onboarding
│   │   ├── foods/                # Food search
│   │   ├── daily-log/            # Daily log + meals
│   │   ├── water/                # Water intake
│   │   ├── weight/               # Weight history
│   │   ├── workouts/             # Workout CRUD
│   │   └── ai/                   # AI recommendations
│   ├── globals.css               # Dark theme + glassmorphism
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── food/                     # Food search cards, modals
│   ├── layout/                   # Sidebar, MobileNav
│   ├── ui/                       # ProgressRing, MacroBar, Chart, Toast, etc.
│   └── workout/                  # Workout modal
├── hooks/
│   ├── useDailyLog.ts            # Daily log data hook
│   └── useUser.ts                # User data hook
├── lib/
│   ├── apiClient.ts              # Frontend API wrapper (sanitized)
│   ├── apiMask.ts                # Server-side response masking
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # MongoDB connection
│   ├── encryption.ts             # AES-256 encryption
│   ├── health.ts                 # BMR, TDEE, macro calculations
│   ├── indianFoods.ts            # 150+ Indian food database
│   ├── session.ts                # Auth helpers
│   └── utils.ts                  # Formatters, validators
├── models/
│   ├── User.ts                   # User schema
│   └── DailyLog.ts               # Daily log schema
├── types/
│   └── index.ts                  # TypeScript definitions
└── middleware.ts                  # Route protection
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

## 🍛 Indian Food Database

150+ foods with accurate per-serving nutrition data:

| Category | Count | Examples |
|----------|-------|---------|
| Curries | 25 | Paneer Butter Masala, Butter Chicken, Chole, Palak Paneer |
| Dals | 8 | Dal Tadka, Dal Makhani, Moong Dal, Rasam |
| Breads | 24 | Roti, Naan, Paratha, Dosa, Uttapam, Appam |
| Rice | 13 | Biryani (Veg/Chicken/Mutton), Pulao, Khichdi |
| Sweets | 25 | Gulab Jamun, Rasgulla, Jalebi, Halwa, Kulfi |
| Snacks | 20 | Samosa, Pani Puri, Vada Pav, Dhokla, Momos |
| Beverages | 12 | Masala Chai, Lassi, Nimbu Pani, Filter Coffee |
| Non-Veg | 8 | Tandoori Chicken, Fish Fry, Seekh Kebab |
| Fruits & Dry Fruits | 14 | Mango, Almonds, Dates, Walnuts |

Each item includes: calories, protein, carbs, fat, fiber, serving size, veg/vegan flags.

---

## 📄 License

MIT

---

Built with ❤️ for Indian health & wellness

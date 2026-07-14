---
name: Next.js Fullstack Agent - Skills
last_updated: 2026-04-15
updated_by: codex-gpt-5
---

# Skills

## Technologies Owned

- **Next.js 15 App Router** - API routes, server components, route groups
- **TypeScript 5.7** - strict mode, path aliases (`@/*`)
- **MongoDB + Mongoose 8** - schema design, compound indexes, connection pooling
- **NextAuth.js 4** - JWT strategy, credentials provider, session callbacks
- **bcryptjs** - password hashing
- **AES-256-GCM** - key encryption/decryption via `lib/encryption.ts`
- **Zod 3.24** - request validation
- **OpenAI Responses API** - `gpt-4o-mini` calls for AI features
- **date-fns 4.1** - date manipulation for log queries

## Key Patterns

### API Route Template

```typescript
import { getAuthUserId, isUserId } from '@/lib/session'
import dbConnect from '@/lib/db'
import { maskUser, errorResponse } from '@/lib/apiMask'

export async function GET(req: Request) {
  const authResult = await getAuthUserId()
  if (!isUserId(authResult)) return authResult
  await dbConnect()
  return Response.json(maskUser(user))
}
```

### DailyLog Query Pattern

```typescript
const log = await DailyLog.findOne({ userId, date: today })
```

### Achievement Computation

```typescript
import { computeAchievements } from '@/lib/gamification'
const { streaks, badges, xp } = await computeAchievements(userId)
```

### AI Route Pattern

```typescript
const openaiKey = await resolveOpenAIKey(userId)
if (!openaiKey) return errorResponse('No OpenAI API key configured', 400)

const res = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${openaiKey}`,
  },
  body: JSON.stringify({ model: 'gpt-4o-mini', input, instructions }),
})
```

## Gotchas

- `password` has `select: false` - use `.select('+password')` when needed
- Never return raw user documents - always mask them
- The `DailyLog` pre-save hook recalculates totals
- Some routes support cron bypass headers; prefer `getAuthUserIdWithBypass(req)` where appropriate
- `Food` and `DailyPlan` are active models; do not assume the data model is only `User` + `DailyLog`

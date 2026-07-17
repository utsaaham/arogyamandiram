---
name: Next.js
type: skill
last_updated: 2026-04-15
updated_by: codex-gpt-5
---

# Next.js 15 (App Router)

## How It's Used Here

- **App Router** only - no Pages Router
- Route groups `(auth)` and `(dashboard)` separate public vs protected pages
- `(dashboard)/layout.tsx` wraps protected pages with the dashboard shell
- API routes live in `app/api/`
- Server Components handle shells; Client Components handle interactive UI
- Root protection is currently handled in `components/layout/DashboardLayoutClient.tsx` with `useSession()` and onboarding checks
- `app/layout.tsx` sets fonts, metadata, manifest, and viewport

## Key Patterns

### Route Protection

Dashboard navigation is protected in the layout client shell. API routes protect server access with `lib/session.ts` helpers.

### API Route Structure

```typescript
export async function GET(req: Request) {
  return Response.json({ ok: true })
}

export async function POST(req: Request) {
  return Response.json({ ok: true })
}
```

### Path Aliases

```typescript
import { something } from '@/lib/something'
```

### Client-heavy Product Areas

- `/settings` is a large client page with tab/query state
- `/dashboard` renders different desktop and mobile compositions in one file
- `/ai` and `/debug` are interactive app surfaces

## Gotchas

- `'use client'` is required for hooks and event handlers
- Body size limit is 2mb in `next.config.js`
- Older docs mention `middleware.ts`; the current repo does not have that file

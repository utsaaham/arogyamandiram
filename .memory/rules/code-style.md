---
name: Code Style Rules
type: rule
last_updated: 2026-03-26
applies_to: All Agents
---

# Code Style

## Language & Types

- TypeScript strict mode throughout - no `any` without justification
- Use `@/` path alias for all imports (never relative `../../`)
- Types live in `types/index.ts` - add new shared types there, not inline

## Naming

- Files: `PascalCase` for components (`AddMealModal.tsx`), `camelCase` for lib/hooks (`useDailyLog.ts`)
- React components: PascalCase
- Functions/variables: camelCase
- Constants: SCREAMING_SNAKE_CASE in `lib/constants.ts`
- CSS classes: kebab-case

## React Components

- Mark files with `'use client'` only when they use hooks, event handlers, or browser APIs
- Page files (`page.tsx`) default to server components - keep them lean
- Prefer named exports over default exports for components (page files use default exports as required by Next.js)

## API Routes

- Export named functions matching HTTP verbs: `GET`, `POST`, `PUT`, `DELETE`
- Always call `dbConnect()` before any DB operations
- Always verify session before touching data: `getServerSession(authOptions)`
- Always return responses through `apiMask.ts` helpers (`maskUser`, `errorResponse`, `maskedResponse`)

## Styling

- Do not use inline `style={{}}` for layout - use Tailwind classes
- Do not create new card classes - use `dashboard-unified-card` or existing variants
- Do not hardcode colors - use Tailwind token names (e.g. `text-emerald-500` not `text-[#10b981]`)
- Exception: `globals.css` already uses hex for theme tokens - keep it consistent there

## File Size

- Prefer splitting large files. `gamification.ts` is 800+ lines - that's the limit, don't let other lib files exceed this without a strong reason

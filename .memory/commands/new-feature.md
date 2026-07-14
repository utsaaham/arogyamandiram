---
name: New Feature Command
type: command
last_updated: 2026-03-26
---

# New Feature

## When to Use

Adding a new tracking feature (e.g., a new health metric, a new AI capability, a new dashboard section).

## Steps

### 1. Create a branch

```bash
git checkout -b feature/dev-01-[description]-sprint-[month-day]
```

Follow the naming convention: `feature/dev-01-[short-description]-sprint-[month-dd]`

### 2. Plan the data model

- Does it fit in `DailyLog.ts` (per-day data) or `User.ts` (profile/persistent data)?
- If it's a new daily metric, add it to the DailyLog schema
- Add the TypeScript type to `types/index.ts`

### 3. Build the API route

Create `app/api/[feature]/route.ts`:
1. Check session: `getServerSession(authOptions)` → 401 if missing
2. Call `dbConnect()`
3. Validate input
4. Query/mutate DB
5. Return through `maskUser()` or `maskedResponse()`

### 4. Build the UI

1. Create page: `app/(dashboard)/[feature]/page.tsx`
2. Create components in `components/[feature]/`
3. Use `dashboard-unified-card` for cards, emerald palette for primary accents
4. Add loading states with `Skeleton.tsx`
5. Add error states with `Toast.tsx`
6. Add `aria-label` / `aria-describedby` to interactive elements
7. Test mobile layout (bottom nav should still be accessible)

### 5. Add navigation link

- `components/layout/Sidebar.tsx` - desktop nav item
- `components/layout/MobileNav.tsx` - mobile tab (limited - only add if high priority)

### 6. Update hooks if needed

If the feature needs data fetched on multiple pages, create a hook in `hooks/useFeatureName.ts`.

### 7. Update memory

After completing:
- Update `context/progress.md` - move to Done
- Update `context/active-context.md` - what's next

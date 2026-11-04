---
name: Fix Bug Command
type: command
last_updated: 2026-09-07
updated_by: codex
---

# Fix a Bug

## When to Use

When a feature is broken, data isn't saving/loading correctly, or the UI is behaving unexpectedly.

## Steps

### 1. Locate the bug

- Is it a UI issue (wrong data displayed, layout broken)?
  → Check the page component and `globals.css`
- Is it an API issue (data not saving, wrong response)?
  → Check the API route handler in `app/api/`
- Is it a data model issue (missing field, wrong calculation)?
  → Check `models/User.ts` or `models/DailyLog.ts` and the pre-save hooks
- Is it a calculation issue (wrong calorie count, wrong streak)?
  → Check `lib/health.ts`, `lib/gamification.ts`, or `lib/calorieBurn.ts`

### 2. For API bugs - check masking first

If data is missing from the API response, check if `maskUser()` in `lib/apiMask.ts` is stripping it. It intentionally removes: `password`, `apiKeys`, `__v`, `_id`.

### 3. For runtime and AI bugs - use Logfire

Filter the `arogyamandiram-server` service by route, status, exception, or outbound request. Browser failures and Web Vitals use the `arogyamandiram-browser` service. Do not add prompts, completions, health records, or credentials to spans while diagnosing a bug.

### 4. For auth bugs

Check `lib/auth.ts` - session callbacks inject `userId` into JWT. If `session.user.id` is undefined in an API route, the JWT callback may be missing it.

### 5. For DB bugs

- Check the DailyLog compound index - queries need both `userId` AND `date`
- Check if the pre-save hook is computing totals correctly (modifying `meals` array triggers hook)
- Check if `select: false` is preventing password retrieval

### 6. Fix on the current sprint branch, or create a fix branch

```bash
# Minor fix - commit to current sprint branch
git add -p   # review what you're staging
git commit -m "Fix: [description]"

# Significant fix - new branch
git checkout -b feature/dev-01-fix-[description]-sprint-[month-dd]
```

### 7. Verify

- Check the UI renders correctly on both desktop and mobile
- Check the API response has the expected fields
- Ensure no sensitive fields are leaked in the response

---
name: Deploy Command
type: command
last_updated: 2026-03-26
---

# Deploy

## When to Use

When a sprint is complete and changes need to go to production.

## Steps

### 1. Finish the sprint branch

Ensure all work on `feature/dev-01-*` branch is committed.

```bash
git status        # nothing unexpected staged
git log --oneline -10   # review recent commits
```

### 2. Merge to main

```bash
git checkout main
git pull origin main          # ensure main is up to date
git merge feature/dev-01-...  # merge the sprint branch
git push origin main          # triggers Vercel auto-deploy
```

### 3. Vercel auto-deploys

Pushing to `main` triggers a Vercel build automatically.
- Framework: nextjs
- The `feature/vercel-01` branch is intentionally ignored (`vercel.json` conditional)

### 4. Check env vars on Vercel

If you added new env vars in `.env.local`, ensure they are also added in the Vercel dashboard under **Project Settings → Environment Variables**.

Prod vars use the `_VERCEL` suffix convention:
```
MONGODB_URI_VERCEL
NEXTAUTH_SECRET_VERCEL
ENCRYPTION_KEY_VERCEL
```

### 5. Verify the deployment

After deploy:
- Check that login works
- Check the dashboard loads
- Check AI features (if OpenAI key is set)
- Confirm `NEXT_PUBLIC_DEBUG_MODE` is NOT set to `true` in prod

### 6. Update memory

- Update `context/active-context.md` - new sprint begins
- Update `context/progress.md` - mark deployed items as done

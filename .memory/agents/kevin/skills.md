---
name: DevOps Agent - Skills
last_updated: 2026-04-15
updated_by: codex-gpt-5
---

# Skills

## Technologies Owned

- **Vercel** - Next.js deployment, env var management, cron config
- **MongoDB Atlas** - cloud database, connection string management
- **Next.js build/runtime** - `next dev`, `next build`, `next start`, env-driven porting
- **Cron runtime** - Vercel cron + `scripts/local-cron.mjs`
- **Environment management** - `.env.local` for dev, Vercel dashboard for prod

## Key Configuration

### `vercel.json`

- Uses the Next.js framework
- Ignores `feature/vercel-01`
- Schedules `/api/cron/generate-daily-plans`

### `next.config.js` highlights

- React strict mode enabled
- Image domains: `lh3.googleusercontent.com`, `avatars.githubusercontent.com`
- Security headers on API routes
- Body size limit: 2mb
- `NEXTAUTH_URL` gets a development fallback when env is missing

### Important Env Vars

- Core: `MONGODB_URI`, `MONGO_DB`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `CRON_SECRET`, `PORT`
- Fallback integrations: `OPENAI_API_KEY`, `FDC_API_KEY`, `SMTP_HOST`, `SMTP_PORT`, `IMAP_HOST`, `IMAP_PORT`

## Common Tasks

### Deploy to Vercel

Push to `main` branch and let Vercel auto-deploy.

### Add a new env var

1. Add it to `.env.local` for dev
2. Add it in the Vercel dashboard
3. Verify `NEXTAUTH_URL` and cron/base-url assumptions still match the runtime

### Run locally

```bash
npm run dev
```

This starts Next plus the local cron runner.

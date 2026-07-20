---
state: populated
created: 2026-03-26
last_updated: 2026-07-19
last_read: 2026-07-19
updated_by: claude-fable-5
staleness_days: 3
---

# Project Memory

> This is the entry point for any AI agent working on this project.
> Every tool - Cursor, Claude Code, Windsurf, Cline, Copilot, Gemini, Codex - starts here.
> Do NOT start working without reading this file and `.memory/README.md`.

---

## Memory Status

| Section | Last Updated | Updated By | Stale After | Status |
|---------|-------------|------------|-------------|--------|
| context/ | 2026-07-19 | claude-fable-5 | 3 days | Current |
| agents/ | 2026-04-15 | codex-gpt-5 | 7 days | Current |
| skills/ | 2026-04-15 | codex-gpt-5 | 10 days | Current |
| rules/ | 2026-03-26 | claude-sonnet-4-6 | 14 days | Current |
| commands/ | 2026-03-26 | claude-sonnet-4-6 | 14 days | Current |

---

## Before You Do Anything

1. Read `.memory/README.md` - folder map and full read order
2. Read `context/active-context.md` - current sprint and recent changes
3. Read `agents/index.md` - find the right agent for your task
4. Load the agent's skills + rules before writing any code

## Key Things Every Agent Must Know

- All API responses go through **`lib/apiMask.ts`** - never return raw DB documents
- API routes typically gate access through **`lib/session.ts`** helpers (`getAuthUserId`, `getAuthUserIdWithBypass`)
- Protected app navigation is enforced in **`components/layout/DashboardLayoutClient.tsx`**; there is currently no root `middleware.ts`
- Food search is **Mongo cache first + USDA FoodData Central fallback**, not Edamam
- AI flows use **OpenAI Responses API** and power the orchestrator, daily plans, meal ideas, recommendations, and loggers
- Dashboard styling is driven by **`app/globals.css`**, `glass-card`, and the bento/mobile dashboard patterns
- Local dev port is **env-driven** via `PORT`; `.env.example` currently defaults to **3000**
- Current branch: `feature/dev-01-minmial-changes-sprint-apr-22-26`

## After Significant Work

1. Update the relevant files in `.memory/`
2. Update the **Memory Status table** above with today's date and your name
3. Update `last_updated` in the frontmatter of any file you modified

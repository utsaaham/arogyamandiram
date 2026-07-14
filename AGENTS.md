# Project Instructions

> This is the cross-tool open standard entry point (AGENTS.md). It is read by OpenAI Codex, Devin, and other tools that look for AGENTS.md.

This project uses a shared memory system that any AI coding tool can load.

## Before you do anything

1. Read `project-memory.md` - entry point with the Memory Status table.
2. Read `.memory/README.md` - folder map and read order.
3. Follow the read order it gives you for the task type (code, tech question, workflow).
4. Verify assumptions against the current repo before writing memory updates. This repo has drifted faster than the docs in a few places.

## What's in `.memory/`

- `context/` - what the project is and what's in it
- `agents/` - named team members (human first names; role lives in each `persona.md`)
- `skills/` - how this project uses each technology
- `rules/` - coding conventions everyone follows
- `commands/` - step-by-step workflows
- `manager/` - how work gets routed

## Project-specific realities worth checking first

- Protected dashboard access currently flows through `components/layout/DashboardLayoutClient.tsx` and API auth helpers in `lib/session.ts`; do not assume a root `middleware.ts` exists.
- Food search is backed by `models/Food.ts` plus USDA FoodData Central fallback in `app/api/foods/route.ts`.
- AI features use the OpenAI Responses API and are spread across `app/api/ai/*`, `lib/openaiKey.ts`, `lib/aiHealthPlan.ts`, and `lib/mealIdeasService.ts`.
- Debug tooling is first-class: `/debug`, `components/debug/*`, `contexts/DebugLogsContext.tsx`, and `lib/debugLogsConfig.ts`.
- Cron-related behavior lives both in `app/api/cron/*` and `scripts/local-cron.mjs`.

## After significant work

Update the relevant files under `.memory/` and the Memory Status table in `project-memory.md` so the next agent has fresh context.

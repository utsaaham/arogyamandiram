# Project Instructions

This project uses a shared memory system that any AI coding tool can load.

## Before you do anything

1. Read `project-memory.md` - entry point with the Memory Status table.
2. Read `.memory/README.md` - folder map and read order.
3. Follow the read order it gives you for the task type (code, tech question, workflow).

## What's in `.memory/`

- `context/` - what the project is and what's in it
- `agents/` - named team members (human first names; role lives in each `persona.md`)
- `skills/` - how this project uses each technology
- `rules/` - coding conventions everyone follows
- `commands/` - step-by-step workflows
- `manager/` - how work gets routed

## After significant work

Update the relevant files under `.memory/` and the Memory Status table in `project-memory.md` so the next agent has fresh context.

---

<!-- Claude Code–specific guidance below -->

## Memory System - Read This First

This project uses a structured memory system. Before doing any work, read the following files in order:

1. **`project-memory.md`** - Entry point. Check the Memory Status table.
   - If status shows "Not yet created" → follow the "First Time Here?" instructions inside it
   - If dates are present → check for stale sections, then proceed

2. **`.memory/manager/manager.md`** - Understand how work is routed and coordinated

3. **`.memory/context/index.md`** - Load project context before touching any code

After reading, load the relevant section files from `.memory/` based on the task:
- Writing code? Read `.memory/rules/index.md`
- Using a specific technology? Read `.memory/skills/index.md`
- Running a workflow (deploy, debug, etc.)? Read `.memory/commands/index.md`

## After Significant Work

Update `.memory/` files and the Memory Status table in `project-memory.md` so the next agent has accurate context.

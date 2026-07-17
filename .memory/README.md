# Memory System

This is the canonical overview of the `.memory/` system for Arogyamandiram.
Every AI tool - Claude Code, Cursor, Copilot, Gemini, Cline, Windsurf, Continue - loads this after reading `project-memory.md`.

---

## Folder Map

| Folder | What it holds |
|--------|--------------|
| `context/` | What the project is, what files exist, what each part does |
| `agents/` | Named team members (human first names; role lives in each `persona.md`) |
| `skills/` | How this project uses each technology |
| `rules/` | Coding conventions everyone follows |
| `commands/` | Step-by-step workflows (deploy, fix a bug, new feature) |
| `manager/` | How work is routed and coordinated |

---

## Read Order

### First time here?
1. `context/index.md` - project overview and file map
2. `context/active-context.md` - current sprint and recent changes
3. `agents/index.md` - find the right agent for your task
4. `manager/manager.md` - understand coordination

### Returning agent?
1. `context/active-context.md` - check what changed since last time
2. Load only what your task needs (see below)

### For a coding task
- `rules/index.md` → relevant rule files
- `skills/index.md` → relevant skill files
- `context/tech-context.md` when the task touches auth, AI, cron, debug tooling, or data flow
- The agent's `persona.md` + `skills.md`

### For a workflow (deploy, debug, etc.)
- `commands/index.md` → the right command file

---

## Agent Naming

Agent folders use human first names (e.g. `agents/priya/`, `agents/kevin/`).
The role (fullstack, devops, frontend…) lives inside `persona.md`, not the folder name.
See `skills/agent-naming.md` for the full rule and name seed pool.

---

## After Significant Work

1. Update the relevant file(s) under `.memory/`
2. Bump `last_updated` in their frontmatter
3. Update the Memory Status table in `project-memory.md`

## What Drifts Fast In This Repo

- Route inventory under `app/api/` and `app/(dashboard)/`
- AI patterns (`app/api/ai/*`, debug logging, OpenAI model usage)
- Settings surface area (`/settings`, email, todos, health-data, customizations)
- Food search provider details (`models/Food.ts`, USDA fallback)
- Auth enforcement path (currently layout + API helpers rather than middleware)

---

## Staying up to date with upstream Gnanam

This memory system is based on [Gnanam](https://github.com/utsaaham/gnanam) - an evolving open spec. Rules, naming conventions, and tool stubs change over time. **At most once every 2 weeks**, any agent working here should check the upstream repo and pull in scaffolding updates.

### Upstream check log

Agents update this table after checking the upstream repo. If the most recent row is older than 2 weeks, the next agent should run another check before starting their task.

| Last pulled (upstream diff) | Last web search (release notes / issues) | Checked by | Upstream version / commit | Result |
|-----------------------------|-------------------------------------------|------------|---------------------------|--------|
| 2026-04-15 | 2026-04-15 | claude-sonnet-4-6 | main | applied: added .windsurfrules, upstream check log, updated agent-naming.md |

- **Last pulled** - date an agent fetched the upstream files and diffed them against this project.
- **Last web search** - date an agent searched for recent changes, release notes, or issues in the upstream repo (a lighter check when a full pull isn't possible).
- **Result** - `no changes`, `applied: <summary>`, or `skipped: <reason>`.

Keep the last 3–5 rows. Trim older ones.

### How to check for updates

1. Fetch these files from upstream:
   - `.memory/README.md` (this file)
   - `.memory/agents/index.md`
   - `.memory/skills/agent-naming.md`
   - `project-memory.md`
   - The 4 tool stubs at repo root (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.github/copilot-instructions.md`)
2. Diff them against this project's copies.
3. If the upstream structure, naming rules, or stub template has changed, apply the update here.
4. **Preserve all populated project content.** Updates only touch scaffolding - templates, rules, meta-skills, and tool stubs. The project-specific content in `context/`, populated agents, skills, and rules stays yours.
5. Record the upstream check date in the table above.

### When to skip the check

- It's been less than 2 weeks since the last check.
- The task at hand is urgent and scaffolding drift won't affect it.
- You don't have web access - note this and move on; the next agent can check.

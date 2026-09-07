---
name: Environment Rules
type: rule
last_updated: 2026-09-06
updated_by: codex
applies_to: All Agents
---

# Environment

## Required Agent Environment

- Codex agents must use the `codex-001` Conda environment.
- Claude agents must use the `claude-001` Conda environment.
- Other agents must use their explicitly assigned project environment; if none is documented, ask the user before executing project runtime commands.
- Prefer `conda run -n <agent-environment> <command>` for Python and other commands that do not depend on Node.js.
- Do not silently fall back to Conda `base`, another agent's environment, or the ambient shell runtime.

## Before Starting a Dev Server

Always check whether the app is already running before executing `npm run dev` or another server-start command.

1. Resolve the configured port from the project environment or dev script. This repository currently uses port `30000` in the local environment.
2. Check the port with `lsof -nP -iTCP:<port> -sTCP:LISTEN` and, when useful, make a read-only HTTP request to the expected local route.
3. If the expected app is already listening, reuse it. Do not start a duplicate server.
4. Start a new server only when the port is not serving the expected app. If another process owns the port, report the conflict; do not kill it without user authorization.

## Node.js Commands

The repository requires Node.js `>=20.19.0`. The active agent environment may inherit an older Node.js version, so verify it and select the installed Node.js 20.20.2 runtime before `node`, `npm`, `npx`, or Next.js commands.

Codex example:

```zsh
conda run -n codex-001 zsh -lc 'source /Users/kethandosapati/.nvm/nvm.sh && nvm use 20.20.2 >/dev/null && npm run dev'
```

Replace `npm run dev` with the required Node.js command. Before the first Node.js task in a session, verify the runtime with:

```zsh
conda run -n codex-001 zsh -lc 'source /Users/kethandosapati/.nvm/nvm.sh && nvm use 20.20.2 >/dev/null && node --version && npm --version'
```

## Exceptions

- Read-only shell inspection commands such as `rg`, `sed`, `git status`, and `git diff` do not require Conda because they do not execute project runtime code.
- If the assigned environment or a compatible Node.js runtime is unavailable, stop and report the environment problem instead of using a different runtime without the user's approval.

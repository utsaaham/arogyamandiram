# Rules

## Active Rules

| Rule | File | Applies To | Summary |
|------|------|-----------|---------|
| Code Style | `rules/code-style.md` | All Agents | TypeScript strict, naming conventions, component patterns, no inline styles |
| Architecture | `rules/architecture.md` | All Agents | Data flow, response masking, auth checks, DB access, component structure |
| Security | `rules/security.md` | Fullstack Agent | Password hashing, API key encryption, response masking, input validation |
| Environment | `rules/environment.md` | All Agents | Use the agent-specific Conda env, required Node version, and reuse running dev servers |

## Enforcement

Every agent MUST load the environment rule plus any task-relevant rules before running project tooling or writing code.

- Fullstack Agent: read environment + code-style + architecture + security
- UI Frontend Agent: read environment + code-style + architecture
- DevOps Agent: read environment + architecture (for env var and config conventions)

## Actions

- **New convention discovered?** Create a rule file and add it here.
- **Rule violated repeatedly?** Strengthen the rule in its file.
- **New security concern?** Add to `rules/security.md`.

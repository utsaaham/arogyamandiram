---
state: template
created: 2026-03-26
last_updated: 2026-03-26
last_read: ""
updated_by: claude-opus
staleness_days: 7
---

# Task Router

The manager reads this file to decide which agent handles a task.

## How Routing Works

1. Read the task
2. Look at the agents table below
3. Match the task to the right agent based on what area it falls in
4. Tell the agent which skills and rules to load

## Agents Table

> This table is empty because agents have not been created yet.
> Once you read the codebase and create agents in `agents/`, **replace this entire file** with the populated format.

| Task Type | Assign To | Load Skills | Load Rules |
|-----------|-----------|-------------|------------|
| _example: API work_ | _backend agent_ | _python, database_ | _architecture, security_ |

## Multi-Agent Tasks

| Task | Agent Order | How It Works |
|------|------------|--------------|
| _example: full-stack feature_ | _frontend → backend → QA_ | _Frontend builds UI, backend builds API, QA tests both_ |

## Edge Cases

- **Task doesn't fit any agent** - Manager asks the user for clarification
- **Task spans multiple areas** - Manager splits it and coordinates between agents
- **Documentation only** - Any agent can handle it, prefer the one who knows the area

---

## Populated Format

> When you populate this file, delete everything above and use this format instead:

```markdown
# Task Router

## Routing Table

| Task Type | Assign To | Load Skills | Load Rules |
|-----------|-----------|-------------|------------|
| [task area] | [agent name] | [skill files] | [rule files] |

## Multi-Agent Tasks

| Task | Agent Order | How It Works |
|------|------------|--------------|
| [task type] | [agent1 → agent2] | [handoff description] |

## Edge Cases

- **Task doesn't fit any agent** - Manager asks the user for clarification
- **Task spans multiple areas** - Manager splits it and coordinates between agents
- **Documentation only** - Any agent can handle it, prefer the one who knows the area

## Actions

- **New agent added?** Add their routing rules here.
- **Tasks frequently misrouted?** Refine the task type descriptions.
```

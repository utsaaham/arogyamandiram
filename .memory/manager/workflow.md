---
state: template
created: 2026-03-26
last_updated: 2026-03-26
last_read: ""
updated_by: claude-opus
staleness_days: 30
---

# Workflow

How every task flows from start to finish.

## Standard Flow

```
1. RECEIVE    - Manager gets the task
2. ROUTE      - Manager checks task-router.md, picks the right agent
3. CONTEXT    - Agent loads: persona + skills + relevant rules
4. PLAN       - Agent says what it will do BEFORE doing it
5. EXECUTE    - Agent does the work
6. VERIFY     - Agent checks work against loaded rules
7. TEST       - If code changed, tests must pass
8. UPDATE     - Update active-context.md and progress.md
9. DONE       - Report what was done and what is next
```

## Rules That Never Bend

- No code gets written without loading rules first
- No feature ships without tests
- Agent must state its plan before executing (user can course-correct)
- Update context files after significant work
- Update `last_updated` in frontmatter of any file you modify

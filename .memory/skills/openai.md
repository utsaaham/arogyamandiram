---
name: OpenAI API
type: skill
last_updated: 2026-09-07
updated_by: codex
---

# OpenAI Responses API (`gpt-4o-mini`)

## How It's Used Here

Most AI features use `gpt-4o-mini` through the OpenAI Responses API for cost efficiency and structured outputs.

Key sources:
1. **User-provided key** in `user.apiKeys.openai`
2. **Server fallback** in `OPENAI_API_KEY`

`lib/openaiKey.ts` resolves the usable key.

## AI Features

| Feature | Route | What It Does |
|---------|-------|-------------|
| Food logger | `POST /api/ai/food-logger` | Parse natural language into meal entries |
| Workout logger | `POST /api/ai/workout-logger` | Parse natural language into workouts |
| Meal ideas | `POST /api/ai/meal-ideas` | Generate personalized meal suggestions |
| Recommendations | `POST /api/ai/recommendations` | Health insights and recommendations |
| Health plan | `POST /api/ai/health-plan` | Generate a broader plan |
| Daily plan | `GET/POST /api/ai/daily-plan` | Read/generate per-day plan and regeneration variants |
| Orchestrator | `POST /api/ai/orchestrator` | Intent classification + routing; supports image input |
| Insights eligibility | `GET /api/ai/insights-eligibility` | Gate AI insights on data availability |

## Call Pattern

```typescript
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${resolvedKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    instructions,
    input,
    tools,
  }),
})
```

## Observability

AI route duration, outbound HTTP, failures, and request status are captured by the server's Pydantic Logfire/OpenTelemetry instrumentation. Never attach prompts, completions, API keys, images, or raw health data to telemetry.

## Gotchas

- Keep prompts concise for larger history windows
- Key resolution is async
- Prefer service wrappers like `mealIdeasService.ts` and `aiHealthPlan.ts` when they already exist
- If you add a new AI workflow, keep it inside the existing server trace and add only low-cardinality, non-sensitive attributes when needed
- The orchestrator route forwards auth/cron headers to internal sub-routes; do not break that header propagation

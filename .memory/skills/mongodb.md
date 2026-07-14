---
name: MongoDB + Mongoose
type: skill
last_updated: 2026-04-15
updated_by: codex-gpt-5
---

# MongoDB + Mongoose 8

## How It's Used Here

Primary collections:
- `users` - profiles, settings, targets, achievements, encrypted keys, sync metadata
- `dailylogs` - one document per user per day, containing tracking data and todo completions
- `dailyplans` - AI-generated daily plan per user per date
- `foods` - normalized searchable food cache, including USDA-imported foods

## Connection

`lib/db.ts` manages a singleton Mongoose connection with `maxPoolSize: 10`.

## Models

### User (`models/User.ts`)

- `email` unique, `username` unique sparse
- `password` uses `select: false`
- `apiKeys.openai`, `apiKeys.fdcApiKey` are encrypted
- `settings` includes notifications, email settings, customizations, reminder schedule, health-data sync, todo templates
- `targets` and `achievements` live on the user

### DailyLog (`models/DailyLog.ts`)

- Compound unique index: `{ userId, date }`
- `meals[]`, `workouts[]`, `waterEntries[]`, `sleep`
- `todoCompletions[]`, external health metrics, `xpAwarded`
- Pre-save hook recalculates totals and calories burned

### Supporting Models

- `DailyPlan` stores generated food/workout suggestions, regeneration counts, feedback, and prediction context
- `Food` stores searchable food metadata, categories, measures, USDA cache details, and freshness metadata

## Key Query Patterns

```typescript
const log = await DailyLog.findOneAndUpdate(
  { userId, date: today },
  { $setOnInsert: { userId, date: today } },
  { upsert: true, new: true }
)
```

## Gotchas

- `password` needs `.select('+password')`
- Never return raw user documents to the client
- `Food` search intentionally mixes local cache and external USDA hydration; be careful with duplicate IDs and serving measures

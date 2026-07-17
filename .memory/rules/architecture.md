---
name: Architecture Rules
type: rule
last_updated: 2026-03-26
applies_to: All Agents
---

# Architecture Rules

## Data Flow

```
Client (page/component)
  → lib/apiClient.ts (sanitizes request, strips blocked fields)
  → app/api/[route]/route.ts (validates session, queries DB)
  → lib/apiMask.ts (masks response, strips sensitive fields)
  → Client (receives safe data)
```

Never bypass this flow. Never return raw Mongoose documents to the client.

## Response Masking - MANDATORY

Every API route that returns user data MUST call `maskUser()` before responding.

```typescript
// CORRECT
return Response.json(maskUser(user))

// WRONG - leaks password, apiKeys
return Response.json(user)
```

## Request Sanitization

The frontend `apiClient.ts` strips blocked fields (`password`, `_id`, `__v`, `apiKeys`) from all outgoing requests. API routes should also validate on the server side - never trust client input blindly.

## Authentication Check - Every Route

```typescript
const session = await getServerSession(authOptions)
if (!session?.user?.id) return errorResponse('Unauthorized', 401)
```

No route should skip this check.

## AI Key Resolution

Use `lib/openaiKey.ts` to resolve the OpenAI key. Never hardcode key logic in route handlers. Always try user key first, then server fallback.

## Database Access

- `lib/db.ts` is the only place MongoDB is configured - call `dbConnect()`, don't create new connections
- Only 2 models exist: `User` and `DailyLog` - do not add new collections without a strong reason
- DailyLog is the only place daily tracking data lives - do not denormalize data into User

## Component Architecture

- Layout components in `components/layout/`
- Reusable UI primitives in `components/ui/`
- Feature-specific components in feature folders (`components/food/`, `components/workout/`, etc.)
- Do not put feature logic in `components/ui/` - those are generic building blocks

## No New Dependencies Without Reason

The stack is intentionally lean. Before adding a new npm package:
- Is there an existing way to do it with the current stack?
- Is it worth adding the bundle size?

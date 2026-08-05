---
name: Security Rules
type: rule
last_updated: 2026-08-04
applies_to: Fullstack Agent
---

# Security Rules

## Passwords

- Always hash with bcryptjs, 12 salt rounds - never store plaintext
- User.password has `select: false` in Mongoose schema - you must explicitly `.select('+password')` to retrieve it
- Only retrieve password for authentication (`comparePassword` method) - never return it to client

## API Keys (User-Provided)

- Never store OpenAI or Edamam keys in plaintext
- Always encrypt with `lib/encryption.ts` (AES-256-GCM) before saving to DB
- Always decrypt server-side - never send encrypted or decrypted keys to client
- `maskUser()` strips `apiKeys` from all responses - do not bypass this

## Response Masking

- `maskUser()` in `lib/apiMask.ts` is the security boundary - call it on every user response
- Stripped fields: `password`, `apiKeys`, `__v`, `_id` (internal fields)
- Use `maskedResponse()` for successful responses, `errorResponse()` for errors

## Session Validation

- Every protected API route resolves the caller through a `lib/session.ts` helper - never read `req.headers` or cookies for auth inside a route
- JWT tokens expire after 30 days

### Which helper to use

| Helper | Accepts | Use on |
|--------|---------|--------|
| `getAuthUserId()` | session cookie only | default for anything session-only |
| `getAuthUserIdWithBypass(req)` | cron secret, then session | routes the cron fan-out calls |
| `getAuthUserIdWithBearer(req)` | cron secret, then session, then bearer key | routes headless clients call (iOS app) |

### Bearer keys (headless clients)

- The credential is the per-user health-data key at `settings.healthData.apiKeyEncrypted`, AES-256 encrypted and `select: false`
- It is never queryable directly. The caller must send `x-arogyam-username` alongside `Authorization: Bearer <key>`; the username scopes the lookup to one row, which is then decrypted and compared
- Always compare through `verifyHealthDataKey()` - it applies the revoke check and a constant-time compare. Do not hand-roll the decrypt-and-compare
- `settings.healthData.apiKeyRevokedAt` is the kill switch. It is deliberately separate from `settings.healthData.enabled`, which only gates the pull cron - do not conflate them
- Never enable bearer auth on `/api/auth/*`, `/api/user/upgrade`, or any route that can change a credential. A key that can set a password can take the account

## Input Validation

- Validate user input before saving to DB - use Zod schemas where appropriate
- Sanitize: never trust `req.body` directly; destructure only expected fields
- The client-side `apiClient.ts` also strips blocked fields, but server must validate independently

## Environment Secrets

- Never commit `.env.local` or any file containing real secrets
- Never log API keys, passwords, or encryption keys - check debug logging code
- `NEXT_PUBLIC_DEBUG_MODE=true` must never be set in production

## Forbidden

- Never return raw Mongoose documents
- Never log sensitive fields (password, apiKeys, ENCRYPTION_KEY)
- Never skip the session check on API routes
- Never store plaintext secrets in DB

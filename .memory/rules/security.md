---
name: Security Rules
type: rule
last_updated: 2026-09-07
updated_by: codex
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

- Every protected API route checks `getServerSession(authOptions)` first
- Do not use `req.headers` or cookies directly for auth - use NextAuth session
- JWT tokens expire after 30 days

## Input Validation

- Validate user input before saving to DB - use Zod schemas where appropriate
- Sanitize: never trust `req.body` directly; destructure only expected fields
- The client-side `apiClient.ts` also strips blocked fields, but server must validate independently

## Environment Secrets

- Never commit `.env.local` or any file containing real secrets
- Never log API keys, passwords, encryption keys, prompts, raw health records, cookies, authorization headers, or reset/verification tokens
- `LOGFIRE_TOKEN` is server-only and must never use a `NEXT_PUBLIC_` name

## Forbidden

- Never return raw Mongoose documents
- Never log sensitive fields (password, apiKeys, ENCRYPTION_KEY)
- Never skip the session check on API routes
- Never store plaintext secrets in DB

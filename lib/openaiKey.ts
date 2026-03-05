// ============================================
// Shared OpenAI API Key Resolution
// ============================================
// Central helper for resolving a usable OpenAI API key.
// Prefers per-user key (AES-256 encrypted) and falls back
// to server-wide OPENAI_API_KEY. Never throws on decrypt.

import connectDB from '@/lib/db';
import User from '@/models/User';
import { decrypt } from '@/lib/encryption';

export async function resolveOpenAIKey(userId: string): Promise<string | null> {
  await connectDB();
  const user = await User.findById(userId).select('+apiKeys.openai').lean();
  const apiKeys = user?.apiKeys as { openai?: string } | undefined;

  if (apiKeys?.openai) {
    try {
      return decrypt(apiKeys.openai);
    } catch (err) {
      console.error('[OpenAI Key Error]: Failed to decrypt user OpenAI key', {
        userId,
        error: err instanceof Error ? err.message : String(err),
      });
      // fall through to server-level key or null
    }
  }

  if (process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
  }

  return null;
}


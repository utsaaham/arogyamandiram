// ============================================
// Coach memory - persist correlation patterns that keep holding
// ============================================
//
// A pattern enters memory after the correlation engine reports it; each
// re-appearance re-confirms it (timesConfirmed++). Only patterns confirmed
// at least MIN_CONFIRMATIONS times are injected into prompts, and a pattern
// not re-confirmed within DECAY_DAYS deactivates automatically.

import connectDB from '@/lib/db';
import CoachMemory from '@/models/CoachMemory';
import type { CorrelationResults } from './correlations';

const MIN_CONFIRMATIONS = 2;
const DECAY_DAYS = 14;
const MAX_PROMPT_LINES = 5;

/** Upsert today's correlation outputs into memory; decay stale patterns. Fire-and-forget safe. */
export async function updateCoachMemory(userId: string, results: CorrelationResults): Promise<void> {
  await connectDB();
  const now = new Date();

  const patterns = [
    ...results.insights.map((i) => ({
      patternKey: `${i.featureKey}:${i.outcome}`,
      text: i.text,
      delta: i.delta,
      confidence: i.confidence,
      sampleCount: i.sampleHigh + i.sampleLow,
    })),
    ...results.compound.map((c) => ({
      patternKey: `compound:${c.key}`,
      text: c.text,
      delta: c.delta,
      confidence: c.confidence,
      sampleCount: c.sampleWith + c.sampleWithout,
    })),
  ];

  for (const p of patterns) {
    await CoachMemory.findOneAndUpdate(
      { userId, patternKey: p.patternKey },
      {
        $set: {
          text: p.text,
          delta: p.delta,
          confidence: p.confidence,
          sampleCount: p.sampleCount,
          lastConfirmedAt: now,
          active: true,
        },
        $inc: { timesConfirmed: 1 },
        $setOnInsert: { firstSeenAt: now },
      },
      { upsert: true }
    );
  }

  // Decay: patterns the engine has stopped reporting for DECAY_DAYS go dormant.
  const cutoff = new Date(now.getTime() - DECAY_DAYS * 86_400_000);
  await CoachMemory.updateMany(
    { userId, active: true, lastConfirmedAt: { $lt: cutoff } },
    { $set: { active: false } }
  );
}

/**
 * Durable pattern lines for LLM prompts - strongest first, confirmed patterns
 * only. Empty array when the user has no established patterns yet.
 */
export async function getCoachMemoryLines(userId: string): Promise<string[]> {
  await connectDB();
  // No DB-side limit: confidence sorts alphabetically ('high' < 'low' <
  // 'medium'), so limiting before the in-memory rank could drop the strongest
  // medium patterns. The pattern-key space per user is small (~25), so
  // fetching all active confirmed patterns is cheap.
  const memories = await CoachMemory.find({
    userId,
    active: true,
    timesConfirmed: { $gte: MIN_CONFIRMATIONS },
  }).lean();

  const rank = { high: 0, medium: 1, low: 2 } as const;
  return memories
    .sort((a, b) => (rank[a.confidence] ?? 2) - (rank[b.confidence] ?? 2) || b.sampleCount - a.sampleCount)
    .slice(0, MAX_PROMPT_LINES)
    .map((m) => `${m.text} (confirmed ${m.timesConfirmed}×, ${m.sampleCount} days, ${m.confidence} confidence)`);
}

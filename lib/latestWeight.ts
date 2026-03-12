import connectDB from '@/lib/db';
import DailyLog from '@/models/DailyLog';

/**
 * Returns the user's latest logged body weight from DailyLog history.
 * Falls back to null when no valid weight entries exist.
 */
export async function getLatestLoggedWeight(userId: string): Promise<number | null> {
  await connectDB();

  const latest = await DailyLog.findOne(
    {
      userId,
      weight: { $exists: true, $ne: null, $gte: 20, $lte: 500 },
    },
    { weight: 1, _id: 0 }
  )
    .sort({ date: -1 })
    .lean<{ weight?: number } | null>();

  return typeof latest?.weight === 'number' ? latest.weight : null;
}


// ============================================
// GET /api/ai/insights-eligibility
// Returns which insight periods the user can request (based on logged data).
// ============================================

import connectDB from '@/lib/db';
import User from '@/models/User';
import DailyLog from '@/models/DailyLog';
import { maskedResponse, errorResponse } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getYesterday } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_FOR_WEEK = 7;
const DAYS_FOR_MONTH = 30;
const DAYS_FOR_YEAR = 365;

export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    await connectDB();

    const user = await User.findById(userId).select('createdAt').lean();
    if (!user) return errorResponse('User not found', 404);

    const accountCreatedAt =
      ((user as { createdAt?: Date }).createdAt?.getTime()) ?? 0;
    const accountAgeDays = accountCreatedAt ? Math.floor((Date.now() - accountCreatedAt) / ONE_DAY_MS) : 0;

    const logStats = await DailyLog.aggregate([
      { $match: { userId } },
      { $group: { _id: null, minDate: { $min: '$date' }, count: { $sum: 1 } } },
    ]);

    const distinctLogDays = logStats[0]?.count ?? 0;

    const yesterdayDate = getYesterday();
    const hasYesterdayLog = await DailyLog.exists({ userId, date: yesterdayDate });
    const yesterday = !!hasYesterdayLog;

    const week =
      distinctLogDays >= DAYS_FOR_WEEK ||
      accountAgeDays >= DAYS_FOR_WEEK;
    const month = distinctLogDays >= DAYS_FOR_MONTH;
    const year = distinctLogDays >= DAYS_FOR_YEAR;

    return maskedResponse({ yesterday, week, month, year });
  } catch (err) {
    console.error('[Insights eligibility error]:', err);
    return errorResponse('Failed to compute eligibility', 500);
  }
}

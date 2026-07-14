// ============================================
// /api/user - User Profile CRUD
// ============================================

import { NextRequest } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { maskedResponse, errorResponse, maskUser } from '@/lib/apiMask';
import { getAuthUserId, isUserId } from '@/lib/session';
import { getAgeFromDateOfBirth } from '@/lib/utils';
import { generateTargets } from '@/lib/health';
import { getLatestLoggedWeight } from '@/lib/latestWeight';
import { deriveActivityLevel } from '@/lib/deriveActivityLevel';
import { isAcceptedGoalInput, normalizeGoal, goalToLegacyDirection } from '@/lib/goals';

export const dynamic = 'force-dynamic';

function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

function isValidTimeString(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

// GET /api/user - Get current user profile (masked)
export async function GET() {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId; // Returns error response

    await connectDB();
    // Include apiKeys and email passwords so maskUser can compute boolean flags (values are never sent to client)
    const user = await User.findById(userId)
      .select('+apiKeys.openai +apiKeys.fdcApiKey')
      .lean();

    if (!user) return errorResponse('User not found', 404);

    const [latestWeight, derivedActivityLevel] = await Promise.all([
      getLatestLoggedWeight(String(userId)),
      deriveActivityLevel(userId),
    ]);
    const profileBase = user.profile as { weight?: number; targetWeight?: number; goal?: string } | undefined;
    // The goal is user-owned — never overridden from weight vs target. Legacy
    // stored values are normalized to the 5-value enum on read.
    const goal = normalizeGoal(profileBase?.goal);
    const userWithDerivedProfile = {
      ...user,
      profile: {
        ...user.profile,
        ...(latestWeight != null ? { weight: latestWeight } : {}),
        activityLevel: derivedActivityLevel,
        goal,
        // 3-value alias for older iOS builds that predate the 5-value enum.
        goalDirection: goalToLegacyDirection(goal),
      },
    };

    return maskedResponse(maskUser(userWithDerivedProfile));
  } catch (err) {
    console.error('[User GET Error]:', err);
    return errorResponse('Failed to fetch user', 500);
  }
}

// PUT /api/user - Update user profile, settings, or targets
export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!isUserId(userId)) return userId;

    const body = await req.json();
    const { profile, settings, targets } = body;
    // Username must be top-level; support body.username or body.profile?.username for robustness
    const rawUsername = body.username !== undefined ? body.username : (profile && typeof profile === 'object' ? profile.username : undefined);

    await connectDB();

    const updateData: Record<string, unknown> = {};

    if (rawUsername !== undefined && rawUsername !== null) {
      const str = typeof rawUsername === 'string' ? rawUsername : String(rawUsername);
      if (!str.trim()) {
        return errorResponse('Username cannot be empty', 400);
      }
      const normalized = str.toLowerCase().trim().replace(/\s+/g, '_');
      if (normalized.length < 3) return errorResponse('Username must be at least 3 characters', 400);
      if (normalized.length > 30) return errorResponse('Username must be at most 30 characters', 400);
      if (!/^[a-z0-9_]+$/.test(normalized)) {
        return errorResponse('Username can only contain letters, numbers, and underscores', 400);
      }
      const existing = await User.findOne({ username: normalized, _id: { $ne: userId } }).lean();
      if (existing) return errorResponse('This username is already taken', 409);
      updateData.username = normalized;
    }

    if (profile && typeof profile === 'object') {
      // Build dot-notation updates for nested fields (do not set profile.username - use top-level username only)
      for (const [key, value] of Object.entries(profile)) {
        if (key === 'username') continue; // username is top-level on User, not under profile
        if (key === 'goal') {
          // The goal is user-owned. Accept the 5-value enum plus known legacy
          // strings; store normalized.
          if (!isAcceptedGoalInput(value)) return errorResponse('Invalid goal', 400);
          updateData['profile.goal'] = normalizeGoal(value as string);
          continue;
        }
        if (key === 'dateOfBirth' && value) {
          updateData['profile.dateOfBirth'] = new Date(value as string);
        } else {
          updateData[`profile.${key}`] = value;
        }
      }

      // Recompute formula-based targets. Fields missing from this payload fall
      // back to the stored profile so a goal-only change still recalculates.
      const storedUser = await User.findById(userId).select('profile').lean();
      const stored = (storedUser?.profile ?? {}) as {
        weight?: number; height?: number; gender?: string; activityLevel?: string;
        goal?: string; dateOfBirth?: Date; age?: number; bodyFat?: number;
      };
      const weight = typeof profile.weight === 'number' ? profile.weight : stored.weight;
      const height = typeof profile.height === 'number' ? profile.height : stored.height;
      const gender = (profile.gender as string | undefined) ?? stored.gender;
      const activityLevel = (profile.activityLevel as string | undefined) ?? stored.activityLevel;
      const bodyFat = typeof profile.bodyFat === 'number' ? profile.bodyFat : stored.bodyFat;
      const goal = normalizeGoal((updateData['profile.goal'] as string | undefined) ?? stored.goal);
      let age: number | undefined;
      if (profile.dateOfBirth) {
        const dob = new Date(profile.dateOfBirth);
        if (!Number.isNaN(dob.getTime())) age = getAgeFromDateOfBirth(dob);
      } else if (typeof profile.age === 'number') {
        age = profile.age;
      } else if (stored.dateOfBirth) {
        age = getAgeFromDateOfBirth(stored.dateOfBirth);
      } else if (typeof stored.age === 'number') {
        age = stored.age;
      }
      const hasRequired =
        weight != null && weight > 0 &&
        height != null && height > 0 &&
        gender && activityLevel &&
        age != null && age >= 13 && age <= 120;
      if (hasRequired) {
        const generated = generateTargets(weight!, height!, age!, gender as 'male' | 'female' | 'other', activityLevel as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active', goal, bodyFat);
        for (const [key, value] of Object.entries(generated)) {
          updateData[`targets.${key}`] = value;
        }
      }
    }

    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        if (key === 'emailSettings') continue; // use /api/user/email-settings endpoint
        if (key === 'ccEmails' || key === 'recipientEmails') {
          const rawEmails = Array.isArray(value) ? value : [];
          const normalized = rawEmails
            .map((email) => String(email).trim().toLowerCase())
            .filter((email) => email.includes('@'));
          updateData['settings.recipientEmails'] = normalized;
          // Keep legacy key in sync while clients migrate.
          updateData['settings.ccEmails'] = normalized;
          updateData['settings.emailSetupChecklist.recipientListSaved'] = true;
          updateData['settings.emailSetupChecklist.lastUpdatedAt'] = new Date();
          continue;
        }
        if (key === 'aiEnabled') {
          if (typeof value !== 'boolean') return errorResponse('AI setting must be true or false', 400);
          updateData['settings.aiEnabled'] = value;
        } else if (key === 'emailRemindersEnabled') {
          if (typeof value !== 'boolean') return errorResponse('Email reminders setting must be true or false', 400);
          updateData['settings.emailRemindersEnabled'] = value;
        } else if (key === 'notifications' && typeof value === 'object') {
          for (const [nKey, nVal] of Object.entries(value as Record<string, boolean>)) {
            updateData[`settings.notifications.${nKey}`] = nVal;
          }
        } else if (key === 'nudges' && typeof value === 'object' && value !== null) {
          // Explicit dot-set per subkey so a partial nudges payload never
          // clobbers the rest of settings.nudges.
          const nudges = value as Record<string, unknown>;
          if (nudges.targetReachedDismissedForTargetWeight !== undefined) {
            const v = nudges.targetReachedDismissedForTargetWeight;
            if (v !== null && (typeof v !== 'number' || !Number.isFinite(v))) {
              return errorResponse('Invalid nudge dismissal value', 400);
            }
            updateData['settings.nudges.targetReachedDismissedForTargetWeight'] = v;
          }
        } else if (key === 'foodPreferences' && typeof value === 'object' && value !== null) {
          const prefs = value as Record<string, unknown>;
          const rawDietaryPreference = typeof prefs.dietaryPreference === 'string'
            ? prefs.dietaryPreference.trim()
            : '';
          const allowedDietaryPreferences = new Set([
            'no_preference', 'vegetarian', 'non_vegetarian', 'eggetarian',
            'vegan', 'pescatarian', 'flexitarian',
          ]);
          if (rawDietaryPreference && !allowedDietaryPreferences.has(rawDietaryPreference)) {
            return errorResponse('Invalid dietary preference', 400);
          }
          if (rawDietaryPreference) {
            updateData['settings.foodPreferences.dietaryPreference'] = rawDietaryPreference;
          }

          if (prefs.allergies !== undefined) {
            if (!Array.isArray(prefs.allergies)) {
              return errorResponse('Allergies must be an array of strings', 400);
            }
            updateData['settings.foodPreferences.allergies'] = prefs.allergies
              .map((entry) => String(entry).trim())
              .filter(Boolean)
              .slice(0, 20);
          }

          if (prefs.favoriteCuisines !== undefined) {
            if (!Array.isArray(prefs.favoriteCuisines)) {
              return errorResponse('Favorite cuisines must be an array of strings', 400);
            }
            updateData['settings.foodPreferences.favoriteCuisines'] = Array.from(new Set(
              prefs.favoriteCuisines.map((entry) => String(entry).trim()).filter(Boolean)
            )).slice(0, 20);
          }

          if (prefs.cookingSkill !== undefined) {
            const cookingSkill = String(prefs.cookingSkill).trim();
            if (!new Set(['beginner', 'intermediate', 'confident']).has(cookingSkill)) {
              return errorResponse('Invalid cooking skill', 400);
            }
            updateData['settings.foodPreferences.cookingSkill'] = cookingSkill;
          }

          if (prefs.maxCookingMinutes !== undefined) {
            const maxCookingMinutes = Number(prefs.maxCookingMinutes);
            if (!Number.isInteger(maxCookingMinutes) || maxCookingMinutes < 5 || maxCookingMinutes > 180) {
              return errorResponse('Maximum cooking time must be between 5 and 180 minutes', 400);
            }
            updateData['settings.foodPreferences.maxCookingMinutes'] = maxCookingMinutes;
          }
        } else if (key === 'customizations' && typeof value === 'object' && value !== null) {
          const customizations = value as Record<string, unknown>;
          const water = customizations.water as Record<string, unknown> | undefined;

          if (water && water.quickAmountsMl !== undefined) {
            if (!Array.isArray(water.quickAmountsMl) || water.quickAmountsMl.length !== 4) {
              return errorResponse('Water quick amounts must contain exactly 4 values', 400);
            }

            const parsedQuickAmounts = water.quickAmountsMl.map((entry) => Number(entry));
            const hasInvalidQuickAmount = parsedQuickAmounts.some((entry) =>
              !Number.isInteger(entry) || entry < 1 || entry > 5000
            );

            if (hasInvalidQuickAmount) {
              return errorResponse('Each water quick amount must be an integer between 1 and 5000 ml', 400);
            }

            updateData['settings.customizations.water.quickAmountsMl'] = parsedQuickAmounts;
          }

          if (customizations.mascot === 'kiki' || customizations.mascot === 'red-panda') {
            updateData['settings.customizations.mascot'] = customizations.mascot;
          }
        } else if (key === 'reminderSchedule' && typeof value === 'object' && value !== null) {
          const schedule = value as Record<string, unknown>;

          if (typeof schedule.timezone === 'string' && schedule.timezone.trim()) {
            const tz = schedule.timezone.trim();
            if (!isValidTimezone(tz)) return errorResponse('Invalid timezone', 400);
            updateData['settings.reminderSchedule.timezone'] = tz;
            updateData['profile.timezone'] = tz;
          }

          if (typeof schedule.waterHourlyEnabled === 'boolean') {
            updateData['settings.reminderSchedule.waterHourlyEnabled'] = schedule.waterHourlyEnabled;
          }

          if (typeof schedule.water === 'object' && schedule.water !== null) {
            const water = schedule.water as Record<string, unknown>;
            const startTime = typeof water.startTime === 'string' ? water.startTime : '';
            const endTime = typeof water.endTime === 'string' ? water.endTime : '';
            if (typeof water.enabled === 'boolean') {
              updateData['settings.reminderSchedule.water.enabled'] = water.enabled;
            }
            if (startTime) {
              if (!isValidTimeString(startTime)) return errorResponse('Invalid water start time', 400);
              updateData['settings.reminderSchedule.water.startTime'] = startTime;
            }
            if (endTime) {
              if (!isValidTimeString(endTime)) return errorResponse('Invalid water end time', 400);
              updateData['settings.reminderSchedule.water.endTime'] = endTime;
            }
            if (startTime && endTime) {
              const [startHour, startMinute] = startTime.split(':').map(Number);
              const [endHour, endMinute] = endTime.split(':').map(Number);
              if ((startHour * 60 + startMinute) >= (endHour * 60 + endMinute)) {
                return errorResponse('Water start time must be before end time', 400);
              }
            }
            if (water.frequencyMinutes !== undefined) {
              const frequency = Number(water.frequencyMinutes);
              if (!Number.isInteger(frequency) || frequency < 15 || frequency > 240) {
                return errorResponse('Water frequency must be an integer between 15 and 240 minutes', 400);
              }
              updateData['settings.reminderSchedule.water.frequencyMinutes'] = frequency;
              updateData['settings.reminderSchedule.waterFrequencyMinutes'] = frequency;
            }
          } else if (schedule.waterFrequencyMinutes !== undefined) {
            // Backward compatibility if client sends legacy flat key
            const frequency = Number(schedule.waterFrequencyMinutes);
            if (!Number.isInteger(frequency) || frequency < 15 || frequency > 240) {
              return errorResponse('Water frequency must be an integer between 15 and 240 minutes', 400);
            }
            updateData['settings.reminderSchedule.water.frequencyMinutes'] = frequency;
            updateData['settings.reminderSchedule.waterFrequencyMinutes'] = frequency;
          }

          if (typeof schedule.mealTimes === 'object' && schedule.mealTimes !== null) {
            const mealTimes = schedule.mealTimes as Record<string, unknown>;
            for (const keyName of ['breakfast', 'lunch', 'dinner']) {
              const timeValue = mealTimes[keyName];
              if (typeof timeValue === 'string') {
                if (timeValue && !isValidTimeString(timeValue)) {
                  return errorResponse(`Invalid ${keyName} time`, 400);
                }
                updateData[`settings.reminderSchedule.mealTimes.${keyName}`] = timeValue;
              }
            }
          }

          for (const reminderKey of ['sleepTime', 'workoutTime', 'weighInTime']) {
            const reminderValue = schedule[reminderKey];
            if (typeof reminderValue === 'string') {
              if (reminderValue && !isValidTimeString(reminderValue)) {
                return errorResponse(`Invalid ${reminderKey} value`, 400);
              }
              updateData[`settings.reminderSchedule.${reminderKey}`] = reminderValue;
            }
          }
        } else {
          updateData[`settings.${key}`] = value;
        }
      }
    }

    // Only apply body.targets if we didn't already set targets from profile formulas
    if (targets && !Object.keys(updateData).some((k) => k.startsWith('targets.'))) {
      for (const [key, value] of Object.entries(targets)) {
        updateData[`targets.${key}`] = value;
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!user) return errorResponse('User not found', 404);

    return maskedResponse(maskUser(user), { message: 'Profile updated' });
  } catch (err) {
    console.error('[User PUT Error]:', err);
    return errorResponse('Failed to update user', 500);
  }
}

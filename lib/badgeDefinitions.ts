import type { BadgeCategory } from '@/types';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
}

/** All badge definitions – single source of truth for catalog and award logic. */
export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ----- First-time -----
  { id: 'first_meal', name: 'First Meal', description: 'Logged your first meal.', icon: '🍽️', category: 'first' },
  { id: 'first_water', name: 'First Drop', description: 'Logged water for the first time.', icon: '💧', category: 'first' },
  { id: 'first_workout', name: 'First Rep', description: 'Logged your first workout.', icon: '🏋️', category: 'first' },
  { id: 'first_weight', name: 'First Weigh-In', description: 'Logged your weight for the first time.', icon: '⚖️', category: 'first' },
  { id: 'first_sleep', name: 'Dream Starter', description: 'Logged your first sleep entry.', icon: '🌙', category: 'first' },
  { id: 'first_perfect_day', name: 'Perfect Day', description: 'Logged all five: meals, water, workout, weight, and sleep in one day.', icon: '✨', category: 'first' },

  // ----- Healthy-day streaks (any) -----
  { id: 'streak_any_3', name: '3-Day Starter', description: 'Logged your health for 3 days in a row.', icon: '🔥', category: 'streak' },
  { id: 'streak_any_7', name: '7-Day Warrior', description: 'Logged your health for 7 days in a row.', icon: '💥', category: 'streak' },
  { id: 'streak_any_14', name: '14-Day Champion', description: 'Logged your health for 14 days in a row.', icon: '🏆', category: 'streak' },
  { id: 'streak_any_30', name: '30-Day Legend', description: 'Logged your health for 30 days in a row.', icon: '👑', category: 'streak' },
  { id: 'streak_any_50', name: '50-Day Titan', description: 'Logged your health for 50 days in a row.', icon: '⚡', category: 'streak' },
  { id: 'streak_any_100', name: 'Century Club', description: '100 consecutive healthy days. Elite.', icon: '💎', category: 'streak' },

  // ----- Water streaks -----
  { id: 'streak_water_14', name: 'Hydration Champion', description: 'Hit your water goal 14 days in a row.', icon: '🌊', category: 'milestone' },
  { id: 'streak_water_30', name: 'Hydration Master', description: 'Hit your water goal 30 days in a row.', icon: '💧', category: 'milestone' },
  { id: 'streak_water_50', name: 'Ocean Soul', description: 'Hit your water goal 50 days in a row.', icon: '🐋', category: 'milestone' },
  { id: 'streak_water_100', name: 'Hydration Legend', description: '100 days of meeting your water goal.', icon: '💠', category: 'milestone' },

  // ----- Calories streaks -----
  { id: 'streak_calories_7', name: 'Calorie Commander', description: 'Stayed on track with calories 7 days in a row.', icon: '🎯', category: 'milestone' },
  { id: 'streak_calories_14', name: 'Calorie Champion', description: 'Stayed on track with calories 14 days in a row.', icon: '📊', category: 'milestone' },
  { id: 'streak_calories_30', name: 'Calorie Master', description: 'Stayed on track with calories 30 days in a row.', icon: '🎖️', category: 'milestone' },
  { id: 'streak_calories_50', name: 'Calorie Titan', description: 'Stayed on track with calories 50 days in a row.', icon: '🔥', category: 'milestone' },
  { id: 'streak_calories_100', name: 'Calorie Legend', description: '100 days within your calorie target.', icon: '👑', category: 'milestone' },

  // ----- Workout streaks -----
  { id: 'streak_workout_7', name: 'Iron Will', description: 'Completed a workout 7 days in a row.', icon: '💪', category: 'milestone' },
  { id: 'streak_workout_14', name: 'Gym Regular', description: 'Worked out 14 days in a row.', icon: '🏋️', category: 'milestone' },
  { id: 'streak_workout_30', name: 'Workout Warrior', description: 'Worked out 30 days in a row.', icon: '⚔️', category: 'milestone' },
  { id: 'streak_workout_50', name: 'Workout Titan', description: 'Worked out 50 days in a row.', icon: '🦾', category: 'milestone' },
  { id: 'streak_workout_100', name: 'Workout Legend', description: '100 consecutive days with a workout.', icon: '🏅', category: 'milestone' },

  // ----- Sleep streaks -----
  { id: 'streak_sleep_7', name: 'Sleep Guardian', description: 'Met your sleep target 7 days in a row.', icon: '🛌', category: 'milestone' },
  { id: 'streak_sleep_14', name: 'Sleep Champion', description: 'Met your sleep target 14 days in a row.', icon: '🌙', category: 'milestone' },
  { id: 'streak_sleep_30', name: 'Sleep Master', description: 'Met your sleep target 30 days in a row.', icon: '😴', category: 'milestone' },
  { id: 'streak_sleep_50', name: 'Sleep Titan', description: 'Met your sleep target 50 days in a row.', icon: '⭐', category: 'milestone' },
  { id: 'streak_sleep_100', name: 'Sleep Legend', description: '100 days of meeting your sleep target.', icon: '💫', category: 'milestone' },

  // ----- Weight streaks -----
  { id: 'streak_weight_7', name: 'Scale Disciplined', description: 'Logged your weight 7 days in a row.', icon: '📈', category: 'milestone' },
  { id: 'streak_weight_14', name: 'Scale Champion', description: 'Logged your weight 14 days in a row.', icon: '📉', category: 'milestone' },
  { id: 'streak_weight_30', name: 'Scale Master', description: 'Logged your weight 30 days in a row.', icon: '⚖️', category: 'milestone' },
  { id: 'streak_weight_50', name: 'Scale Titan', description: 'Logged your weight 50 days in a row.', icon: '🎚️', category: 'milestone' },
  { id: 'streak_weight_100', name: 'Scale Legend', description: '100 consecutive days of weight logging.', icon: '🏆', category: 'milestone' },

  // ----- Protein streaks -----
  { id: 'streak_protein_7', name: 'Protein Pro', description: 'Hit your protein target 7 days in a row.', icon: '🥚', category: 'milestone' },
  { id: 'streak_protein_14', name: 'Protein Champion', description: 'Hit your protein target 14 days in a row.', icon: '🍗', category: 'milestone' },
  { id: 'streak_protein_30', name: 'Protein Master', description: 'Hit your protein target 30 days in a row.', icon: '🏆', category: 'milestone' },

  // ----- Recovery streaks -----
  { id: 'streak_recovery_7', name: 'Recovery Champion', description: 'Readiness at or above your own baseline 7 days in a row.', icon: '🔋', category: 'milestone' },
  { id: 'streak_recovery_14', name: 'Recovery Master', description: 'Readiness at or above your own baseline 14 days in a row.', icon: '⚡', category: 'milestone' },

  // ----- Best week -----
  { id: 'milestone_best_week', name: 'Best Week Ever', description: 'Your most complete training week yet - more workouts in 7 days than any week before.', icon: '🚀', category: 'milestone' },

  // ----- Milestones (totals) -----
  { id: 'milestone_meals_50', name: '50 Meals', description: 'Logged 50 meals.', icon: '🍽️', category: 'milestone' },
  { id: 'milestone_meals_100', name: '100 Meals', description: 'Logged 100 meals.', icon: '🥗', category: 'milestone' },
  { id: 'milestone_workouts_50', name: '50 Workouts', description: 'Completed 50 workouts.', icon: '💪', category: 'milestone' },
  { id: 'milestone_workouts_100', name: '100 Workouts', description: 'Completed 100 workouts.', icon: '🏆', category: 'milestone' },
  { id: 'milestone_calories_burned_10k', name: '10K Burned', description: 'Burned 10,000 calories through workouts.', icon: '🔥', category: 'milestone' },
  { id: 'milestone_sleep_50', name: '50 Nights', description: 'Logged 50 sleep entries.', icon: '🛌', category: 'milestone' },
  { id: 'milestone_weight_30', name: '30 Weigh-Ins', description: 'Logged your weight 30 times.', icon: '⚖️', category: 'milestone' },

  // ----- Challenges -----
  { id: 'challenge_weekend_warrior', name: 'Weekend Warrior', description: 'Worked out 2 days in a row on a weekend.', icon: '🏃', category: 'challenge' },
  { id: 'challenge_early_bird', name: 'Early Bird', description: 'Logged a meal before 8 AM.', icon: '🐦', category: 'challenge' },
  { id: 'challenge_night_owl', name: 'Night Owl', description: 'Logged sleep after midnight.', icon: '🦉', category: 'challenge' },
  { id: 'challenge_perfect_week', name: 'Perfect Week', description: '7 days in a row with all habits successful.', icon: '🌟', category: 'challenge' },
  { id: 'challenge_hydration_week', name: 'Hydration Week', description: 'Met your water goal every day for 7 days.', icon: '🚰', category: 'challenge' },
  { id: 'challenge_no_skip_month', name: 'No Skip Month', description: '30 consecutive healthy days.', icon: '📅', category: 'challenge' },
];

export function getAllBadgeDefinitions(): BadgeDefinition[] {
  return [...BADGE_DEFINITIONS];
}

export function getBadgeDefinition(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}

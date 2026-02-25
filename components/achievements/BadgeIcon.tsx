'use client';

import type { BadgeCategory } from '@/types';
import {
  ChallengeIcon,
  FoodIcon,
  MilestoneIcon,
  SleepIcon,
  StreakIcon,
  WaterIcon,
  WeightIcon,
  WorkoutIcon,
} from './BadgeIcons';

interface BadgeIconProps {
  badgeId: string;
  category: BadgeCategory;
  emoji: string;
  className?: string;
}

function getThemeForBadge(badgeId: string, category: BadgeCategory) {
  if (badgeId.includes('water')) return 'water';
  if (badgeId.includes('workout')) return 'workout';
  if (badgeId.includes('sleep')) return 'sleep';
  if (badgeId.includes('weight') || badgeId.includes('scale')) return 'weight';
  if (badgeId.includes('meal') || badgeId.includes('calorie') || badgeId.includes('food')) {
    return 'food';
  }

  if (category === 'streak') return 'streak';
  if (category === 'milestone') return 'milestone';
  if (category === 'challenge') return 'challenge';

  // Fallbacks for first / other
  if (badgeId.startsWith('first_')) {
    if (badgeId.includes('water')) return 'water';
    if (badgeId.includes('workout')) return 'workout';
    if (badgeId.includes('sleep')) return 'sleep';
    if (badgeId.includes('weight')) return 'weight';
    if (badgeId.includes('meal') || badgeId.includes('food')) return 'food';
  }

  return undefined;
}

export function BadgeIcon({ badgeId, category, emoji, className }: BadgeIconProps) {
  const theme = getThemeForBadge(badgeId, category);
  const sizeClass = className ?? 'h-full w-full';

  if (!theme) {
    return (
      <span className={`inline-block text-2xl leading-none ${className ?? ''}`} aria-hidden="true">
        {emoji}
      </span>
    );
  }

  switch (theme) {
    case 'water':
      return <WaterIcon className={sizeClass} />;
    case 'workout':
      return <WorkoutIcon className={sizeClass} />;
    case 'sleep':
      return <SleepIcon className={sizeClass} />;
    case 'weight':
      return <WeightIcon className={sizeClass} />;
    case 'food':
      return <FoodIcon className={sizeClass} />;
    case 'streak':
      return <StreakIcon className={sizeClass} />;
    case 'milestone':
      return <MilestoneIcon className={sizeClass} />;
    case 'challenge':
      return <ChallengeIcon className={sizeClass} />;
    default:
      return (
        <span className="inline-block text-2xl leading-none" aria-hidden="true">
          {emoji}
        </span>
      );
  }
}


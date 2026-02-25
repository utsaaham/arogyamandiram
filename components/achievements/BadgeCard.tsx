'use client';

import { cn } from '@/lib/utils';
import type { UserBadge } from '@/types';

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export function getRarityFromId(id: string): BadgeRarity {
  if (id.includes('100')) return 'legendary';
  if (id.includes('50') || id.includes('30')) return 'epic';
  if (id.includes('14') || id.includes('7')) return 'rare';
  if (id.startsWith('first_')) return 'common';
  return 'common';
}

/** Tier Roman numerals (like deck-building template TIER) */
const RARITY_TIER: Record<BadgeRarity, string> = {
  legendary: 'IV',
  epic: 'III',
  rare: 'II',
  common: 'I',
};

/** Deck-card theme: border + banner colors by rarity */
const DECK_CARD_CLASS: Record<BadgeRarity, string> = {
  legendary: 'deck-card deck-card-legendary',
  epic: 'deck-card deck-card-epic',
  rare: 'deck-card deck-card-rare',
  common: 'deck-card deck-card-common',
};

/** Banner background for NAME / TIER top row */
const DECK_BANNER_BG: Record<BadgeRarity, string> = {
  legendary: 'bg-amber-700/80 text-amber-100',
  epic: 'bg-violet-700/80 text-white',
  rare: 'bg-emerald-700/80 text-emerald-50',
  common: 'bg-emerald-800/80 text-green-100',
};

const CATEGORY_LABEL: Record<string, string> = {
  first: 'First',
  streak: 'Streak',
  milestone: 'Milestone',
  challenge: 'Challenge',
  other: 'Other',
};

interface BadgeCardProps {
  badge: UserBadge;
  locked?: boolean;
  onClick?: (badge: UserBadge) => void;
}

export function BadgeCard({ badge, locked, onClick }: BadgeCardProps) {
  const isLocked = locked ?? false;
  const rarity = getRarityFromId(badge.id);
  const deckClass = isLocked ? 'deck-card deck-card-locked' : DECK_CARD_CLASS[rarity];
  const bannerClass = isLocked ? 'bg-white/10 text-text-muted' : DECK_BANNER_BG[rarity];
  const category = badge.category || 'other';
  const typeLabel = CATEGORY_LABEL[category] ?? category;

  return (
    <div className="badge-card-wrapper">
      <button
        type="button"
        onClick={() => !isLocked && onClick?.(badge)}
        className={cn(
          'portrait-card relative flex w-full min-w-0 flex-col overflow-hidden text-left transition-all duration-200 outline-none',
          isLocked ? 'cursor-default' : 'cursor-pointer hover:opacity-95',
          deckClass
        )}
      >
        {/* Top row: NAME (left) + TIER (right) – like deck-building template */}
        <div className="flex w-full min-w-0 shrink-0 items-stretch gap-0.5 p-1 pb-0 sm:gap-1 sm:p-1.5">
          <div
            className={cn(
              'deck-banner flex min-w-0 flex-1 items-center overflow-hidden',
              bannerClass
            )}
          >
            <span className="truncate text-[8px] sm:text-[9px]">{isLocked ? '???' : badge.name}</span>
          </div>
          <div
            className={cn(
              'deck-banner flex shrink-0 items-center justify-center',
              bannerClass
            )}
          >
            {isLocked ? '?' : RARITY_TIER[rarity]}
          </div>
        </div>

        {/* TIER label row (rarity word) */}
        {!isLocked && (
          <div className="shrink-0 mt-0.5 text-center text-[8px] font-bold uppercase tracking-wider text-white/90 sm:mt-1 sm:text-[10px]">
            {rarity === 'legendary' ? 'Legendary' : rarity === 'epic' ? 'Epic' : rarity === 'rare' ? 'Rare' : 'Common'}
          </div>
        )}

        {/* Central ITEM area – icon in bordered box */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-1.5 py-0.5 sm:px-3 sm:py-2">
          <div
            className={cn(
              'deck-art-box flex w-full max-w-[56px] items-center justify-center text-xl sm:max-w-[80px] sm:text-3xl',
              isLocked ? 'text-text-muted' : 'text-white'
            )}
          >
            {isLocked ? '?' : badge.icon}
          </div>
        </div>

        {/* SHORT DESCRIPTION HERE */}
        <p className="line-clamp-2 min-h-0 shrink-0 overflow-hidden px-1 pb-1 text-center text-[9px] leading-snug text-white/80 sm:px-2 sm:pb-1.5 sm:text-[10px]">
          {badge.description}
        </p>

        {/* TYPE / ELEMENT footer */}
        <div className="deck-type-footer shrink-0 border-t border-white/10 py-0.5 text-center text-[8px] text-white/70 sm:py-1 sm:text-[10px]">
          {typeLabel}
        </div>
      </button>
    </div>
  );
}

'use client';

import { cn } from '@/lib/utils';
import type { UserBadge } from '@/types';
import { BadgeIcon } from './BadgeIcon';

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
          'portrait-card relative flex h-full w-full flex-col overflow-hidden text-left outline-none transition-all duration-200',
          isLocked ? 'cursor-default' : 'cursor-pointer hover:opacity-95',
          deckClass
        )}
      >
        {/* Top row: NAME (left) + TIER (right) – pinned to top */}
        <div className="flex w-full items-stretch gap-0.5 p-1 pb-0 sm:gap-1 sm:p-1.5">
          <div
            className={cn(
              'deck-banner flex min-w-0 flex-1 items-center truncate',
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

        {/* Middle block: rarity label, icon, description. Icon is a direct child (no wrapper). */}
        <div className="grid flex-1 grid-rows-[auto_1fr_auto] items-center gap-0 px-1.5 pt-0.5 pb-1.5 sm:px-3 sm:pt-1 sm:pb-2">
          {!isLocked && (
            <div className="text-center text-[8px] font-bold uppercase tracking-wider text-white/90 sm:text-[10px]">
              {rarity === 'legendary'
                ? 'Legendary'
                : rarity === 'epic'
                  ? 'Epic'
                  : rarity === 'rare'
                    ? 'Rare'
                    : 'Common'}
            </div>
          )}

          {isLocked ? (
            <span className="mx-auto flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24 text-3xl leading-none text-text-muted">
              ?
            </span>
          ) : (
            <span className="mx-auto flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
              <BadgeIcon
                badgeId={badge.id}
                category={badge.category}
                emoji={badge.icon}
                className="h-12 w-12 sm:h-14 sm:w-14"
              />
            </span>
          )}

          <p className="mt-1 line-clamp-2 text-center text-[9px] leading-snug text-white/80 sm:text-[10px]">
            {badge.description}
          </p>
        </div>

        {/* TYPE / ELEMENT footer – pinned to bottom */}
        <div className="deck-type-footer border-t border-white/10 py-0.5 text-center text-[8px] text-white/70 sm:py-1 sm:text-[10px]">
          {typeLabel}
        </div>
      </button>
    </div>
  );
}

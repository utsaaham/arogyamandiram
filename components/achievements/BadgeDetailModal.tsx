'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserBadge } from '@/types';
import { BadgeCard, getRarityFromId } from './BadgeCard';

const RARITY_BLURB: Record<string, string> = {
  legendary: 'One of the hardest badges to earn. You’re in the top tier.',
  epic: 'A serious commitment. Few reach this level.',
  rare: 'Shows real consistency. Keep it up.',
  common: 'Every journey starts here. Great start.',
};

interface BadgeDetailModalProps {
  badge: UserBadge | null;
  onClose: () => void;
}

export function BadgeDetailModal({ badge, onClose }: BadgeDetailModalProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    // Reset flip state when a new badge is opened
    setIsFlipped(false);
  }, [badge?.id]);

  if (!badge) return null;

  const rarity = getRarityFromId(badge.id);
  const rarityLabel = rarity === 'legendary' ? 'Legendary' : rarity === 'epic' ? 'Epic' : rarity === 'rare' ? 'Rare' : 'Common';
  const blurb = RARITY_BLURB[rarity] ?? '';
  const firstEarnedDate = badge.firstEarnedAt ?? badge.earnedAt;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6 sm:py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-detail-title"
    >
      <div
        className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Close button floating above the overlay so it is easy to reach on all devices */}
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-[90] rounded-lg bg-black/60 p-1.5 text-text-muted shadow-md transition-colors hover:bg-black/80 hover:text-text-primary"
        aria-label="Close badge details"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Card container – front = premium BadgeCard, back = details view */}
      <div className="relative z-[80] w-full max-w-xs sm:max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div
          className="badge-card-wrapper cursor-pointer select-none"
          onClick={() => setIsFlipped((prev) => !prev)}
        >
          {!isFlipped ? (
            <BadgeCard badge={badge} />
          ) : (
            <div className="portrait-card deck-card deck-card-detail-back flex flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-bg-elevated/95 px-3 py-3 text-left text-xs text-text-primary sm:px-4 sm:py-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary sm:text-base">
                    {badge.name}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-text-muted">
                    {rarityLabel} · {badge.category ?? 'Badge'}
                  </p>
                </div>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
                    rarity === 'legendary' && 'bg-amber-500/15 text-amber-100',
                    rarity === 'epic' && 'bg-accent-violet/20 text-white',
                    rarity === 'rare' && 'bg-emerald-500/20 text-emerald-100',
                    rarity === 'common' && 'bg-white/10 text-text-secondary'
                  )}
                >
                  {rarityLabel}
                </span>
              </div>

              {blurb && (
                <p className="mb-2 text-[11px] leading-relaxed text-text-muted">
                  {blurb}
                </p>
              )}
              <p className="text-[11px] leading-relaxed text-text-secondary">
                {badge.description}
              </p>

              {firstEarnedDate && (
                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-white/10 pt-2 text-[11px] text-text-muted sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary/80">
                      First earned
                    </p>
                    <p className="mt-0.5">
                      {new Date(firstEarnedDate).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  {badge.earnedAt && badge.earnedAt !== firstEarnedDate && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-secondary/80">
                        Latest refresh
                      </p>
                      <p className="mt-0.5">
                        {new Date(badge.earnedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserBadge } from '@/types';
import { getRarityFromId } from './BadgeCard';

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
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!badge) return null;

  const rarity = getRarityFromId(badge.id);
  const rarityLabel = rarity === 'legendary' ? 'Legendary' : rarity === 'epic' ? 'Epic' : rarity === 'rare' ? 'Rare' : 'Common';
  const blurb = RARITY_BLURB[rarity] ?? '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-detail-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={cn(
          'relative w-full max-w-sm rounded-2xl border p-6 shadow-2xl',
          'bg-bg-elevated border-white/[0.08]'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-text-muted transition-colors hover:bg-white/10 hover:text-text-primary"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-black/40 text-4xl">
            {badge.icon}
          </div>
          <h2 id="badge-detail-title" className="text-xl font-bold text-text-primary">
            {badge.name}
          </h2>
          <p className="mt-2 text-sm text-text-muted">{badge.description}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold uppercase',
                rarity === 'legendary' && 'bg-amber-500/20 text-amber-200',
                rarity === 'epic' && 'bg-accent-violet/20 text-white',
                rarity === 'rare' && 'bg-emerald-500/20 text-emerald-100',
                rarity === 'common' && 'bg-white/10 text-text-secondary'
              )}
            >
              {rarityLabel}
            </span>
          </div>
          {blurb && (
            <p className="mt-3 text-xs text-text-muted">{blurb}</p>
          )}
          {badge.earnedAt && (
            <p className="mt-2 text-[11px] text-text-muted">
              Earned {new Date(badge.earnedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Flame, Star, Trophy } from 'lucide-react';
import { useAchievements } from '@/hooks/useAchievements';
import { getAllBadgeDefinitions } from '@/lib/badgeDefinitions';
import { StreakBar } from '@/components/achievements/StreakBar';
import { BadgeGrid } from '@/components/achievements/BadgeGrid';
import { BadgeDetailModal } from '@/components/achievements/BadgeDetailModal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import type { UserBadge } from '@/types';
import { getLevelProgress, BASE_LEVEL_XP } from '@/lib/level';

export default function AchievementsPage() {
  const { achievements, loading, error, newlyEarnedBadges } = useAchievements();
  const [mounted, setMounted] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  useEffect(() => setMounted(true), []);

  const isLoading = loading || !mounted;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <CardSkeleton className="h-28" />
        <CardSkeleton className="h-64" />
      </div>
    );
  }

  const streaks = achievements?.streaks;
  const badges = achievements?.badges ?? [];

  const totalBadges = badges.length;
  const bestLoggingStreak = streaks?.best.logging ?? 0;
  const loggingStreak = streaks?.current.logging ?? 0;

  // XP/Level from server-side lifetime XP.
  const xpTotal = achievements?.xpTotal ?? 0;
  const { level, xpIntoLevel, xpPercent, xpForCurrentLevel } = getLevelProgress(xpTotal);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="glass-card relative overflow-hidden rounded-3xl border border-accent-violet/40 bg-gradient-to-r from-accent-violet/20 via-transparent to-accent-emerald/10 p-5 sm:p-6">
        <div className="pointer-events-none absolute -left-10 top-6 h-32 w-32 rounded-full bg-accent-violet/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-accent-emerald/8 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
              <Trophy className="h-6 w-6 text-accent-violet" />
              Achievements
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Turn your healthy routines into a streak of wins.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs sm:text-[11px]">
            <div className="glass-card-elevated flex flex-col gap-1 rounded-2xl px-3 py-2">
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                <Star className="h-3 w-3 text-accent-emerald" />
                Level
              </span>
              <span className="text-sm font-semibold text-text-primary">Lv {level}</span>
              <span className="text-[10px] text-text-muted">
                XP {xpIntoLevel}/{xpForCurrentLevel || BASE_LEVEL_XP}
              </span>
            </div>
            <div className="glass-card-elevated flex flex-col gap-1 rounded-2xl px-3 py-2">
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                <Trophy className="h-3 w-3 text-accent-violet" />
                Badges
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {totalBadges}
              </span>
              <span className="text-[10px] text-text-muted">Unlocked</span>
            </div>
            <div className="glass-card-elevated flex flex-col gap-1 rounded-2xl px-3 py-2">
              <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-text-muted">
                <Flame className="h-3 w-3 text-accent-amber" />
                Best streak
              </span>
              <span className="text-sm font-semibold text-text-primary">
                {bestLoggingStreak}d
              </span>
              <span className="text-[10px] text-text-muted">
                Current {loggingStreak}d
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-black/40">
          <div
            className="h-full rounded-full bg-accent-violet transition-all duration-500"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-accent-rose/40 bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <StreakBar streaks={streaks} />
        <p className="text-[11px] text-text-muted">
          {loggingStreak >= 7
            ? 'Keep your streak alive to climb to the next badge tier.'
            : `Just ${Math.max(1, 7 - loggingStreak)} day${Math.max(1, 7 - loggingStreak) === 1 ? '' : 's'} away from your first 7-day streak badge.`}
        </p>
      </div>

      {newlyEarnedBadges.length > 0 && (
        <div className="glass-card rounded-2xl p-4 animate-card-pop">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-emerald">
            New this week
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {newlyEarnedBadges.slice(0, 3).map((badge) => (
              <div key={badge.id} className="relative animate-card-pop">
                <div className="absolute inset-0 rounded-2xl bg-accent-emerald/15 blur-xl" />
                <div className="relative">
                  <div className="glass-card card-pressable flex flex-col rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="flame-active flex h-9 w-9 items-center justify-center rounded-xl bg-accent-emerald/30 text-xl">
                        <span>{badge.icon}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-text-primary">
                          {badge.name}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-xs text-text-muted">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className="space-y-3 overflow-visible">
        <h2 className="text-sm font-semibold text-text-primary">Badge collection</h2>
        <BadgeGrid
          allDefinitions={getAllBadgeDefinitions()}
          earnedBadges={badges}
          onBadgeClick={setSelectedBadge}
        />
      </section>

      <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
    </div>
  );
}


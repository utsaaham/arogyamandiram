'use client';

import { useEffect, useState } from 'react';
import { Flame, Star, Trophy } from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import { useAchievements } from '@/hooks/useAchievements';
import { getAllBadgeDefinitions } from '@/lib/badgeDefinitions';
import { cn } from '@/lib/utils';
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
  const xpTarget = xpForCurrentLevel || BASE_LEVEL_XP;

  return (
    <div className="achievements-page animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop">
      <DashboardPageShell
        title="Achievements"
        subtitle="Turn your healthy routines into a streak of wins."
        icon={Trophy}
        iconClassName="text-text-primary"
        mobileVariant="card"
      />

      <div className="mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '80ms' }}>
        <div className="glass-card achievements-gold-card relative rounded-2xl p-5 sm:p-6">
          <div className="relative z-10 flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3 text-xs sm:text-[11px]">
              {/* Level */}
              <div className="relative flex flex-col items-center rounded-xl border border-white/10 bg-black/40 px-4 py-3 overflow-hidden transition-all duration-200 hover:border-white/20 hover:bg-white/[0.04] hover:-translate-y-0.5">
                <span className="flex w-full items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-text-muted text-center">
                  <Star className="h-3 w-3 text-[#f5d76e]" />
                  Level
                </span>
                <span className="mt-2 w-full text-center text-[22px] font-extrabold leading-none tracking-tight text-text-primary">
                  <span className="hidden sm:inline">Lv {level}</span>
                  <span className="inline sm:hidden">{level}</span>
                </span>
              </div>

              {/* Badges */}
              <div className="relative flex flex-col items-center rounded-xl border border-white/10 bg-black/40 px-4 py-3 overflow-hidden transition-all duration-200 hover:border-white/20 hover:bg-white/[0.04] hover:-translate-y-0.5">
                <span className="flex w-full items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-text-muted text-center">
                  <Trophy className="h-3 w-3 text-[#f5d76e]" />
                  Badges
                </span>
                <span className="mt-2 hidden w-full text-center text-[22px] font-extrabold leading-none tracking-tight text-text-primary sm:inline">
                  {totalBadges}
                </span>
                <span className="mt-1 hidden w-full text-center text-[11px] text-text-secondary sm:inline">
                  Unlocked
                </span>
                <span className="mt-2 inline w-full text-center text-[22px] font-extrabold leading-none tracking-tight text-text-primary sm:hidden">
                  {totalBadges}
                </span>
              </div>

              {/* Best active */}
              <div className="relative flex flex-col items-center rounded-xl border border-white/10 bg-black/40 px-4 py-3 overflow-hidden transition-all duration-200 hover:border-white/20 hover:bg-white/[0.04] hover:-translate-y-0.5">
                <span className="flex w-full items-center justify-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-text-muted text-center">
                  <Flame className="h-3 w-3 text-[#f5d76e]" />
                  <span className="hidden sm:inline">Best active</span>
                  <span className="inline sm:hidden">Active</span>
                </span>
                <span className="mt-2 w-full text-center text-[22px] font-extrabold leading-none tracking-tight text-text-primary">
                  {bestLoggingStreak}
                </span>
                <span className="mt-1 w-full text-center text-[11px] text-text-secondary hidden sm:inline">
                  Active days record
                </span>
              </div>
            </div>

            {/* XP footer progress – matches reference: gold bar, gold text, full width */}
            <div className="mt-2 border-t border-white/10 pt-3">
              <div className="flex w-full items-center gap-3">
                <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-text-muted whitespace-nowrap">
                  XP to Lv {level}
                </span>
                <div className="h-[2px] flex-1 min-w-0 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full achievements-gold-gradient-bg transition-all duration-500"
                    style={{ width: `${xpPercent}%` }}
                  />
                </div>
                <span className="whitespace-nowrap text-[11px] font-medium text-[#d4a550]">
                  {xpIntoLevel} / {xpTarget}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mobile-fade-up mobile-dash-px lg:px-0 rounded-xl border border-accent-rose/40 bg-accent-rose/5 px-3 py-2 text-xs text-accent-rose">
          <div className="relative z-10">{error}</div>
        </div>
      )}

      <div className="mobile-fade-up mobile-dash-px lg:px-0 space-y-2" style={{ animationDelay: '160ms' }}>
        <div className="relative rounded-2xl achievements-gold-card">
          <StreakBar streaks={streaks} />
        </div>
        <p className="text-[11px] text-text-muted">
          {loggingStreak >= 7
            ? 'Keep your active-day streak alive to climb to the next badge tier.'
            : `Just ${Math.max(1, 7 - loggingStreak)} active day${Math.max(1, 7 - loggingStreak) === 1 ? '' : 's'} away from your first 7-day streak badge.`}
        </p>
      </div>

      {newlyEarnedBadges.length > 0 && (
        <div className="mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '240ms' }}>
        <div className="glass-card achievements-gold-card rounded-2xl p-4 animate-card-pop relative">
          <div className="relative z-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-text-primary">
            New this week
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {newlyEarnedBadges.slice(0, 3).map((badge) => (
              <div key={badge.id} className="relative animate-card-pop">
                <div className="relative">
                  <div className="glass-card card-pressable flex flex-col rounded-2xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.08] text-xl">
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
        </div>
        </div>
      )}

      <section className={cn('mobile-fade-up mobile-dash-px lg:px-0 space-y-3 overflow-visible')} style={{ animationDelay: '320ms' }}>
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


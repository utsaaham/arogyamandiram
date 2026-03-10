'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProgressRing from '@/components/ui/ProgressRing';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import { useAchievements } from '@/hooks/useAchievements';
import {
  getGreeting,
  formatWater,
  formatNumber,
  calcPercent,
  getToday,
  formatDate,
  cn,
} from '@/lib/utils';
import { getLevelProgress, BASE_LEVEL_XP } from '@/lib/level';
import { getTargetsForUser } from '@/lib/health';
import { BadgeCard } from '@/components/achievements/BadgeCard';
import { BadgeDetailModal } from '@/components/achievements/BadgeDetailModal';
import StatMini from '@/components/ui/StatMini';
import { Droplets, Flame, Moon, Utensils } from 'lucide-react';
import type { UserBadge } from '@/types';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Mobile design colors (TopBar-style uses teal #14dcb4) */
const M_COLORS = {
  green: '#00e5a0',
  teal: '#14dcb4',
  purple: '#8b78ff',
  orange: '#f5a623',
  red: '#ff5c7c',
  muted: '#5a6677',
  text: '#f0f4f8',
} as const;


export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { log, loading: logLoading } = useDailyLog();
  const { achievements } = useAchievements();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const loading = userLoading || logLoading || !mounted;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CardSkeleton className="h-64 lg:col-span-2" />
          <CardSkeleton className="h-64" />
        </div>
      </div>
    );
  }

  const targets = getTargetsForUser(user ?? undefined);
  const totalCal = log?.totalCalories || 0;
  const burned = log?.caloriesBurned || 0;
  const remaining = Math.max(targets.dailyCalories - totalCal, 0);
  const calPercent = calcPercent(totalCal, targets.dailyCalories);
  const meals = log?.meals || [];
  const today = getToday();

  const xpTotal = achievements?.xpTotal ?? 0;
  const loggingStreak = achievements?.streaks.current.logging ?? 0;
  const { level, xpIntoLevel, xpPercent, xpForCurrentLevel } = getLevelProgress(xpTotal);

  const earnedBadges = achievements?.badges ?? [];
  const earnedById = new Map<string, UserBadge>();
  for (const b of earnedBadges) earnedById.set(b.id, b);

  const todayDayIndex = new Date().getDay();
  const displayDayIndex = todayDayIndex === 0 ? 6 : todayDayIndex - 1;

  const userName = user?.profile?.name ? user.profile.name.split(' ')[0] : '';

  return (
    <div className="animate-fade-in">
      {/* ─── Desktop / iPad (lg+) ─── */}
      <div className="hidden flex-col gap-6 lg:flex">
        {/* Top row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-[32px] font-normal tracking-[0.03em] leading-none text-text-primary">
              {getGreeting()}
              {userName ? `, ${userName}` : ''} 👋
            </h1>
            <p className="font-body mt-1.5 text-[13px] text-text-muted">
              {formatDate(today)} · Let&apos;s make today count.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5">
            <span className="font-heading text-xl tracking-[0.03em] text-accent-violet">LV {level}</span>
            <div className="h-1.5 w-[110px] overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-violet/80 transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <span className="font-body text-[11px] text-text-muted whitespace-nowrap">
              {xpIntoLevel} / {xpForCurrentLevel || BASE_LEVEL_XP} XP
            </span>
          </div>
        </div>

        {/* Bento grid */}
        <div className="bento-grid">
          {/* Ring + 4 stat cards in 2x2 */}
          <div className="bento-ring-stats">
            {/* Calorie ring spans 2 rows */}
            <div className="bento-ring">
              <div className="glass-card ring-card card-glow">
                <div className="ring-wrap">
                <ProgressRing
                  progress={calPercent}
                  size={200}
                  strokeWidth={12}
                  color="stroke-accent-emerald"
                  bgColor="stroke-white/[0.06]"
                  value={formatNumber(Math.round(totalCal))}
                  label="kcal"
                  valueClassName="font-heading text-4xl font-normal tracking-[0.03em] text-text-primary"
                  labelClassName="font-body text-xs font-medium text-text-muted"
                />
                </div>
                <p className="text-center text-sm text-text-muted leading-relaxed font-body">
                  <span className="font-semibold text-accent-emerald">{formatNumber(Math.round(remaining))} remaining</span>
                  <br />
                  of {formatNumber(targets.dailyCalories)} kcal goal
                </p>
              </div>
            </div>

            {/* Recent Badges — same size as achievement badges, 5 most recent */}
            <div className="bento-ring-badges min-h-0">
              <RecentBadges earnedBadges={earnedBadges} />
            </div>
          </div>

          {/* Macros */}
          <div className="bento-macro">
            <MacroCard
              protein={log?.totalProtein || 0}
              carbs={log?.totalCarbs || 0}
              fat={log?.totalFat || 0}
              fiber={log?.totalFiber || 0}
              sugar={log?.totalSugar || 0}
              sodium={log?.totalSodium || 0}
              targets={targets}
            />
          </div>

          {/* Water, Burn, Meals, Sleep — stat cards (each with section shade) */}
          <div className="bento-stats-cards">
            <div className="stat-card-water">
              <StatMini
                icon={<Droplets className="h-6 w-6" strokeWidth={1.8} />}
                value={formatWater(log?.waterIntake || 0)}
                label="Water"
                sub="2.5 L target"
                valueColor="text-accent-cyan"
                iconBg="bg-accent-cyan/15"
                compact
              />
            </div>
            <div className="stat-card-burned">
              <StatMini
                icon={<Flame className="h-6 w-6" strokeWidth={1.8} />}
                value={formatNumber(Math.round(burned))}
                label="Burned"
                sub={`${log?.workouts?.length || 0} workouts`}
                valueColor="text-accent-rose"
                iconBg="bg-accent-rose/15"
                compact
              />
            </div>
            <div className="stat-card-meals">
              <StatMini
                icon={<Utensils className="h-6 w-6" strokeWidth={1.8} />}
                value={String(meals.length)}
                label="Meals"
                sub={`${formatNumber(Math.round(totalCal))} kcal`}
                valueColor="text-accent-amber"
                iconBg="bg-accent-amber/15"
                compact
              />
            </div>
            <div className="stat-card-sleep">
              <StatMini
                icon={<Moon className="h-6 w-6" strokeWidth={1.8} />}
                value={log?.sleep ? `${log.sleep.duration.toFixed(1)}h` : '—'}
                label="Sleep"
                sub={log?.sleep ? `${log.sleep.quality}/5 quality` : '8h target'}
                valueColor="text-accent-violet"
                iconBg="bg-accent-violet/15"
                compact
              />
            </div>
          </div>

          {/* Streaks */}
          <div className="bento-streaks">
            <StreakCard
              streaks={achievements?.streaks}
              displayDayIndex={displayDayIndex}
              loggingStreak={loggingStreak}
            />
          </div>
        </div>
      </div>

      {/* ─── Mobile (design layout) ─── */}
      <div className="mobile-dash cards-stack-mobile lg:hidden">
        {/* Header — TopBar-style card */}
        <div className={cn('mobile-fade-up mobile-dash-px pt-0 pb-3')} style={{ animationDelay: '0ms' }}>
          <div
            className="card-glow relative w-full overflow-hidden rounded-[22px] px-5 pt-5 pb-[18px]"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
          >
            {/* Row 1: Greeting + Avatar — T centered with left text block */}
            <div className="flex justify-between items-center">
              <div className="min-w-0 flex-1">
                <p className="m-0 text-white text-[22px] font-extrabold leading-tight" style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
                  {getGreeting()}
                </p>
                <p className="m-0 mt-0.5 text-white text-[22px] font-extrabold leading-tight" style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
                  {userName || 'Guest'} 👋
                </p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: M_COLORS.teal, boxShadow: `0 0 6px ${M_COLORS.teal}` }}
                  />
                  <span className="text-[9.5px] font-bold tracking-[0.14em]" style={{ color: M_COLORS.teal }}>
                    AROGYAMANDIRAM
                  </span>
                </div>
                <p className="mt-1 text-[11px]" style={{ color: '#3a4460' }}>
                  {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              </div>

              {/* Avatar — larger, shifted slightly left */}
              <Link href="/settings" className="shrink-0 active:opacity-90 transition-opacity -translate-x-3" aria-label="Open settings">
                <div
                  className="w-[76px] h-[76px] rounded-full flex items-center justify-center text-[24px] font-black text-[#e8f0ff]"
                  style={{ background: '#1a2035' }}
                >
                  {(userName || 'Guest').charAt(0).toUpperCase()}
                </div>
              </Link>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/[0.06]" style={{ marginTop: 16, marginBottom: 14 }} />

            {/* XP Bar */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-[11px]" style={{ color: '#3a4460' }}>
                  {loggingStreak >= 7 ? 'Building momentum' : 'Getting started'}
                </span>
                <span className="text-[11px] font-bold" style={{ color: M_COLORS.teal }}>
                  {xpIntoLevel} / {xpForCurrentLevel || BASE_LEVEL_XP} XP
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${xpPercent}%`,
                    background: 'linear-gradient(90deg, #14dcb4, #00aaff)',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Calorie ring card */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '80ms' }}>
          <div className="m-calorie-card card-glow">
            <div className="m-calorie-inner">
              <div>
                <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-text-muted mb-2">Today&apos;s Calories</div>
                <div className="text-[52px] font-extrabold leading-none tracking-[-0.04em] text-text-primary" style={{ fontFamily: 'var(--font-outfit), system-ui, sans-serif' }}>
                  {formatNumber(Math.round(totalCal))}
                </div>
                <div className="text-[13px] text-text-muted mt-1">kcal consumed</div>
                <div className="flex items-center gap-1.5 mt-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: M_COLORS.green }} />
                  <span className="font-bold text-[15px]" style={{ color: M_COLORS.green }}>{formatNumber(Math.round(remaining))}</span>
                  <span className="text-[13px] text-text-muted">kcal remaining</span>
                </div>
                <div className="text-[11.5px] text-text-muted mt-0.5">of {formatNumber(targets.dailyCalories)} kcal goal</div>
              </div>
              <div className="m-calorie-ring-wrap">
                <MobileCalorieRing value={totalCal} max={targets.dailyCalories} size={120} strokeWidth={10} />
                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                  <span className="text-[13px] font-extrabold" style={{ color: M_COLORS.green }}>
                    {Math.round(calPercent)}%
                  </span>
                </div>
              </div>
            </div>
            <div className="m-calorie-macros">
              <MacroBar label="Protein" value={log?.totalProtein ?? 0} max={targets.protein} color={M_COLORS.purple} unit="g" />
              <MacroBar label="Carbs" value={log?.totalCarbs ?? 0} max={targets.carbs} color={M_COLORS.orange} unit="g" />
              <MacroBar label="Fat" value={log?.totalFat ?? 0} max={targets.fat} color={M_COLORS.red} unit="g" />
              <MacroBar label="Sugar" value={log?.totalSugar ?? 0} max={50} color="#ff9f43" unit="g" />
              <MacroBar label="Sodium" value={log?.totalSodium ?? 0} max={2300} color="#54a0ff" unit="mg" />
            </div>
          </div>
        </div>

        {/* Quick stats 2x2 – two-line value + label on mobile (each with section shade) */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '160ms' }}>
          <div className="m-stats-grid">
            <div className="stat-card-water">
              <StatMini
                icon={<Droplets className="h-8 w-8" strokeWidth={1.8} />}
                value={formatWater(log?.waterIntake || 0)}
                label="Water"
                sub="of 2.5 L target"
                valueColor="text-accent-cyan"
                iconBg="bg-accent-cyan/15"
                stackLabel
              />
            </div>
            <div className="stat-card-burned">
              <StatMini
                icon={<Flame className="h-8 w-8" strokeWidth={1.8} />}
                value={formatNumber(Math.round(burned))}
                label="Burned"
                sub={`${log?.workouts?.length || 0} workouts`}
                valueColor="text-accent-rose"
                iconBg="bg-accent-rose/15"
                stackLabel
              />
            </div>
            <div className="stat-card-meals">
              <StatMini
                icon={<Utensils className="h-8 w-8" strokeWidth={1.8} />}
                value={String(meals.length)}
                label="Meals"
                sub={`${formatNumber(Math.round(totalCal))} kcal logged`}
                valueColor="text-accent-amber"
                iconBg="bg-accent-amber/15"
                stackLabel
              />
            </div>
            <div className="stat-card-sleep">
              <StatMini
                icon={<Moon className="h-8 w-8" strokeWidth={1.8} />}
                value={log?.sleep ? `${log.sleep.duration.toFixed(1)}h` : '—'}
                label="Sleep"
                sub="of 8h target"
                valueColor="text-accent-violet"
                iconBg="bg-accent-violet/15"
                stackLabel
              />
            </div>
          </div>
        </div>

        {/* Recent Badges – same 5 BadgeCards as desktop/achievements */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '240ms' }}>
          <RecentBadges earnedBadges={earnedBadges} />
        </div>

        {/* Active Streaks – same StreakCard as desktop */}
        <div className={cn('mobile-fade-up mobile-dash-px')} style={{ animationDelay: '320ms' }}>
          <StreakCard
            streaks={achievements?.streaks}
            displayDayIndex={displayDayIndex}
            loggingStreak={loggingStreak}
          />
        </div>
      </div>
    </div>
  );
}

function MacroCard({
  protein,
  carbs,
  fat,
  fiber,
  sugar,
  sodium,
  targets,
}: {
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
  targets: { protein: number; carbs: number; fat: number };
}) {
  const pctP = targets.protein > 0 ? Math.min(100, (protein / targets.protein) * 100) : 0;
  const pctC = targets.carbs > 0 ? Math.min(100, (carbs / targets.carbs) * 100) : 0;
  const pctF = targets.fat > 0 ? Math.min(100, (fat / targets.fat) * 100) : 0;
  const pctFib = 25 > 0 ? Math.min(100, (fiber / 25) * 100) : 0;
  const pctSug = 50 > 0 ? Math.min(100, (sugar / 50) * 100) : 0;
  const pctSod = 2300 > 0 ? Math.min(100, (sodium / 2300) * 100) : 0;

  return (
    <div className="macro-card card-glow">
      <div className="mb-4 flex items-center justify-between">
        <span className="macro-title">
          Today&apos;s Macros
        </span>
        <Link href="/food" className="font-body text-sm font-medium text-accent-violet hover:underline">
          Details →
        </Link>
      </div>
      <div className="macro-scroll">
        <div className="macro-col">
          <MacroCol label="Protein" current={protein} target={targets.protein} pct={pctP} color="accent-violet" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Carbs" current={carbs} target={targets.carbs} pct={pctC} color="accent-amber" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Fat" current={fat} target={targets.fat} pct={pctF} color="accent-rose" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Fiber" current={fiber} target={25} pct={pctFib} color="accent-emerald" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Sugar" current={sugar} target={50} pct={pctSug} color="#f5a623" unit="g" />
        </div>
        <div className="macro-col">
          <MacroCol label="Sodium" current={sodium} target={2300} pct={pctSod} color="#3aabff" unit="mg" />
        </div>
      </div>
    </div>
  );
}

const MACRO_COLORS: Record<string, string> = {
  'accent-violet': 'linear-gradient(90deg,#8b5cf6,#4c1d95)',
  'accent-amber': 'linear-gradient(90deg,#e8a800,#ffc94a)',
  'accent-rose': 'linear-gradient(90deg,#d93a55,#ff4f6b)',
  'accent-emerald': 'linear-gradient(90deg,#10b981,#065f46)',
  '#f5a623': 'linear-gradient(90deg,#f5a623,#e89510)',
  '#3aabff': 'linear-gradient(90deg,#3aabff,#2a8bd9)',
};

function MacroCol({
  label,
  current,
  target,
  pct,
  color,
  unit = 'g',
}: {
  label: string;
  current: number;
  target: number;
  pct: number;
  color: string;
  unit?: string;
}) {
  const barBg = color.startsWith('#')
    ? color
    : (MACRO_COLORS[color] ?? MACRO_COLORS['accent-violet']);
  const displayTarget = unit === 'mg' ? `${Math.round(target)}mg` : `${Math.round(target)}g`;
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex justify-between text-sm text-text-muted">
        <span className="font-body font-medium">{label}</span>
        <span className="font-heading text-base tracking-[0.03em] text-text-primary">
          {Math.round(current)}/{displayTarget}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: barBg }}
        />
      </div>
    </div>
  );
}

/** Recent Badges: 5 most recently earned, same size as achievement page badges (BadgeCard). */
function RecentBadges({ earnedBadges }: { earnedBadges: UserBadge[] }) {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);
  const recent = [...earnedBadges]
    .sort((a, b) => (b.earnedAt || '').localeCompare(a.earnedAt || ''))
    .slice(0, 5);

  return (
    <div className="glass-card recent-badges-card card-glow flex h-full min-h-0 flex-col">
      <div className="mb-2 flex shrink-0 items-center justify-between">
        <span className="font-body text-[11px] font-medium uppercase tracking-wider text-text-muted">
          Recent Badges
        </span>
        <Link href="/achievements" className="font-body text-xs font-medium text-accent-violet hover:underline">
          View all →
        </Link>
      </div>
      <div className="recent-badges-grid min-h-0 flex-1">
        {recent.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            locked={false}
            onClick={() => setSelectedBadge(badge)}
          />
        ))}
      </div>
      {selectedBadge && (
        <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </div>
  );
}

function StreakCard({
  streaks: _streaks,
  displayDayIndex,
  loggingStreak,
}: {
  streaks?: { current?: { logging?: number }; best?: { logging?: number } } | null;
  displayDayIndex: number;
  loggingStreak: number;
}) {
  const active = loggingStreak > 0;

  return (
    <div className="streak-card card-glow">
      <p className="mb-3 text-[11px] font-medium uppercase tracking-wider text-text-muted">
        Active Streaks
      </p>
      <div className="mb-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-4 text-center">
        <p className="streak-value">
          {active ? `${loggingStreak} day streak` : 'No active streaks'}
        </p>
        <p className="mt-0.5 text-xs text-text-muted opacity-70">
          {active ? 'Keep it up!' : 'Log today to start one.'}
        </p>
      </div>
      <p className="mb-3 text-xs text-text-muted leading-relaxed">
        Just <span className="font-semibold text-accent-violet">7 active days</span> away from your first 7-day
        streak badge.
      </p>
      <div className="flex gap-1.5">
        {DAY_LABELS.map((lbl, i) => (
          <div key={i} className={`sdot ${i === displayDayIndex ? 'sdot-today' : ''}`}>
            {lbl}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile-only components (design layout) ───

function MobileCalorieRing({ value, max, size = 120, strokeWidth = 10 }: { value: number; max: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <svg width={size} height={size} className="rotate-[-90deg]" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="mobileRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e5a0" />
          <stop offset="100%" stopColor="#00b4d8" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#mobileRingGrad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - animated)}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

function MacroBar({ label, value, max, color, unit = 'g' }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 200);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="mb-3.5">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-[12px] font-medium tracking-[0.04em] uppercase text-text-muted">{label}</span>
        <span className="text-[12px] font-bold text-text-primary">
          <span style={{ color }}>{Math.round(value)}</span>
          <span className="text-text-muted"> / {Math.round(max)}{unit === 'mg' ? 'mg' : unit}</span>
        </span>
      </div>
      <div className="macro-bar-track">
        <div
          className="macro-bar-fill"
          style={{
            width: `${w}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}50`,
          }}
        />
      </div>
    </div>
  );
}


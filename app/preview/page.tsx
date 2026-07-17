'use client';

import { useState } from 'react';
import ProgressRing from '@/components/ui/ProgressRing';
import WaterGlass from '@/components/water/WaterGlass';
import { BadgeCard } from '@/components/achievements/BadgeCard';
import { BadgeDetailModal } from '@/components/achievements/BadgeDetailModal';
import { StreakCard as AchievementStreakCard } from '@/components/achievements/StreakCard';
import StatMini from '@/components/ui/StatMini';
import {
  LayoutGrid, Moon, Droplets, Utensils, Dumbbell, Scale, Star,
  CalendarDays, CheckSquare, Activity, Bug, Settings, Code2,
  Flame, HeartPulse, Footprints, MapPin, LogOut,
} from 'lucide-react';
import type { UserBadge } from '@/types';

/* ── Mock data ── */
const MOCK_BADGES: UserBadge[] = [
  { id: 'milestone_workouts_50',  name: '50 Workouts',  description: 'Completed 50 workouts.',        icon: '🏋️', category: 'milestone', earnedAt: '2026-04-10' },
  { id: 'milestone_meals_100',    name: '100 Meals',    description: 'Logged 100 meals.',              icon: '🍽',  category: 'milestone', earnedAt: '2026-04-08' },
  { id: 'milestone_meals_50',     name: '50 Meals',     description: 'Logged 50 meals.',               icon: '🍽',  category: 'milestone', earnedAt: '2026-04-05' },
  { id: 'first_meal',             name: 'First Meal',   description: 'Logged your first meal.',        icon: '🍳',  category: 'first',     earnedAt: '2026-03-11' },
  { id: 'first_water',            name: 'First Drop',   description: 'Logged water for the first time.',icon: '💧', category: 'first',     earnedAt: '2026-03-10' },
];

const NAV_ITEMS = [
  { href: '/home',    icon: LayoutGrid,    label: 'Home',         active: true },
  { href: '/sleep',        icon: Moon,          label: 'Sleep' },
  { href: '/water',        icon: Droplets,      label: 'Water' },
  { href: '/food',         icon: Utensils,      label: 'Food' },
  { href: '/workout',      icon: Dumbbell,      label: 'Workout' },
  { href: '/weight',       icon: Scale,         label: 'Weight' },
  { href: '/achievements', icon: Star,          label: 'Achievements' },
  { href: '/todays-plan',  icon: CalendarDays,  label: 'Checklist' },
  { href: '/todos',        icon: CheckSquare,   label: 'Todos' },
  { href: '/debug',        icon: Bug,           label: 'Debugger' },
];

const BOTTOM_NAV = [
  { href: '/project',  icon: Code2,    label: 'Project' },
  { href: '/settings', icon: Settings, label: 'Settings' },
  { href: '#',         icon: LogOut,   label: 'Sign Out', red: true },
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TODAY_IDX = 1;


const FAKE_STREAKS = [
  { label: 'Active days',  current: 14, best: 21 },
  { label: 'Healthy days', current: 9,  best: 14 },
  { label: 'Food',     current: 14, best: 18 },
  { label: 'Water',        current: 6,  best: 11 },
  { label: 'Workouts',     current: 4,  best: 9  },
  { label: 'Sleep',        current: 3,  best: 8  },
  { label: 'Weight',       current: 7,  best: 12 },
];

/* ── Macro colors ── */
const MACRO_COLORS: Record<string, string> = {
  'accent-violet': 'linear-gradient(90deg,#8b5cf6,#4c1d95)',
  'accent-amber':  'linear-gradient(90deg,#e8a800,#ffc94a)',
  'accent-rose':   'linear-gradient(90deg,#d93a55,#ff4f6b)',
  'accent-emerald':'linear-gradient(90deg,#10b981,#065f46)',
  '#f5a623':       'linear-gradient(90deg,#f5a623,#e89510)',
  '#3aabff':       'linear-gradient(90deg,#3aabff,#2a8bd9)',
};

function MacroCol({ label, current, target, pct, color, unit = 'g' }: {
  label: string; current: number; target: number; pct: number; color: string; unit?: string;
}) {
  const barBg = color.startsWith('#') ? color : (MACRO_COLORS[color] ?? MACRO_COLORS['accent-violet']);
  const displayTarget = unit === 'mg' ? `${Math.round(target)}mg` : `${Math.round(target)}g`;
  return (
    <div className="flex flex-col">
      <div className="mb-2 flex justify-between text-sm text-text-muted">
        <span className="font-body font-medium">{label}</span>
        <span className="font-heading text-sm tracking-[0.03em] text-text-secondary">
          {Math.round(current)}/{displayTarget}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barBg }} />
      </div>
    </div>
  );
}

export default function PreviewPage() {
  const [selectedBadge, setSelectedBadge] = useState<UserBadge | null>(null);

  const slots = Array.from({ length: 5 }, (_, i) => MOCK_BADGES[i] ?? null);

  /* Scale factor: render at ~1340px effective width, display at iframe width */
  const SCALE = 0.69;

  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: '#08080d', maxHeight: 590 }}>
    <div
      style={{
        display: 'flex',
        width: `${100 / SCALE}%`,
        height: `${100 / SCALE}%`,
        overflow: 'hidden',
        background: '#08080d',
        fontFamily: 'var(--font-outfit, Outfit, system-ui, sans-serif)',
        transform: `scale(${SCALE})`,
        transformOrigin: 'top left',
      }}
    >
      {/* ── Static sidebar ── */}
      <aside
        style={{
          width: 232,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(160deg, #111712 0%, #0c1410 100%)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          padding: '20px 0 12px',
          overflowY: 'auto',
        }}
      >
        {/* Branding */}
        <div style={{ padding: '0 18px 14px' }}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '0.06em', background: 'linear-gradient(90deg,#34d399,#10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AROGYAMANDIRAM
          </div>
          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#52525b', marginTop: 2 }}>
            Health &amp; Wellness
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, padding: '0 8px' }}>
          {NAV_ITEMS.map(({ href, icon: Icon, label, active }) => (
            <div
              key={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '7px 12px',
                borderRadius: 10,
                background: active ? 'rgba(52,211,153,0.10)' : 'transparent',
                cursor: 'default',
              }}
            >
              <Icon style={{ width: 15, height: 15, flexShrink: 0, color: active ? '#34d399' : '#71717a' }} strokeWidth={1.8} />
              <span style={{ fontSize: 13, fontWeight: 500, color: active ? '#34d399' : '#71717a' }}>{label}</span>
            </div>
          ))}
        </nav>

        {/* Bottom nav */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 8px 0', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {BOTTOM_NAV.map(({ href, icon: Icon, label, red }) => (
            <div key={href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 10, cursor: 'default' }}>
              <Icon style={{ width: 15, height: 15, flexShrink: 0, color: red ? '#ef4444' : '#71717a' }} strokeWidth={1.8} />
              <span style={{ fontSize: 13, fontWeight: 500, color: red ? '#ef4444' : '#71717a' }}>{label}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        className="animate-fade-in"
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px 24px 16px' }}
      >
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1
              className="font-heading"
              style={{ fontSize: 30, fontWeight: 400, letterSpacing: '0.03em', lineHeight: 1, color: '#e5e5e5' }}
            >
              GOOD MORNING, K 👋
            </h1>
            <p className="font-body" style={{ fontSize: 13, color: '#a3a3a3', marginTop: 3 }}>
              Build momentum one healthy choice at a time.
            </p>
          </div>
          {/* XP pill */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'linear-gradient(160deg, #111712 0%, #0c1410 100%)',
              borderRadius: 12, padding: '8px 14px',
            }}
          >
            <span className="font-heading" style={{ fontSize: 18, color: '#34d399', letterSpacing: '0.03em' }}>LV 5</span>
            <div style={{ width: 110, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: '52%', height: '100%', background: 'linear-gradient(90deg,#34d399,rgba(52,211,153,0.8))', borderRadius: 3 }} />
            </div>
            <span className="font-body" style={{ fontSize: 11, color: '#a3a3a3', whiteSpace: 'nowrap' }}>413 / 800 XP</span>
          </div>
        </div>

        {/* ── Bento grid ── */}
        <div className="bento-grid">

          {/* Row 1: ring | badges | water */}
          <div className="bento-ring-stats">
            {/* Calorie ring */}
            <div className="bento-ring">
              <div className="glass-card ring-card card-glow">
                <div className="ring-wrap">
                  <ProgressRing
                    progress={0}
                    size={200}
                    strokeWidth={12}
                    color="stroke-accent-emerald"
                    bgColor="stroke-white/[0.06]"
                    value="0"
                    label="kcal"
                    valueClassName="font-heading text-4xl font-normal tracking-[0.03em] text-text-secondary"
                    labelClassName="font-body text-xs font-medium text-text-muted"
                  />
                </div>
                <p className="text-center text-sm text-text-muted leading-relaxed font-body">
                  <span className="font-semibold text-text-secondary">2,500 remaining</span>
                  <br />of 2,500 kcal goal
                </p>
              </div>
            </div>

            {/* Recent Badges */}
            <div className="bento-ring-badges min-h-0">
              <div className="glass-card recent-badges-card card-glow flex h-full min-h-0 flex-col">
                <div className="mb-2 flex shrink-0 items-center justify-between">
                  <span className="font-body text-[11px] font-medium uppercase tracking-wider text-text-muted">Recent Badges</span>
                  <span className="font-body text-xs font-medium text-accent-emerald">View all →</span>
                </div>
                <div className="recent-badges-grid min-h-0 flex-1">
                  {slots.map((badge, i) =>
                    badge ? (
                      <BadgeCard key={badge.id} badge={badge} locked={false} onClick={() => setSelectedBadge(badge)} />
                    ) : (
                      <div key={`empty-${i}`} className="recent-badge-empty-slot" aria-hidden="true" />
                    )
                  )}
                </div>
              </div>
            </div>

            {/* Water ring */}
            <div className="bento-water-ring">
              <div className="glass-card water-beaker-card card-glow">
                <div className="beaker-wrap">
                  <WaterGlass percent={0} isPouring={false} size="compact" textColor="#22d3ee" labelColor="#67e8f9" glowIntensity={0} />
                </div>
                <p className="text-center text-sm text-text-muted leading-relaxed font-body">
                  <span className="font-semibold text-text-secondary">2.8 L remaining</span>
                  <br />of 2.8 L goal
                </p>
              </div>
            </div>
          </div>

          {/* Macros */}
          <div className="bento-macro">
            <div className="macro-card card-glow">
              <div className="mb-4 flex items-center justify-between">
                <span className="macro-title">Today&apos;s Macros</span>
                <span className="font-body text-xs font-medium text-accent-emerald">Details →</span>
              </div>
              <div className="macro-scroll">
                {[
                  { label: 'Protein', current: 0, target: 113, color: 'accent-violet', unit: 'g' },
                  { label: 'Carbs',   current: 0, target: 350, color: 'accent-amber',  unit: 'g' },
                  { label: 'Fat',     current: 0, target: 70,  color: 'accent-rose',   unit: 'g' },
                  { label: 'Fiber',   current: 0, target: 25,  color: 'accent-emerald',unit: 'g' },
                  { label: 'Sugar',   current: 0, target: 50,  color: '#f5a623',       unit: 'g' },
                  { label: 'Sodium',  current: 0, target: 2300,color: '#3aabff',       unit: 'mg' },
                ].map((m) => (
                  <div key={m.label} className="macro-col">
                    <MacroCol {...m} pct={0} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 8 stat cards */}
          <div className="bento-all-stats col-span-full grid grid-cols-4 gap-3">
            {[
              { icon: <Droplets className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />, value: '0 ML', label: 'Water',      sub: '2.5 L target',      valueColor: 'text-accent-cyan'    },
              { icon: <Flame    className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />, value: '0',    label: 'Burned',     sub: '0 workouts',        valueColor: 'text-accent-rose'    },
              { icon: <Utensils className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />, value: '0',    label: 'Meals',      sub: '0 kcal',            valueColor: 'text-accent-amber'   },
              { icon: <Moon     className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />, value: '7.6H', label: 'Sleep',      sub: '3/5 quality',       valueColor: 'text-accent-violet'  },
              { icon: <Footprints className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />, value: '3,701', label: 'Steps',  sub: 'of 8,000 goal',     valueColor: 'text-accent-emerald' },
              { icon: <HeartPulse className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />, value: '65',  label: 'Heart Rate',sub: 'bpm',              valueColor: 'text-accent-rose'    },
              { icon: <Activity className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />, value: '298',  label: 'Active Cal', sub: 'kcal burned',       valueColor: 'text-accent-amber'   },
              { icon: <MapPin   className="h-6 w-6 text-text-secondary" strokeWidth={1.8} />, value: '2.5',  label: 'Distance',  sub: 'of 6.2 km goal',    valueColor: 'text-accent-cyan'    },
            ].map((s) => (
              <StatMini
                key={s.label}
                icon={s.icon}
                value={s.value}
                label={s.label}
                sub={s.sub}
                valueColor={s.valueColor}
                labelClassName="text-text-secondary"
                iconBg=""
                compact
              />
            ))}
          </div>

          {/* Active Streaks */}
          <div className="bento-streaks">
            <div className="streak-card card-glow flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
              <div className="sm:shrink-0 sm:w-[220px]">
                <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted mb-1">Active Streaks</p>
                <p className="text-[12px] text-text-muted leading-relaxed">Keep your streak alive to climb badge tiers.</p>
              </div>
              <div className="flex-1 min-w-0 h-16 sm:h-14 flex items-center overflow-hidden">
                <div className="flex gap-3 overflow-x-auto hide-scrollbar w-full h-full items-center">
                  {FAKE_STREAKS.map((item) => (
                    <div key={item.label} className="w-[140px] sm:w-[160px] shrink-0 h-full">
                      <AchievementStreakCard
                        label={item.label}
                        current={item.current}
                        best={item.best}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-1.5 sm:shrink-0">
                {DAY_LABELS.map((lbl, i) => (
                  <div key={i} className={`sdot ${i === TODAY_IDX ? 'sdot-today' : ''}`}>{lbl}</div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {selectedBadge && (
          <BadgeDetailModal badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
        )}
      </main>

      {/* Red panda mascot - bottom-right corner */}
      <img
        src="/red-panda.png"
        alt="red panda"
        style={{
          position: 'fixed',
          bottom: 12,
          right: 12,
          width: 84,
          height: 84,
          objectFit: 'contain',
          pointerEvents: 'none',
          zIndex: 50,
        }}
      />
    </div>
    </div>
  );
}

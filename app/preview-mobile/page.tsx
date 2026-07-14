'use client';

import { useState, useEffect } from 'react';

/* Scale: render at 390px, fit into 254px phone frame */
const SCALE = 254 / 390;
const TEAL = '#14dcb4';
const CARD_BG = 'linear-gradient(160deg, #111712 0%, #0c1410 100%)';
const CARD_BORDER = 'rgba(255,255,255,0.05)';

const MACROS = [
  { label: 'PROTEIN', value: 28,  max: 191,  unit: 'g',  color: '#8b78ff' },
  { label: 'CARBS',   value: 206, max: 255,  unit: 'g',  color: '#f5a623' },
  { label: 'FAT',     value: 43,  max: 85,   unit: 'g',  color: '#ff5c7c' },
  { label: 'SUGAR',   value: 25,  max: 50,   unit: 'g',  color: '#ff9f43' },
  { label: 'SODIUM',  value: 800, max: 2300, unit: 'mg', color: '#54a0ff' },
];

const FLAME_PATH = 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z';

const STREAKS = [
  { label: 'Active days', current: 14, best: 21 },
  { label: 'Healthy days', current: 9,  best: 14 },
  { label: 'Food',    current: 14, best: 18 },
  { label: 'Water',       current: 6,  best: 11 },
  { label: 'Workouts',    current: 4,  best: 9  },
  { label: 'Sleep',       current: 3,  best: 8  },
  { label: 'Weight',      current: 7,  best: 12 },
];

const DAY_LABELS = ['M','T','W','T','F','S','S'];
const TODAY_IDX = 2; // Wednesday

const STATS = [
  { value: '1.6 L', label: 'Water',  sub: 'of 2.5 L target', color: '#22d3ee',
    d: 'M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z' },
  { value: '0',     label: 'Burned', sub: '0 workouts',       color: '#fb7185',
    d: 'M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 002.5 2.5z' },
  { value: '9',     label: 'Meals',  sub: '1,327 kcal logged', color: '#fbbf24',
    d: null },
  { value: '-',     label: 'Sleep',  sub: 'of 8h target',     color: '#a78bfa',
    d: 'M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z' },
];

export default function PreviewMobilePage() {
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden', background: '#090909' }}>
      <div
        style={{
          position: 'relative',
          width: `${100 / SCALE}%`,
          height: `${100 / SCALE}%`,
          transform: `scale(${SCALE})`,
          transformOrigin: 'top left',
          overflow: 'hidden',
          background: '#090909',
          fontFamily: 'var(--font-outfit, Outfit, system-ui, sans-serif)',
        }}
      >
        {/* Status bar - vertically centered to match the dynamic island in the phone frame */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 82,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 22px 0 38px', zIndex: 10, pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#e8e6e2', letterSpacing: '-0.02em' }}>10:12</span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {/* Signal bars */}
            <svg width="18" height="13" viewBox="0 0 18 13" fill="none">
              <rect x="0"   y="9"   width="3.2" height="4"    rx="0.8" fill="#e8e6e2"/>
              <rect x="4.8" y="6"   width="3.2" height="7"    rx="0.8" fill="#e8e6e2"/>
              <rect x="9.6" y="3"   width="3.2" height="10"   rx="0.8" fill="#e8e6e2"/>
              <rect x="14.4" y="0"  width="3.2" height="13"   rx="0.8" fill="#e8e6e2" opacity="0.3"/>
            </svg>
            {/* WiFi */}
            <svg width="17" height="13" viewBox="0 0 24 18" fill="none">
              <path d="M1 6.5C5.5 2 10.8 0 12 0s6.5 2 11 6.5" stroke="#e8e6e2" strokeWidth="2.4" strokeLinecap="round" opacity="0.3"/>
              <path d="M4 10.5c2.2-2.8 4.8-4 8-4s5.8 1.2 8 4" stroke="#e8e6e2" strokeWidth="2.4" strokeLinecap="round" opacity="0.65"/>
              <path d="M7.5 14C9 12.2 10.4 11.2 12 11.2s3 1 4.5 2.8" stroke="#e8e6e2" strokeWidth="2.4" strokeLinecap="round"/>
              <circle cx="12" cy="17.5" r="1.6" fill="#e8e6e2"/>
            </svg>
            {/* Battery */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <div style={{ width: 25, height: 12, border: '1.5px solid rgba(232,230,226,0.65)', borderRadius: 3.5, padding: '2px', boxSizing: 'border-box' }}>
                <div style={{ width: '78%', height: '100%', background: '#e8e6e2', borderRadius: 2 }} />
              </div>
              <div style={{ width: 2.5, height: 6, background: 'rgba(232,230,226,0.45)', borderRadius: '0 1.5px 1.5px 0' }} />
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 76,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '88px 13px 0',
        }}>
          <HeaderCard />
          <StreakCard />
          <CalorieCard />
          <StatsGrid />
        </div>

        {/* Red panda */}
        <img
          src="/red-panda.png"
          alt=""
          style={{ position: 'absolute', bottom: 85, right: 14, width: 58, height: 58, pointerEvents: 'none' }}
        />

        {/* Home indicator */}
        <div style={{
          position: 'absolute', bottom: 8, left: 0, right: 0,
          display: 'flex', justifyContent: 'center', zIndex: 20, pointerEvents: 'none',
        }}>
          <div style={{ width: 100, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Bottom nav */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 76,
          background: '#0D0D14',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-around',
          paddingTop: 10,
        }}>
          {/* Dashboard – active */}
          <NavItem active>
            <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke={TEAL} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
              <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
            </svg>
          </NavItem>
          {/* Sleep */}
          <NavItem>
            <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="#a1a1aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          </NavItem>
          {/* Water */}
          <NavItem>
            <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="#a1a1aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z"/>
            </svg>
          </NavItem>
          {/* Food */}
          <NavItem>
            <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="#a1a1aa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/>
              <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/>
            </svg>
          </NavItem>
          {/* More */}
          <NavItem>
            <svg width="21" height="21" fill="none" viewBox="0 0 24 24" stroke="#a1a1aa" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="5" cy="12" r="1.4" fill="#a1a1aa"/><circle cx="12" cy="12" r="1.4" fill="#a1a1aa"/><circle cx="19" cy="12" r="1.4" fill="#a1a1aa"/>
            </svg>
          </NavItem>
        </div>
      </div>
    </div>
  );
}

function NavItem({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: active ? 1 : 0.45 }}>
      {children}
    </div>
  );
}

function HeaderCard() {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '17px 17px 16px', flexShrink: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 21, fontWeight: 800, color: '#e5e5e5', lineHeight: 1.2, letterSpacing: '-0.02em' }}>Good Morning</p>
          <p style={{ margin: '1px 0 0', fontSize: 21, fontWeight: 800, color: '#e5e5e5', lineHeight: 1.2, letterSpacing: '-0.02em' }}>K 👋</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: TEAL, boxShadow: `0 0 6px ${TEAL}` }} />
            <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.14em', color: TEAL }}>AROGYAMANDIRAM</span>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: '#3a4460', lineHeight: 1.4 }}>
            Stay steady today and your future self will thank you.
          </p>
        </div>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: '#1a2035',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 900, color: '#a3a3a3', flexShrink: 0, marginLeft: -12, marginTop: -2,
        }}>K</div>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '12px 0 10px' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: '#3a4460' }}>Getting started</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: TEAL }}>413 / 800 XP</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', width: '51%', background: `linear-gradient(90deg,${TEAL},#00aaff)`, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function CalorieCard() {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 22, padding: '15px 17px 16px', flexShrink: 0 }}>
      {/* Top row: info + ring */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#3a4460', marginBottom: 7 }}>
            Today&apos;s Calories
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, color: '#e5e5e5', lineHeight: 1, letterSpacing: '-0.04em' }}>1,327</div>
          <div style={{ fontSize: 11, color: '#3a4460', marginTop: 3 }}>kcal consumed</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#a3a3a3' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#a3a3a3' }}>1,221</span>
            <span style={{ fontSize: 11, color: '#3a4460' }}>kcal remaining</span>
          </div>
          <div style={{ fontSize: 10, color: '#3a4460', marginTop: 1 }}>of 2,548 kcal goal</div>
        </div>
        {/* Ring */}
        <div style={{ position: 'relative', width: 108, height: 108, flexShrink: 0, marginLeft: 10 }}>
          <CalorieRing value={1327} max={2548} size={108} strokeWidth={10} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#a3a3a3' }}>52%</span>
          </div>
        </div>
      </div>
      {/* Macro bars */}
      {MACROS.map((m) => <MacroBar key={m.label} {...m} />)}
    </div>
  );
}

function StatsGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flexShrink: 0 }}>
      {STATS.map((s) => (
        <div key={s.label} style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 18, padding: '13px 14px' }}>
          <div style={{ marginBottom: 7 }}>
            {s.d ? (
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={s.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d={s.d} />
              </svg>
            ) : (
              /* Meals icon: fork + knife */
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke={s.color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/><path d="M7 2v20"/>
                <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3z"/><path d="M21 15v7"/>
              </svg>
            )}
          </div>
          <div style={{ fontSize: 21, fontWeight: 800, color: s.color, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.value}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#9b9990', marginTop: 3 }}>{s.label}</div>
          <div style={{ fontSize: 9.5, color: '#3a4460', marginTop: 2 }}>{s.sub}</div>
        </div>
      ))}
    </div>
  );
}

function CalorieRing({ value, max, size, strokeWidth }: { value: number; max: number; size: number; strokeWidth: number }) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1);
  const [animated, setAnimated] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} strokeLinecap="round" />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#a3a3a3"
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - animated)}
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
    </svg>
  );
}

function StreakCard() {
  return (
    <div style={{ background: 'linear-gradient(160deg, #111712 0%, #0c1410 100%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: '13px 14px', flexShrink: 0 }}>
      {/* Label + hint */}
      <p style={{ margin: '0 0 2px', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#5C5A53' }}>
        Active Streaks
      </p>
      <p style={{ margin: '0 0 10px', fontSize: 10, color: '#5C5A53', lineHeight: 1.35 }}>
        Keep your streak alive to climb badge tiers.
      </p>

      {/* Streak items - horizontal scroll */}
      <div style={{ display: 'flex', gap: 7, overflowX: 'hidden', marginBottom: 10 }}>
        {STREAKS.map((s) => (
          <div key={s.label} style={{
            flexShrink: 0, width: 100, height: 42,
            background: 'rgba(255,255,255,0.04)', borderRadius: 10,
            display: 'flex', alignItems: 'center', gap: 7, padding: '0 8px',
          }}>
            {/* Flame icon */}
            <div style={{ width: 22, height: 22, borderRadius: 7, background: 'rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#f5d76e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={FLAME_PATH} fill="#f5d76e" />
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 8.5, color: '#5C5A53', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.label}</p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#e5e5e5', lineHeight: 1.2 }}>
                {s.current}d
                <span style={{ fontSize: 8, fontWeight: 400, color: '#5C5A53', marginLeft: 3 }}>· Best {s.best}d</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Day dots */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 5 }}>
        {DAY_LABELS.map((lbl, i) => (
          <div key={i} style={{
            height: 28, borderRadius: 8,
            border: i === TODAY_IDX ? '1px solid rgba(16,185,129,0.6)' : '1px solid rgba(255,255,255,0.07)',
            background: i === TODAY_IDX ? 'rgba(16,185,129,0.14)' : 'rgba(255,255,255,0.03)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 600,
            color: i === TODAY_IDX ? '#10b981' : '#5C5A53',
          }}>
            {lbl}
          </div>
        ))}
      </div>
    </div>
  );
}

function MacroBar({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 250);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div style={{ marginBottom: 9 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#3a4460' }}>{label}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700 }}>
          <span style={{ color }}>{Math.round(value)}</span>
          <span style={{ color: '#3a4460' }}> / {Math.round(max)}{unit}</span>
        </span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${w}%`, background: color, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  );
}

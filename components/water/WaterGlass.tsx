'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

const BUBBLE_COUNT = 7;
const SPLASH_COUNT = 7;

interface WaterGlassProps {
  percent: number;
  isPouring: boolean;
  amount?: number;
  className?: string;
}

// Stable random-ish values per index for bubbles/particles
function seeded(i: number, max: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * max;
}

export default function WaterGlass({
  percent,
  isPouring,
  className,
}: WaterGlassProps) {
  const fillPercent = Math.min(percent, 100);

  // Bubbles with varied positions and animation params
  const bubbles = useMemo(
    () =>
      Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
        id: i,
        left: 15 + seeded(i, 70),
        bottom: 10 + seeded(i + 1, 120),
        size: 1.5 + seeded(i + 2, 3.5),
        duration: 3 + seeded(i + 3, 3),
        delay: seeded(i + 4, 4),
        wobble: 3 + seeded(i + 5, 4),
      })),
    []
  );

  // Splash particles: random upward/outward velocities
  const splashes = useMemo(
    () =>
      Array.from({ length: SPLASH_COUNT }, (_, i) => ({
        id: i,
        x: (seeded(i, 100) - 50) * 0.8,
        yUp: 40 + seeded(i + 1, 50),
        xSpread: (seeded(i + 2, 100) - 50) * 0.02,
        size: 3 + seeded(i + 3, 4),
        delay: 0.1 + seeded(i + 4, 0.3),
      })),
    []
  );

  return (
    <div className={cn('relative h-64 w-40', className)}>
      {/* Glass outline */}
      <div className="absolute inset-0 rounded-b-3xl rounded-t-lg border-2 border-white/[0.08] bg-white/[0.02] overflow-hidden">
        {/* Glass highlight stripe (left edge reflection) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
          }}
        />

        {/* Splash particles at water surface */}
        <AnimatePresence>
          {isPouring && fillPercent > 0 && (
            <div
              className="absolute left-0 right-0 pointer-events-none"
              style={{ bottom: `${fillPercent}%`, height: 40 }}
            >
              {splashes.map((s) => (
                <motion.div
                  key={s.id}
                  className="absolute rounded-full bg-cyan-300/70"
                  style={{
                    left: '50%',
                    bottom: 0,
                    width: s.size,
                    height: s.size,
                    x: '-50%',
                  }}
                  initial={{ y: 0, x: 0, opacity: 1, scale: 1 }}
                  animate={{
                    y: -s.yUp,
                    x: s.x + s.xSpread * 35,
                    opacity: 0,
                    scale: 0.5,
                  }}
                  transition={{
                    duration: 0.8,
                    delay: s.delay,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Water fill */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 rounded-b-[22px] transition-all duration-1000 ease-out',
            isPouring && 'animate-water-fill'
          )}
          style={{
            height: `${fillPercent}%`,
            background:
              fillPercent > 0
                ? 'linear-gradient(180deg, rgba(34,211,238,0.28) 0%, rgba(34,211,238,0.42) 70%, rgba(34,211,238,0.38) 100%)'
                : 'transparent',
            ['--fill-height' as string]: `${fillPercent}%`,
          }}
        >
          {/* Internal waves: subtle bands drifting inside the water */}
          {fillPercent > 15 && (
            <>
              <div
                className="water-inner-wave-1 pointer-events-none absolute left-0 right-0 inset-y-0 overflow-hidden"
                aria-hidden
              >
                <div
                  className="absolute h-[40%] w-[140%] rounded-full opacity-[0.12]"
                  style={{
                    left: '-20%',
                    top: '25%',
                    background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(34,211,238,0.5) 0%, transparent 70%)',
                  }}
                />
              </div>
              <div
                className="water-inner-wave-2 pointer-events-none absolute left-0 right-0 inset-y-0 overflow-hidden"
                aria-hidden
              >
                <div
                  className="absolute h-[35%] w-[130%] rounded-full opacity-[0.08]"
                  style={{
                    left: '-15%',
                    top: '55%',
                    background: 'radial-gradient(ellipse 70% 40% at 50% 50%, rgba(255,255,255,0.25) 0%, transparent 70%)',
                  }}
                />
              </div>
            </>
          )}

          {/* Surface glow line */}
          {fillPercent > 0 && (
            <div
              className={cn(
                'absolute left-0 right-0 h-1 rounded-full pointer-events-none',
                isPouring ? 'water-surface-glow-intense' : 'water-surface-glow'
              )}
              style={{
                top: -2,
                background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.6) 50%, transparent 100%)',
                boxShadow: '0 0 12px rgba(34,211,238,0.4)',
              }}
            />
          )}

          {/* Ripple on add */}
          {isPouring && (
            <div className="water-ripple pointer-events-none absolute inset-x-0 -top-1 h-3 rounded-full bg-cyan-400/25 blur-[3px]" />
          )}

          {/* Rising bubbles */}
          {fillPercent > 10 &&
            bubbles.map((b) => (
              <motion.div
                key={b.id}
                className="absolute rounded-full bg-white/20 pointer-events-none"
                style={{
                  left: `${b.left}%`,
                  bottom: `${(b.bottom / 200) * 100}%`,
                  width: b.size,
                  height: b.size,
                }}
                animate={{
                  y: [0, -20],
                  x: [0, b.wobble, -b.wobble, 0],
                  opacity: [0.2, 0.15, 0],
                }}
                transition={{
                  duration: b.duration,
                  delay: b.delay,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                }}
              />
            ))}

          {/* Extra burst bubbles when pouring */}
          <AnimatePresence>
            {isPouring &&
              fillPercent > 5 &&
              [0, 1, 2, 3].map((i) => (
                <motion.div
                  key={`burst-${i}`}
                  className="absolute rounded-full bg-white/30 pointer-events-none"
                  style={{
                    left: 30 + i * 15 + seeded(i, 20),
                    bottom: 20 + seeded(i + 10, 40),
                    width: 2 + seeded(i + 20, 2),
                    height: 2 + seeded(i + 20, 2),
                  }}
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{
                    scale: 1,
                    y: -60 - seeded(i, 30),
                    x: (i - 1.5) * 8,
                    opacity: 0,
                  }}
                  transition={{ duration: 1, delay: i * 0.05 }}
                />
              ))}
          </AnimatePresence>
        </div>

        {/* Target line (above glass) */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-cyan-500/30"
          style={{ bottom: '100%', transform: 'translateY(0)' }}
        />

        {/* Percentage text in center of glass */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-bold text-text-primary">{Math.round(percent)}%</span>
          <span className="text-xs text-text-muted">hydrated</span>
        </div>
      </div>
    </div>
  );
}

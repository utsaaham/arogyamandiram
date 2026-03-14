'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WaterGlassProps {
  percent: number;
  isPouring: boolean;
  amount?: number;
  className?: string;
  size?: 'default' | 'compact';
  textColor?: string;
  labelColor?: string;
  glowIntensity?: number;
  showLabel?: boolean;
}

function getDynamicColor(percent: number): string {
  if (percent >= 100) return '#34d399';
  if (percent >= 70) return '#67e8f9';
  if (percent >= 30) return '#22d3ee';
  return '#94A3B8';
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
  size = 'default',
  textColor,
  labelColor,
  glowIntensity,
  showLabel = true,
}: WaterGlassProps) {
  const fillPercent = Math.min(percent, 100);
  const compact = size === 'compact';

  const BUBBLE_COUNT = compact ? 8 : 15;
  const MICRO_BUBBLE_COUNT = compact ? 5 : 10;
  const SPLASH_COUNT = 13;
  const BURST_BUBBLE_COUNT = 10;

  const resolvedTextColor = textColor ?? getDynamicColor(percent);
  const resolvedLabelColor = labelColor ?? getDynamicColor(percent);
  const resolvedGlow = glowIntensity ?? 0;

  // Bubbles with varied positions and animation params (stronger motion: more travel, wobble, scale pulse)
  const bubbles = useMemo(
    () =>
      Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
        id: i,
        left: 15 + seeded(i, 70),
        bottom: 10 + seeded(i + 1, 120),
        size: 1.5 + seeded(i + 2, 3.5),
        duration: 3 + seeded(i + 3, 3),
        delay: seeded(i + 4, 4),
        wobble: compact ? 3 + seeded(i + 5, 3) : 5 + seeded(i + 5, 5),
        repeatDelay: 0.3 + seeded(i + 6, 1.2),
      })),
    [BUBBLE_COUNT, compact]
  );

  // Micro bubbles: smaller, faster rise, shorter repeat
  const microBubbles = useMemo(
    () =>
      Array.from({ length: MICRO_BUBBLE_COUNT }, (_, i) => ({
        id: `micro-${i}`,
        left: 10 + seeded(i + 50, 80),
        bottom: 5 + seeded(i + 51, 100),
        size: 0.8 + seeded(i + 52, 1),
        duration: 1.5 + seeded(i + 53, 1.5),
        delay: seeded(i + 54, 2),
        wobble: compact ? 1.5 + seeded(i + 55, 2) : 2 + seeded(i + 55, 3),
        repeatDelay: 0.2 + seeded(i + 56, 0.6),
      })),
    [MICRO_BUBBLE_COUNT, compact]
  );

  // Splash particles: more and splashier (higher yUp, more spread)
  const splashes = useMemo(
    () =>
      Array.from({ length: SPLASH_COUNT }, (_, i) => ({
        id: i,
        x: (seeded(i, 100) - 50) * 0.9,
        yUp: 55 + seeded(i + 1, 45),
        xSpread: (seeded(i + 2, 100) - 50) * 0.035,
        size: 3 + seeded(i + 3, 4),
        delay: 0.05 + seeded(i + 4, 0.35),
      })),
    []
  );

  // Burst bubbles when pouring: more particles with seeded positions/sizes
  const burstBubbles = useMemo(
    () =>
      Array.from({ length: BURST_BUBBLE_COUNT }, (_, i) => ({
        id: i,
        left: 20 + seeded(i, 60),
        bottom: 15 + seeded(i + 10, 50),
        width: 1.5 + seeded(i + 20, 2.5),
        y: -50 - seeded(i, 40),
        x: (i - BURST_BUBBLE_COUNT / 2) * 6 + seeded(i + 30, 10),
        delay: i * 0.04 + seeded(i + 40, 0.05),
      })),
    []
  );

  return (
    <div className={cn('relative', compact ? 'h-[160px] w-[100px]' : 'h-64 w-40', className)}>
      {/* Radial glow behind beaker */}
      {resolvedGlow > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 60%, rgba(34,211,238,${0.15 * resolvedGlow}) 0%, transparent 70%)`,
            filter: `blur(${20 * resolvedGlow}px)`,
            transform: 'scale(1.4)',
          }}
          aria-hidden
        />
      )}
      {/* Glass outline: bump scale when pouring */}
      <div
        className={cn(
          'absolute inset-0 rounded-b-3xl rounded-t-lg border-2 overflow-hidden',
          compact ? 'border-white/[0.08] bg-white/[0.02]' : 'border-white/[0.05] bg-white/[0.015]',
          isPouring && 'water-glass-bump'
        )}
      >
        {/* Glass highlight stripe (left edge reflection) */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg pointer-events-none"
          style={{
            background: compact
              ? 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 50%, transparent 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
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
                ? 'linear-gradient(180deg, rgba(34,211,238,0.18) 0%, rgba(34,211,238,0.28) 70%, rgba(34,211,238,0.24) 100%)'
                : 'transparent',
            ['--fill-height' as string]: `${fillPercent}%`,
          }}
        >
          {/* Brief surge flash when pouring */}
          {isPouring && fillPercent > 0 && (
            <div
              className="water-fill-surge pointer-events-none absolute inset-0 rounded-b-[22px] bg-cyan-300/20"
              aria-hidden
            />
          )}
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
              <div
                className="water-inner-caustics pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden
              >
                <div
                  className="absolute h-[50%] w-[120%] rounded-full"
                  style={{
                    left: '-10%',
                    top: '20%',
                    background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(34,211,238,0.15) 0%, transparent 65%)',
                  }}
                />
              </div>
            </>
          )}

          {/* Surface glow line: idle bob when not pouring, intense glow when pouring */}
          {fillPercent > 0 && (
            <div
                className={cn(
                  'absolute left-0 right-0 h-1 rounded-full pointer-events-none',
                  isPouring ? 'water-surface-glow-intense' : 'water-surface-glow water-wave'
                )}
                style={{
                  top: -2,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(34,211,238,0.4) 50%, transparent 100%)',
                  boxShadow: '0 0 10px rgba(34,211,238,0.25)',
                }}
            />
          )}

          {/* Ripple on add (double ring when pouring) */}
          {isPouring && (
            <>
              <div className="water-ripple pointer-events-none absolute inset-x-0 -top-1 h-3 rounded-full bg-cyan-400/15 blur-[3px]" />
              <div className="water-ripple water-ripple-delayed pointer-events-none absolute inset-x-0 -top-1 h-4 rounded-full bg-cyan-400/10 blur-[4px]" />
            </>
          )}

          {/* Rising bubbles: more travel, wobble, scale pulse, staggered repeat */}
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
                  y: [0, compact ? -20 : -35],
                  x: [0, b.wobble, -b.wobble, 0],
                  scale: [0.85, 1, 0.9],
                  opacity: [0.25, 0.18, 0],
                }}
                transition={{
                  duration: b.duration,
                  delay: b.delay,
                  repeat: Infinity,
                  repeatDelay: b.repeatDelay,
                }}
              />
            ))}

          {/* Micro bubbles: smaller, faster */}
          {fillPercent > 8 &&
            microBubbles.map((b) => (
              <motion.div
                key={b.id}
                className="absolute rounded-full bg-white/15 pointer-events-none"
                style={{
                  left: `${b.left}%`,
                  bottom: `${(b.bottom / 180) * 100}%`,
                  width: b.size,
                  height: b.size,
                }}
                animate={{
                  y: [0, compact ? -15 : -25],
                  x: [0, b.wobble, -b.wobble * 0.5, 0],
                  opacity: [0.18, 0.1, 0],
                }}
                transition={{
                  duration: b.duration,
                  delay: b.delay,
                  repeat: Infinity,
                  repeatDelay: b.repeatDelay,
                }}
              />
            ))}

          {/* Burst bubbles when pouring */}
          <AnimatePresence>
            {isPouring &&
              fillPercent > 5 &&
              burstBubbles.map((b) => {
                const size = b.width;
                return (
                <motion.div
                  key={`burst-${b.id}`}
                  className="absolute rounded-full bg-white/20 pointer-events-none"
                  style={{
                    left: `${b.left}%`,
                    bottom: `${b.bottom}%`,
                    width: size,
                    height: size,
                  }}
                  initial={{ scale: 0, opacity: 0.8 }}
                  animate={{
                    scale: 1,
                    y: b.y,
                    x: b.x,
                    opacity: 0,
                  }}
                  transition={{ duration: 1, delay: b.delay }}
                />
              );
              })}
          </AnimatePresence>
        </div>

        {/* Target line (above glass) */}
          <div
            className="absolute left-0 right-0 border-t border-dashed border-cyan-500/20"
            style={{ bottom: '100%', transform: 'translateY(0)' }}
          />

        {/* Percentage text in center of glass */}
        {showLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={cn('font-bold', compact ? 'text-xl' : 'text-3xl')} style={{ color: resolvedTextColor }}>{Math.round(percent)}%</span>
            <span className="text-xs" style={{ color: resolvedLabelColor }}>hydrated</span>
          </div>
        )}
      </div>
    </div>
  );
}

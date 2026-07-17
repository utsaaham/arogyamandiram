'use client';

import { useEffect, useRef, useState } from 'react';
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

function vibrate(pattern: number | number[]) {
  if (typeof navigator === 'undefined') return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  if (typeof nav.vibrate !== 'function') return;
  try { nav.vibrate(pattern); } catch { /* noop */ }
}

// SVG geometry: jar drawn in a 100x160 viewBox.
const VB_W = 100;
const VB_H = 160;
const WATER_TOP = 32;
const WATER_BOTTOM = 148;

// Timing budget for one pour cycle (ms).
const T_FALL = 460;   // drop reaches surface
const T_RIPPLE = 700; // ripple expands and fades
const T_CLEAR = 1500; // when impact marker can be released

const JAR_OUTLINE = `
  M 30 4
  L 70 4
  Q 73 4 73 7
  L 73 13
  Q 73 16 70 16
  L 64 16
  L 64 22
  Q 64 25 66 26
  Q 90 32 90 82
  L 90 140
  Q 90 152 78 152
  L 22 152
  Q 10 152 10 140
  L 10 82
  Q 10 32 34 26
  Q 36 25 36 22
  L 36 16
  L 30 16
  Q 27 16 27 13
  L 27 7
  Q 27 4 30 4
  Z
`;

const JAR_INTERIOR = `
  M 38 18
  L 62 18
  L 62 22
  Q 62 25 64 26
  Q 88 32 88 82
  L 88 140
  Q 88 150 78 150
  L 22 150
  Q 12 150 12 140
  L 12 82
  Q 12 32 36 26
  Q 38 25 38 22
  Z
`;

function percentToY(p: number) {
  const fp = Math.min(Math.max(p, 0), 100);
  return WATER_BOTTOM - (fp / 100) * (WATER_BOTTOM - WATER_TOP);
}

export default function WaterGlass({
  percent,
  isPouring,
  className,
  size = 'default',
}: WaterGlassProps) {
  const compact = size === 'compact';

  // displayPercent is what the water rect actually shows. It lags the prop
  // during a pour so the drop can land on the OLD surface before the level
  // rises to the new one.
  const [displayPercent, setDisplayPercent] = useState(percent);
  const [impactY, setImpactY] = useState<number | null>(null);
  const [pourId, setPourId] = useState(0);

  const percentRef = useRef(percent);
  const prevPouringRef = useRef(false);

  useEffect(() => { percentRef.current = percent; }, [percent]);

  // Keep displayPercent in sync with the prop when we're not mid-pour.
  useEffect(() => {
    if (!isPouring) setDisplayPercent(percent);
  }, [isPouring, percent]);

  // Drive the pour sequence on the rising edge of isPouring.
  useEffect(() => {
    if (isPouring && !prevPouringRef.current) {
      prevPouringRef.current = true;
      const oldY = percentToY(displayPercent);
      setImpactY(oldY);
      setPourId((n) => n + 1);

      vibrate(10);
      const tImpact = setTimeout(() => {
        vibrate(50);
        // Drop has landed - now commit the level rise.
        setDisplayPercent(percentRef.current);
      }, T_FALL);
      const tRippleHap = setTimeout(() => vibrate([20, 40, 15]), T_FALL + 260);
      const tClear = setTimeout(() => setImpactY(null), T_CLEAR);

      return () => {
        clearTimeout(tImpact);
        clearTimeout(tRippleHap);
        clearTimeout(tClear);
      };
    }
    if (!isPouring) prevPouringRef.current = false;
  // displayPercent intentionally excluded - we only want the rising-edge effect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPouring]);

  const surfaceY = percentToY(displayPercent);
  // While a pour is in flight, the drop falls toward the captured impactY.
  // Otherwise, fall back to current surface (drop is hidden anyway).
  const dropTargetY = impactY ?? surfaceY;
  const rippleCy = impactY ?? surfaceY;

  return (
    <div className={cn('relative', compact ? 'h-[160px] w-[100px]' : 'h-64 w-40', className)}>
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <clipPath id="jar-interior-clip">
            <path d={JAR_INTERIOR} />
          </clipPath>
        </defs>

        <g clipPath="url(#jar-interior-clip)">
          <motion.rect
            x={0}
            width={VB_W}
            initial={false}
            animate={{ y: surfaceY, height: VB_H - surfaceY }}
            transition={{ type: 'spring', stiffness: 95, damping: 18, mass: 1 }}
            fill="rgba(148, 163, 184, 0.16)"
          />
          <motion.line
            x1={0}
            x2={VB_W}
            initial={false}
            animate={{ y1: surfaceY, y2: surfaceY }}
            transition={{ type: 'spring', stiffness: 95, damping: 18 }}
            stroke="rgba(163, 163, 163, 0.55)"
            strokeWidth={0.6}
          />

          <AnimatePresence>
            {impactY !== null && (
              <motion.ellipse
                key={`ripple-${pourId}`}
                cx={50}
                cy={rippleCy}
                fill="none"
                stroke="rgba(163, 163, 163, 0.55)"
                strokeWidth={0.6}
                initial={{ rx: 1, ry: 0.3, opacity: 0 }}
                animate={{ rx: 30, ry: 4, opacity: [0, 0.9, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: T_RIPPLE / 1000,
                  delay: T_FALL / 1000,
                  ease: 'easeOut',
                }}
              />
            )}
          </AnimatePresence>
        </g>

        <path
          d={JAR_OUTLINE}
          fill="none"
          stroke="rgba(255, 255, 255, 0.18)"
          strokeWidth={1}
          strokeLinejoin="round"
        />
        <AnimatePresence>
          {impactY !== null && (
            <motion.ellipse
              key={`drop-${pourId}`}
              cx={50}
              fill="rgba(163, 163, 163, 0.75)"
              initial={{ cy: 22, rx: 1.6, ry: 1.6, opacity: 0 }}
              animate={{
                cy: [22, 22, dropTargetY - 2, dropTargetY - 2],
                rx: [1.6, 1.4, 1.0, 0.4],
                ry: [1.6, 2.8, 3.2, 0.4],
                opacity: [0, 1, 1, 0],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: T_FALL / 1000,
                times: [0, 0.18, 0.92, 1],
                ease: [0.55, 0.05, 0.8, 0.4],
              }}
            />
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

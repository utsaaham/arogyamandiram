// Level progression helpers for XP.
// Base requirement is 50 XP for the first level-up,
// and each subsequent level requires twice the previous XP.

export const BASE_LEVEL_XP = 50;

// XP required to go from `level` -> `level + 1`
export function xpForLevel(level: number): number {
  if (level <= 0) return BASE_LEVEL_XP;
  return BASE_LEVEL_XP * Math.pow(2, level - 1);
}

export function getLevelProgress(xpTotal: number): {
  level: number;
  xpIntoLevel: number;
  xpForCurrentLevel: number;
  xpPercent: number;
} {
  let level = 1;
  let remaining = Math.max(0, xpTotal);
  let xpForCurrentLevel = xpForLevel(level);

  while (remaining >= xpForCurrentLevel) {
    remaining -= xpForCurrentLevel;
    level += 1;
    xpForCurrentLevel = xpForLevel(level);
  }

  const xpIntoLevel = remaining;
  const xpPercent =
    xpForCurrentLevel > 0
      ? Math.min(100, Math.round((xpIntoLevel / xpForCurrentLevel) * 100))
      : 0;

  return { level, xpIntoLevel, xpForCurrentLevel, xpPercent };
}


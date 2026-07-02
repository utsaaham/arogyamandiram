// Sleep score (0-100): duration is the dominant term, with restorative-stage
// and consistency adjustments when device data provides them.
// Weights renormalize across available components.

import { baselineOf, bedtimeMinutes, column } from './baselines';
import { clamp, type DayInput, type ScoreComponent, type SleepResult } from './types';

const SLEEP_NEED_HOURS = 8;
const RESTORATIVE_TARGET = 0.4; // deep + REM as share of asleep time

export function computeSleep(days: DayInput[], index: number): SleepResult {
  const day = days[index];
  const sleep = day?.sleep;
  if (!sleep || sleep.duration <= 0) {
    return { score: null, components: [] };
  }

  const parts: Array<ScoreComponent & { weight: number }> = [];

  // Duration vs. need
  const durationScore = clamp((sleep.duration / SLEEP_NEED_HOURS) * 100);
  parts.push({
    key: 'duration',
    label: 'Duration',
    score: Math.round(durationScore),
    note: `Slept ${sleep.duration}h of a ~${SLEEP_NEED_HOURS}h need`,
    weight: 60,
  });

  // Restorative stages (deep + REM share)
  const deep = sleep.deepHours ?? 0;
  const rem = sleep.remHours ?? 0;
  if (deep + rem > 0) {
    const share = (deep + rem) / sleep.duration;
    const stageScore = clamp((share / RESTORATIVE_TARGET) * 100);
    parts.push({
      key: 'stages',
      label: 'Restorative sleep',
      score: Math.round(stageScore),
      note: `${Math.round(share * 100)}% deep + REM (target ~${RESTORATIVE_TARGET * 100}%)`,
      weight: 25,
    });
  }

  // Bedtime consistency vs. the user's own recent bedtimes
  const bedCol = column(days, (d) => {
    const b = d.sleep?.bedtime;
    return b ? bedtimeMinutes(b) ?? undefined : undefined;
  });
  const bedBase = baselineOf(bedCol, index);
  const tonight = sleep.bedtime ? bedtimeMinutes(sleep.bedtime) : null;
  if (bedBase && tonight !== null) {
    const driftMin = Math.abs(tonight - bedBase.mean);
    // Full credit within 30 min of usual bedtime, none beyond 2h.
    const consistencyScore = clamp(100 - Math.max(0, driftMin - 30) * (100 / 90));
    parts.push({
      key: 'consistency',
      label: 'Bedtime consistency',
      score: Math.round(consistencyScore),
      note: driftMin <= 30 ? 'Bedtime close to your usual' : `Bedtime ~${Math.round(driftMin)} min off your usual`,
      weight: 15,
    });
  }

  const totalWeight = parts.reduce((a, p) => a + p.weight, 0);
  const score = Math.round(
    parts.reduce((a, p) => a + (p.score ?? 0) * p.weight, 0) / totalWeight
  );

  return {
    score,
    components: parts.map(({ weight: _w, ...c }) => c),
  };
}

// Today's Guidance: Push / Maintain / Recover / Rest, derived from readiness
// with common-sense overrides (illness, very short sleep).

import type { DayInput, GuidanceBand, GuidanceResult, ReadinessResult } from './types';

export function computeGuidance(day: DayInput | undefined, readiness: ReadinessResult): GuidanceResult {
  if (day?.habits?.includes('illness')) {
    return { band: 'rest', reason: 'You logged feeling sick. Rest up and let your body do its thing.' };
  }

  const shortSleep = (day?.sleep?.duration ?? 24) < 5;
  if (shortSleep) {
    return { band: 'recover', reason: `Only ${day?.sleep?.duration}h of sleep last night. Be kind to yourself and keep it light today.` };
  }

  if (readiness.score === null) {
    return {
      band: 'maintain',
      reason: 'We need a few more days of data before we can read your readiness. Train as usual and keep syncing.',
    };
  }

  let band: GuidanceBand;
  if (readiness.score >= 67) band = 'push';
  else if (readiness.score >= 40) band = 'maintain';
  else band = 'recover';

  const driver = readiness.drivers[0] ?? '';
  const driverPart = driver ? `${driver.toLowerCase()}. ` : '';
  const reasonByBand: Record<GuidanceBand, string> = {
    push: `Readiness ${readiness.score}. ${driverPart}Your body is ready. Go get it!`,
    maintain: `Readiness ${readiness.score}. ${driverPart}Train, but keep it comfortable.`,
    recover: `Readiness ${readiness.score}. ${driverPart}Today is a rest-and-recharge kind of day.`,
    rest: '',
  };

  return { band, reason: reasonByBand[band] };
}

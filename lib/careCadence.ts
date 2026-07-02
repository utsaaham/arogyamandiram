// Care-item reminder cadences: how often a care routine (haircut, dentist,
// filter change...) should come around again. Shared by the settings form,
// the checklist Care tab, and the todos API.

export const CARE_CADENCES = [
  { value: 'weekly',    label: 'Weekly',         days: 7 },
  { value: 'biweekly',  label: 'Every 2 weeks',  days: 14 },
  { value: 'monthly',   label: 'Monthly',        days: 30 },
  { value: 'quarterly', label: 'Every 3 months', days: 91 },
  { value: 'yearly',    label: 'Yearly',         days: 365 },
] as const;

export type CareCadence = (typeof CARE_CADENCES)[number]['value'];

export const DEFAULT_CARE_CADENCE: CareCadence = 'monthly';

export function isCareCadence(value: unknown): value is CareCadence {
  return typeof value === 'string' && CARE_CADENCES.some((c) => c.value === value);
}

export function cadenceInfo(value: string | undefined) {
  return CARE_CADENCES.find((c) => c.value === value) ?? CARE_CADENCES[2];
}

/** Whole days between a YYYY-MM-DD date and today (positive = in the past). */
export function daysSince(dateStr: string, today: string): number {
  const then = new Date(`${dateStr}T00:00:00Z`).getTime();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  return Math.round((now - then) / 86_400_000);
}

export type CareStatus =
  | { state: 'never' }
  | { state: 'done'; daysAgo: number; nextInDays: number }
  | { state: 'due'; daysAgo: number }
  | { state: 'overdue'; daysAgo: number; overdueBy: number };

/** Where a care item stands in its cycle, given its last completion date. */
export function careStatus(
  lastDone: string | null | undefined,
  cadence: string | undefined,
  today: string
): CareStatus {
  if (!lastDone) return { state: 'never' };
  const info = cadenceInfo(cadence);
  const ago = daysSince(lastDone, today);
  if (ago < info.days) return { state: 'done', daysAgo: ago, nextInDays: info.days - ago };
  const overdueBy = ago - info.days;
  // A small grace window before we start calling it overdue
  if (overdueBy <= Math.max(2, Math.round(info.days * 0.15))) return { state: 'due', daysAgo: ago };
  return { state: 'overdue', daysAgo: ago, overdueBy };
}

/** Human phrasing for a day count: "today", "yesterday", "12 days", "3 weeks", "2 months". */
export function humanDays(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  const years = Math.round((days / 365) * 10) / 10;
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

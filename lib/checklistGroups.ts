// Checklist groups: 'daily' is the one built-in group; users create the rest
// (stored in settings.todoGroups). Legacy care-category items never stored a
// group, so their group derives to a virtual 'care' group at read time - no
// data migration needed, and the Care chip shows up only for users who have
// such items.

import { isDailyCadence } from './careCadence';

export const DAILY_GROUP_ID = 'daily';
export const CARE_GROUP_ID = 'care';
export const DAILY_GROUP = { id: DAILY_GROUP_ID, name: 'Daily' } as const;

export interface TodoGroup {
  id: string;
  name: string;
}

export interface RawTemplate {
  id: string;
  category?: string;
  group?: string;
  cadence?: string;
  cadenceDays?: number;
  [key: string]: unknown;
}

/** Effective group id: stored value, else care items -> 'care', else 'daily'. */
export function groupOf(t: RawTemplate): string {
  if (typeof t.group === 'string' && t.group) return t.group;
  return t.category === 'care' ? CARE_GROUP_ID : DAILY_GROUP_ID;
}

/** Effective cadence: stored value; legacy items without one behave daily. */
export function cadenceOf(t: RawTemplate): string {
  return typeof t.cadence === 'string' && t.cadence ? t.cadence : 'daily';
}

/** Cycling (non-daily) items track a lastDone; daily ones reset each morning. */
export function needsLastDone(t: RawTemplate): boolean {
  return !isDailyCadence(cadenceOf(t));
}

/**
 * Groups for API responses: Daily first, then the user's groups, plus the
 * virtual Care group when legacy care items exist without a stored group.
 */
export function groupsForResponse(groups: TodoGroup[] | undefined, templates: RawTemplate[]): TodoGroup[] {
  const user = (groups ?? []).map((g) => ({ id: g.id, name: g.name }));
  const out: TodoGroup[] = [{ ...DAILY_GROUP }, ...user];
  if (!user.some((g) => g.id === CARE_GROUP_ID) && templates.some((t) => groupOf(t) === CARE_GROUP_ID)) {
    out.push({ id: CARE_GROUP_ID, name: 'Care' });
  }
  return out;
}

/** A group id a template may be assigned to; unknown ids fall back to daily. */
export function sanitizeGroupId(raw: unknown, groups: TodoGroup[]): string {
  if (typeof raw !== 'string' || !raw.trim()) return DAILY_GROUP_ID;
  const id = raw.trim();
  return groups.some((g) => g.id === id) ? id : DAILY_GROUP_ID;
}

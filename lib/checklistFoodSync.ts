// When a checklist item is unchecked, its food-log entries should leave too.
// Finds today's meals by exact name (most recent first) and removes one
// occurrence per requested name. Returns how many entries were removed.

import api from '@/lib/apiClient';

type LoggedMeal = { _id?: string; id?: string; name?: string };

export async function removeLoggedMealsByName(date: string, names: string[]): Promise<number> {
  const targets = names.filter(Boolean);
  if (targets.length === 0) return 0;

  const res = await api.getDailyLog(date);
  if (!res.success || !res.data) return 0;
  const meals = ((res.data as { meals?: LoggedMeal[] }).meals ?? []);

  let removed = 0;
  const used = new Set<number>();
  for (const name of targets) {
    for (let i = meals.length - 1; i >= 0; i--) {
      if (used.has(i)) continue;
      if (meals[i]?.name === name) {
        const mealId = meals[i]._id ?? meals[i].id;
        const del = await api.removeMeal(date, mealId, i);
        if (del.success) {
          removed++;
          used.add(i);
        }
        break;
      }
    }
  }
  return removed;
}

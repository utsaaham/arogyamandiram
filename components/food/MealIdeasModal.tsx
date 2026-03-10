'use client';

import { useState } from 'react';
import { X, ChefHat, Loader2, Leaf, Drumstick, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import { useUser } from '@/hooks/useUser';

interface MealSuggestion {
  name: string;
  description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  ingredients: string[];
  isVegetarian: boolean;
}

const mealTypeLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
] as const;

interface MealIdeasModalProps {
  onClose: () => void;
  onDebugLog?: (log: unknown) => void;
}

export default function MealIdeasModal({ onClose, onDebugLog }: MealIdeasModalProps) {
  const { user } = useUser();
  const hasApiKey = user?.hasOpenAiKey;

  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>([]);
  const [mealPrefs, setMealPrefs] = useState('');
  const [meals, setMeals] = useState<MealSuggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleMealType = (value: string) => {
    setSelectedMealTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  const fetchMeals = async () => {
    if (selectedMealTypes.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMealSuggestions({
        selectedMealTypes,
        preferences: mealPrefs,
      });
      if (res.success && res.data) {
        const data = res.data as { suggestions: MealSuggestion[]; debugLog?: unknown };
        setMeals(data.suggestions || []);
        if (data.debugLog != null && onDebugLog) {
          onDebugLog(data.debugLog);
        }
      } else {
        setError(res.error || 'Failed to fetch meal ideas');
      }
    } catch {
      setError('Failed to fetch meal ideas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-neutral-800 bg-neutral-900/95 shadow-lg animate-slide-up">
        {/* Fixed header + form — does not scroll */}
        <div className="shrink-0 space-y-4 p-6 pb-4">
          <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-neutral-400">Meal Ideas</h3>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!hasApiKey && (
            <div className="flex items-start gap-3 rounded-xl border border-accent-amber/20 bg-accent-amber/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" />
              <div>
                <p className="text-xs font-medium text-neutral-400">Connect your OpenAI API key</p>
                <p className="mt-0.5 text-[11px] text-neutral-400">
                  Add a key in <Link href="/settings" className="text-accent-violet hover:underline">Settings → API Keys</Link> to get AI meal suggestions.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-medium text-neutral-400">Meal types</p>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPE_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-neutral-400 transition-colors has-[:checked]:border-white/30 has-[:checked]:bg-white/[0.06]"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMealTypes.includes(value)}
                      onChange={() => toggleMealType(value)}
                      className="h-3.5 w-3.5 rounded border-white/30 text-neutral-400"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                type="text"
                value={mealPrefs}
                onChange={(e) => setMealPrefs(e.target.value)}
                placeholder="Preferences (e.g., vegetarian, high protein)"
                className="flex-1 min-w-0 rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-xs text-neutral-400 placeholder:text-neutral-500 input-no-focus-ring"
              />
              <button
                onClick={fetchMeals}
                disabled={loading || !hasApiKey || selectedMealTypes.length === 0}
                className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-orange-400 disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChefHat className="h-4 w-4" />}
                {meals ? 'Regenerate' : 'Get Suggestions'}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-accent-rose/20 bg-accent-rose/5 p-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-rose" />
              <p className="text-xs text-accent-rose">{error}</p>
            </div>
          )}
        </div>

        {/* Scrollable area — only this part moves */}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 hide-scrollbar">
        {loading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
                <p className="text-sm text-neutral-400">Generating meal ideas…</p>
          </div>
        )}

        {!loading && meals && meals.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {meals.map((meal, i) => (
              <div
                key={i}
                className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-neutral-400">{meal.name}</p>
                    <p className="text-[11px] text-neutral-400">
                      {mealTypeLabels[meal.mealType] || meal.mealType}
                    </p>
                  </div>
                  {meal.isVegetarian ? (
                    <Leaf className="h-4 w-4 shrink-0 text-neutral-400" />
                  ) : (
                    <Drumstick className="h-4 w-4 shrink-0 text-neutral-400" />
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">{meal.description}</p>
                <div className="mt-4 grid grid-cols-4 gap-1 rounded-lg border border-neutral-800 bg-black/40 p-2">
                  <div className="text-center">
                    <p className="text-xs font-bold text-orange-400">{meal.calories}</p>
                    <p className="text-[9px] text-text-muted">kcal</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-accent-violet">{meal.protein}g</p>
                    <p className="text-[9px] text-text-muted">P</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-accent-amber">{meal.carbs}g</p>
                    <p className="text-[9px] text-text-muted">C</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-accent-rose">{meal.fat}g</p>
                    <p className="text-[9px] text-text-muted">F</p>
                  </div>
                </div>
                {meal.ingredients?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-medium text-neutral-400">Ingredients:</p>
                    <p className="text-[11px] text-neutral-400">
                      {meal.ingredients.join(', ')}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && !meals && hasApiKey && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
          <ChefHat className="h-10 w-10 text-neutral-400" />
            <p className="text-sm text-neutral-400">Get personalized Indian meal suggestions</p>
            <p className="text-xs text-neutral-400">Based on your goals and nutritional needs</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

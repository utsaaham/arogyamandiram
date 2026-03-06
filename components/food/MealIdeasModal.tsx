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
  breakfast: '🌅 Breakfast',
  lunch: '☀️ Lunch',
  dinner: '🌙 Dinner',
  snack: '🍪 Snack',
};

const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: '🌅 Breakfast' },
  { value: 'lunch', label: '☀️ Lunch' },
  { value: 'dinner', label: '🌙 Dinner' },
  { value: 'snack', label: '🍪 Snack' },
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
  const [loadingStep, setLoadingStep] = useState<1 | 2>(1);
  const [error, setError] = useState<string | null>(null);

  const toggleMealType = (value: string) => {
    setSelectedMealTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  };

  const fetchMeals = async () => {
    if (selectedMealTypes.length === 0) return;
    setLoading(true);
    setLoadingStep(1);
    setError(null);
    let step2Timer: ReturnType<typeof setTimeout> | null = setTimeout(() => setLoadingStep(2), 1800);
    try {
      const res = await api.getMealSuggestions({
        selectedMealTypes,
        preferences: mealPrefs,
      });
      if (step2Timer) clearTimeout(step2Timer);
      step2Timer = null;
      setLoadingStep(2);
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
      if (step2Timer) clearTimeout(step2Timer);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-white/[0.06] bg-bg-surface shadow-2xl animate-slide-up">
        {/* Fixed header + form — does not scroll */}
        <div className="shrink-0 space-y-4 p-6 pb-4">
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-semibold text-text-primary">Meal Ideas</h3>
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
                <p className="text-xs font-medium text-text-primary">Connect your OpenAI API key</p>
                <p className="mt-0.5 text-[11px] text-text-muted">
                  Add a key in <Link href="/settings" className="text-accent-violet hover:underline">Settings → API Keys</Link> to get AI meal suggestions.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-medium text-text-muted">Meal types</p>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPE_OPTIONS.map(({ value, label }) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs transition-colors has-[:checked]:border-accent-violet/40 has-[:checked]:bg-accent-violet/10"
                  >
                    <input
                      type="checkbox"
                      checked={selectedMealTypes.includes(value)}
                      onChange={() => toggleMealType(value)}
                      className="h-3.5 w-3.5 rounded border-white/30 text-accent-violet"
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
                className="glass-input flex-1 min-w-0 rounded-xl px-3 py-2 text-xs"
              />
              <button
                onClick={fetchMeals}
                disabled={loading || !hasApiKey || selectedMealTypes.length === 0}
                className="glass-button-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
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
            <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
            <p className="text-sm text-text-muted">
              {loadingStep === 1 ? 'Step 1: Analyzing your taste…' : 'Step 2: Generating ideas…'}
            </p>
          </div>
        )}

        {!loading && meals && meals.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {meals.map((meal, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-white/[0.1]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{meal.name}</p>
                    <p className="text-[11px] text-text-muted">
                      {mealTypeLabels[meal.mealType] || meal.mealType}
                    </p>
                  </div>
                  {meal.isVegetarian ? (
                    <Leaf className="h-4 w-4 shrink-0 text-accent-emerald" />
                  ) : (
                    <Drumstick className="h-4 w-4 shrink-0 text-accent-rose" />
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">{meal.description}</p>
                <div className="mt-3 grid grid-cols-4 gap-1 rounded-lg bg-white/[0.03] p-2">
                  <div className="text-center">
                    <p className="text-xs font-bold text-accent-emerald">{meal.calories}</p>
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
                    <p className="text-[10px] font-medium text-text-muted">Ingredients:</p>
                    <p className="text-[11px] text-text-secondary">
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
            <ChefHat className="h-10 w-10 text-text-muted" />
            <p className="text-sm text-text-muted">Get personalized Indian meal suggestions</p>
            <p className="text-xs text-text-muted">Based on your goals and nutritional needs</p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

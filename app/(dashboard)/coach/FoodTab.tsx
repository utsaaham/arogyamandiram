'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles, Loader2, CalendarDays, Flame,
  Lightbulb, ChevronDown, ChevronUp, X, CheckCircle2,
  Coffee, Sun, Moon, Apple, Clock3, ListOrdered,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { showToast } from '@/components/ui/Toast';
import api from '@/lib/apiClient';
import type { AiMealSuggestion } from '@/types';
import { usePlanAutoRefresh } from '@/hooks/usePlanAutoRefresh';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = (typeof MEAL_ORDER)[number];

const MEAL_STYLE = {
  breakfast: { icon: Coffee, color: 'text-amber-400', bg: 'bg-amber-500/[0.06]', label: 'Breakfast' },
  lunch: { icon: Sun, color: 'text-emerald-400', bg: 'bg-emerald-500/[0.06]', label: 'Lunch' },
  dinner: { icon: Moon, color: 'text-violet-400', bg: 'bg-violet-500/[0.06]', label: 'Dinner' },
  snack: { icon: Apple, color: 'text-cyan-400', bg: 'bg-cyan-500/[0.06]', label: 'Snack' },
} as const;

type FoodPlan = {
  suggestions: AiMealSuggestion[];
  reasoning?: string;
};

// ─── MealCard ─────────────────────────────────────────────────────────────────

function MealCard({
  meal, type, onDislike, disliked,
}: { meal: AiMealSuggestion; type: MealType; onDislike: (name: string) => void; disliked: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const style = MEAL_STYLE[type];
  const Icon = style.icon;
  const ingredients = meal.ingredients ?? [];
  const steps = meal.steps ?? [];
  return (
    <article className={cn('rounded-2xl border p-5 transition-all', disliked ? 'border-zinc-800 opacity-40 line-through' : 'border-white/[0.06] bg-white/[0.025]')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={cn('mb-4 flex h-10 w-10 items-center justify-center rounded-xl', style.bg)}>
            <Icon className={cn('h-5 w-5', style.color)} />
          </div>
          <p className={cn('text-[10px] font-semibold uppercase tracking-[0.16em]', style.color)}>{style.label}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="mt-1 text-base font-semibold text-text-primary">{meal.name}</h3>
            {meal.isVegetarian && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">Veg</span>
            )}
          </div>
          {meal.description && (
            <p className="mt-2 text-xs text-text-muted leading-relaxed">{meal.description}</p>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] sm:grid-cols-4">
            <span className="flex items-center justify-center gap-1 rounded-lg bg-zinc-800/70 px-2 py-1.5 text-zinc-300">
              <Flame className="h-2.5 w-2.5 text-orange-400" /> {meal.calories} kcal
            </span>
            <span className="rounded-lg bg-zinc-800/70 px-2 py-1.5 text-center text-zinc-300">Protein {meal.protein}g</span>
            <span className="rounded-lg bg-zinc-800/70 px-2 py-1.5 text-center text-zinc-300">Carbs {meal.carbs}g</span>
            <span className="rounded-lg bg-zinc-800/70 px-2 py-1.5 text-center text-zinc-300">Fat {meal.fat}g</span>
          </div>
        </div>
        {!disliked && (
          <button type="button" onClick={() => onDislike(meal.name)}
            className="shrink-0 rounded-full p-1 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {(ingredients.length > 0 || steps.length > 0) && (
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="mt-4 flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide recipe' : 'How to make this'}
        </button>
      )}
      {expanded && (
        <div className="mt-3 space-y-4 rounded-xl border border-white/[0.05] bg-black/15 p-4">
          {(meal.prepMinutes != null || meal.cookMinutes != null) && (
            <div className="flex flex-wrap gap-3 text-[11px] text-zinc-400">
              {meal.prepMinutes != null && <span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3" /> Prep {meal.prepMinutes} min</span>}
              {meal.cookMinutes != null && <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3" /> Cook {meal.cookMinutes} min</span>}
            </div>
          )}
          {ingredients.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-300">Ingredients</p>
              <ul className="mt-2 grid gap-1 text-xs leading-relaxed text-zinc-400 sm:grid-cols-2">
                {ingredients.map((ingredient, index) => <li key={`${ingredient}-${index}`}>• {ingredient}</li>)}
              </ul>
            </div>
          )}
          {steps.length > 0 && (
            <div>
              <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-300"><ListOrdered className="h-3 w-3" /> Steps</p>
              <ol className="mt-2 space-y-2 text-xs leading-relaxed text-zinc-400">
                {steps.map((step, index) => (
                  <li key={`${step}-${index}`} className="flex gap-2"><span className="font-semibold text-emerald-400">{index + 1}.</span><span>{step}</span></li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ─── FoodTab ──────────────────────────────────────────────────────────────────

export default function FoodTab() {
  const { user } = useUser();
  const hasApiKey = user?.hasOpenAiKey;

  const [foodPlan, setFoodPlan] = useState<FoodPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [dislikedFoods, setDislikedFoods] = useState<string[]>([]);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/daily-plan/food', { credentials: 'include' });
      const json = await res.json() as { success: boolean; data?: { foodPlan?: FoodPlan | null } };
      if (json.success) setFoodPlan(json.data?.foodPlan ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  usePlanAutoRefresh(load);

  const handleGenerate = async () => {
    const hadPlan = (foodPlan?.suggestions?.length ?? 0) > 0;
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/daily-plan/food', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        await load();
        showToast(hadPlan ? 'Food plan regenerated!' : 'Food plan generated!', 'success');
      } else {
        const msg = json.error ?? 'Failed to generate food plan';
        showToast(msg.toLowerCase().includes('api key') ? 'Add your OpenAI key in Settings.' : msg, 'error');
      }
    } catch {
      showToast('Failed to generate food plan', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleDislike = (name: string) => {
    setDislikedFoods((p) => p.includes(name) ? p.filter((f) => f !== name) : [...p, name]);
    setFeedbackSaved(false);
  };

  const handleSaveFeedback = async () => {
    setFeedbackSaving(true);
    const today = new Date().toISOString().split('T')[0];
    try {
      const res = await api.submitPlanFeedback({ date: today, ...(dislikedFoods.length > 0 ? { dislikedFoods } : {}) });
      if (res.success) { setFeedbackSaved(true); showToast('Feedback saved! Your next plan will adapt.', 'success'); }
      else showToast(res.error || 'Failed to save feedback', 'error');
    } catch { showToast('Failed to save feedback', 'error'); }
    finally { setFeedbackSaving(false); }
  };

  const currentFoodPlan = foodPlan;
  const mealGroups = (() => {
    const suggestions = currentFoodPlan?.suggestions ?? [];
    const groups = new Map<string, AiMealSuggestion[]>();
    for (const meal of suggestions) {
      const type = meal.mealType || 'snack';
      const arr = groups.get(type) ?? [];
      arr.push(meal);
      groups.set(type, arr);
    }
    return MEAL_ORDER.filter((t) => groups.has(t)).map((t) => ({ type: t, meals: groups.get(t)! }));
  })();
  const hasFoodPlanContent = mealGroups.length > 0;
  const totals = (currentFoodPlan?.suggestions ?? []).reduce(
    (sum, meal) => ({
      calories: sum.calories + (meal.calories || 0),
      protein: sum.protein + (meal.protein || 0),
      carbs: sum.carbs + (meal.carbs || 0),
      fat: sum.fat + (meal.fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  if (loading) return null;

  if (!currentFoodPlan || !hasFoodPlanContent) {
    return (
      <div className="dashboard-unified-card rounded-2xl border p-5">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <CalendarDays className="h-12 w-12 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-300">No food plan generated yet</p>
          <p className="text-xs text-zinc-500">Plans are auto-generated at midnight from your daily logs.</p>
          {hasApiKey && (
            <button onClick={handleGenerate} disabled={generating}
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50">
              {generating ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : <Sparkles className="h-4 w-4 text-black" />}
              {generating ? 'Generating…' : 'Generate Food Plan'}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentFoodPlan.reasoning && (
        <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-400" />
            <p className="text-xs font-semibold text-amber-300">Plan focus</p>
          </div>
          <p className="mt-2 max-w-5xl text-xs leading-relaxed text-amber-100/75">{currentFoodPlan.reasoning}</p>
        </div>
      )}

      <div className="dashboard-unified-card rounded-2xl border p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          <h2 className="text-base font-semibold text-text-primary">Today&apos;s Food Plan</h2>
        </div>
        {hasApiKey && (
          <button onClick={handleGenerate} disabled={generating}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
            {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {generating ? 'Generating…' : 'Regenerate'}
          </button>
        )}
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: 'Meals', value: currentFoodPlan.suggestions.length, color: 'text-emerald-400' },
          { label: 'Calories', value: `${totals.calories} kcal`, color: 'text-orange-400' },
          { label: 'Protein', value: `${totals.protein}g`, color: 'text-cyan-400' },
          { label: 'Carbs', value: `${totals.carbs}g`, color: 'text-amber-400' },
          { label: 'Fat', value: `${totals.fat}g`, color: 'text-violet-400' },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-white/[0.025] p-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-500">{item.label}</p>
            <p className={cn('mt-1 text-lg font-bold', item.color)}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {mealGroups.map(({ type, meals }) => (
          <div key={type} className="space-y-4">
              {meals.map((meal) => (
                <MealCard key={meal.name} meal={meal} type={type} onDislike={handleDislike} disliked={dislikedFoods.includes(meal.name)} />
              ))}
          </div>
        ))}
      </div>

      {dislikedFoods.length > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl border border-zinc-700 bg-zinc-900/70 px-4 py-3">
          <p className="text-xs text-zinc-400">
            {`${dislikedFoods.length} food${dislikedFoods.length > 1 ? 's' : ''} marked. We'll remember for tomorrow.`}
          </p>
          <button onClick={handleSaveFeedback} disabled={feedbackSaving || feedbackSaved}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black hover:bg-emerald-400 disabled:opacity-50">
            {feedbackSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : feedbackSaved ? <CheckCircle2 className="h-3 w-3" /> : null}
            {feedbackSaved ? 'Saved!' : 'Save for tomorrow'}
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

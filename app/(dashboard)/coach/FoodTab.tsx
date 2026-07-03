'use client';

import { useState, useCallback } from 'react';
import {
  Sparkles, Loader2, CalendarDays, Flame,
  Lightbulb, ChevronDown, ChevronUp, X, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { showToast } from '@/components/ui/Toast';
import api from '@/lib/apiClient';
import type { AiMealSuggestion } from '@/types';
import { usePlanAutoRefresh } from '@/hooks/usePlanAutoRefresh';

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

type FoodPlan = {
  suggestions: AiMealSuggestion[];
  reasoning?: string;
};

// ─── MealCard ─────────────────────────────────────────────────────────────────

function MealCard({
  meal, onDislike, disliked,
}: { meal: AiMealSuggestion; onDislike: (name: string) => void; disliked: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={cn('rounded-xl border p-4 transition-all', disliked ? 'opacity-40 line-through' : 'border-zinc-800 bg-zinc-900/30')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-text-primary">{meal.name}</p>
            {meal.isVegetarian && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400">Veg</span>
            )}
          </div>
          {meal.description && (
            <p className="mt-0.5 text-xs text-text-muted leading-relaxed">{meal.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
            <span className="flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">
              <Flame className="h-2.5 w-2.5 text-orange-400" /> {meal.calories} kcal
            </span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">P {meal.protein}g</span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">C {meal.carbs}g</span>
            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-300">F {meal.fat}g</span>
          </div>
        </div>
        {!disliked && (
          <button type="button" onClick={() => onDislike(meal.name)}
            className="shrink-0 rounded-full p-1 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {meal.ingredients && meal.ingredients.length > 0 && (
        <button type="button" onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Hide' : 'Show'} ingredients
        </button>
      )}
      {expanded && (
        <p className="mt-1 text-[10px] text-zinc-400 leading-relaxed">{meal.ingredients.join(', ')}</p>
      )}
    </div>
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
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-200">{currentFoodPlan.reasoning}</p>
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

      <div className="space-y-5">
        {mealGroups.map(({ type, meals }) => (
          <div key={type}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400 capitalize">{type}</p>
            <div className="space-y-2">
              {meals.map((meal) => (
                <MealCard key={meal.name} meal={meal} onDislike={handleDislike} disliked={dislikedFoods.includes(meal.name)} />
              ))}
            </div>
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

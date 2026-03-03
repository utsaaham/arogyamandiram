'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Utensils,
  Dumbbell,
  TrendingUp,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Info,
  Lightbulb,
  ChefHat,
  Leaf,
  Drumstick,
  Clock,
  Flame,
  Settings,
  Shield,
} from 'lucide-react';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

interface WorkoutPlan {
  name: string;
  description: string;
  exercises: {
    name: string;
    sets: number;
    reps: string;
    restSeconds: number;
    category: string;
  }[];
  estimatedCalories: number;
  durationMinutes: number;
}

interface Insight {
  title: string;
  description: string;
  type: 'success' | 'warning' | 'info' | 'tip';
  metric?: string;
  value?: string;
}

type InsightPeriod = 'yesterday' | 'week' | 'month' | 'year';
type TabKey = InsightPeriod | 'meals' | 'workout';

const tabs: { key: TabKey; label: string; icon: typeof Sparkles }[] = [
  { key: 'yesterday', label: "Yesterday's insights", icon: TrendingUp },
  { key: 'meals', label: 'Meal Ideas', icon: Utensils },
  { key: 'workout', label: 'Workout Plan', icon: Dumbbell },
  { key: 'week', label: 'Week insights', icon: TrendingUp },
  { key: 'month', label: 'Month insights', icon: TrendingUp },
  { key: 'year', label: 'Year insights', icon: TrendingUp },
];

const insightIcons = {
  success: CheckCircle2,
  warning: AlertCircle,
  info: Info,
  tip: Lightbulb,
};

const insightColors = {
  success: 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20',
  warning: 'text-accent-amber bg-accent-amber/10 border-accent-amber/20',
  info: 'text-accent-cyan bg-accent-cyan/10 border-accent-cyan/20',
  tip: 'text-accent-violet bg-accent-violet/10 border-accent-violet/20',
};

const mealTypeLabels: Record<string, string> = {
  breakfast: '🌅 Breakfast',
  lunch: '☀️ Lunch',
  dinner: '🌙 Dinner',
  snack: '🍪 Snack',
};

export default function AiInsightsPage() {
  const { user, loading: userLoading } = useUser();
  const [activeTab, setActiveTab] = useState<TabKey>('week');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [insightsGeneratedAt, setInsightsGeneratedAt] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<{ yesterday: boolean; week: boolean; month: boolean; year: boolean } | null>(null);
  const [meals, setMeals] = useState<MealSuggestion[] | null>(null);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);

  // Meal preferences
  const [mealType, setMealType] = useState('');
  const [mealPrefs, setMealPrefs] = useState('');

  // Workout preferences
  const [focusArea, setFocusArea] = useState('');
  const [workoutDuration, setWorkoutDuration] = useState('30');

  const hasApiKey = user?.hasOpenAiKey;

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api.getInsightsEligibility().then((res) => {
      if (cancelled || !res.success || !res.data) return;
      const data = res.data as { yesterday: boolean; week: boolean; month: boolean; year: boolean };
      setEligibility({
        yesterday: data.yesterday ?? true,
        week: data.week ?? false,
        month: data.month ?? false,
        year: data.year ?? false,
      });
    });
    return () => { cancelled = true; };
  }, [user]);

  const isInsightsTab = activeTab === 'year' || activeTab === 'month' || activeTab === 'week' || activeTab === 'yesterday';
  const insightPeriod: InsightPeriod = isInsightsTab ? activeTab : 'week';

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getInsights({ period: insightPeriod });
      if (res.success && res.data) {
        const data = res.data as { insights: Insight[]; generatedAt?: string };
        setInsights(data.insights || []);
        setInsightsGeneratedAt(data.generatedAt || new Date().toISOString());
      } else {
        setError(res.error || 'Failed to fetch insights');
      }
    } catch {
      setError('Failed to fetch insights');
    } finally {
      setLoading(false);
    }
  };

  const canGenerateInsights =
    hasApiKey &&
    ((insightPeriod === 'yesterday' && (eligibility?.yesterday ?? false)) ||
      (insightPeriod === 'week' && (eligibility?.week ?? true)) ||
      (insightPeriod === 'month' && (eligibility?.month ?? false)) ||
      (insightPeriod === 'year' && (eligibility?.year ?? false)));

  const fetchMeals = async () => {
    setLoading(true);
    setError(null);
    try {
      const context: Record<string, string> = {};
      if (mealType) context.mealType = mealType;
      if (mealPrefs) context.preferences = mealPrefs;
      const res = await api.getMealSuggestions(context);
      if (res.success && res.data) {
        const data = res.data as { suggestions: MealSuggestion[] };
        setMeals(data.suggestions || []);
      } else {
        setError(res.error || 'Failed to fetch meal ideas');
      }
    } catch {
      setError('Failed to fetch meal ideas');
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkout = async () => {
    setLoading(true);
    setError(null);
    try {
      const context: Record<string, string> = {};
      if (focusArea) context.focusArea = focusArea;
      if (workoutDuration) context.duration = workoutDuration;
      const res = await api.getWorkoutPlan(context);
      if (res.success && res.data) {
        const data = res.data as { plan: WorkoutPlan };
        setWorkout(data.plan || null);
      } else {
        setError(res.error || 'Failed to fetch workout plan');
      }
    } catch {
      setError('Failed to fetch workout plan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = () => {
    setError(null);
    if (isInsightsTab) fetchInsights();
    else if (activeTab === 'meals') fetchMeals();
    else if (activeTab === 'workout') fetchWorkout();
  };

  const formatGeneratedDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <CardSkeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary">
          <Sparkles className="h-6 w-6 text-accent-violet" />
          Insights
        </h1>
        <p className="text-sm text-text-muted">Yesterday, weekly, monthly, and yearly insights from your data</p>
      </div>

      {/* No API Key Warning */}
      {!hasApiKey && (
        <div className="flex items-start gap-3 rounded-2xl border border-accent-amber/20 bg-accent-amber/5 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent-amber" />
          <div>
            <p className="text-sm font-medium text-text-primary">Connect your OpenAI API key</p>
            <p className="mt-1 text-xs text-text-muted">
              Insights, meal ideas, and workout plans use your own OpenAI API key. Add a key in
              Settings to turn these cards on. Your key is encrypted and stored securely.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-violet px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-violet/90"
              >
                <Settings className="h-3.5 w-3.5" />
                Open Settings
              </Link>
              <span className="text-[11px] text-text-muted">
                You can remove or rotate your key at any time.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs: Year / Month / Week / Yesterday insights on top, then Meal Ideas & Workout Plan */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isInsightPeriod = tab.key === 'year' || tab.key === 'month' || tab.key === 'week' || tab.key === 'yesterday';
          const isDisabled =
            isInsightPeriod &&
            ((tab.key === 'yesterday' && !eligibility?.yesterday) ||
              (tab.key === 'week' && !eligibility?.week) ||
              (tab.key === 'month' && !eligibility?.month) ||
              (tab.key === 'year' && !eligibility?.year));
          const tooltip =
            tab.key === 'yesterday' && !eligibility?.yesterday
              ? "Log something yesterday to see yesterday's insights"
              : tab.key === 'month' && !eligibility?.month
                ? 'Log for at least 30 days to unlock monthly insights'
                : tab.key === 'year' && !eligibility?.year
                  ? 'Log for at least one year to unlock yearly insights'
                  : tab.key === 'week' && !eligibility?.week
                    ? 'Log for at least 7 days to unlock weekly insights'
                    : undefined;
          return (
            <button
              key={tab.key}
              type="button"
              title={tooltip ?? undefined}
              onClick={() => { if (!isDisabled) { setActiveTab(tab.key); setError(null); } }}
              disabled={isDisabled}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                  : isDisabled
                    ? 'cursor-not-allowed bg-white/[0.04] text-text-muted opacity-60'
                    : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="glass-card rounded-2xl p-6">
        {/* Insights content (Year / Month / Week / Yesterday tabs) */}
        {isInsightsTab && (
          <div>
            <p className="mb-3 flex items-center gap-2 rounded-xl border border-accent-emerald/20 bg-accent-emerald/5 px-3 py-2 text-xs text-text-secondary">
              <Shield className="h-4 w-4 shrink-0 text-accent-emerald" />
              Best of both worlds: we never send your name or email—only anonymized health metrics (e.g. weight, activity, targets). You get personalized insights with complete privacy.
            </p>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-text-primary">
                  {tabs.find((t) => t.key === activeTab)?.label ?? 'Insights'}
                </h2>
                {insightsGeneratedAt && (
                  <p className="mt-0.5 text-xs text-text-muted">
                    Generated on {formatGeneratedDate(insightsGeneratedAt)}
                  </p>
                )}
              </div>
              <button
                onClick={handleGenerate}
                disabled={loading || !canGenerateInsights}
                className="glass-button-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {insights ? 'Refresh' : 'Generate'}
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
                <p className="text-sm text-text-muted">Analyzing your data...</p>
              </div>
            ) : insights ? (
              <div className="space-y-3">
                {insights.map((insight, i) => {
                  const Icon = insightIcons[insight.type] || Info;
                  const colorClass = insightColors[insight.type] || insightColors.info;
                  return (
                    <div
                      key={i}
                      className={cn('flex gap-3 rounded-xl border p-4', colorClass)}
                    >
                      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
                          {insight.value && (
                            <span className="shrink-0 rounded-lg bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-text-secondary">
                              {insight.value}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{insight.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !hasApiKey ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Settings className="h-10 w-10 text-text-muted" />
                <p className="text-sm font-medium text-text-primary">Connect your OpenAI API key</p>
                <p className="text-xs text-text-muted">Add your key in Settings to generate insights.</p>
              </div>
            ) : !canGenerateInsights ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Info className="h-10 w-10 text-accent-amber" />
                <p className="text-sm font-medium text-text-primary">
                  {insightPeriod === 'yesterday'
                    ? "Log something yesterday (food, water, weight, sleep, or workout) to see yesterday's insights"
                    : insightPeriod === 'week'
                      ? 'Log for at least 7 days to generate weekly insights'
                      : insightPeriod === 'month'
                        ? 'Log for at least 30 days to unlock monthly insights'
                        : 'Log for at least one year to unlock yearly insights'}
                </p>
                <p className="text-xs text-text-muted">
                  {insightPeriod === 'yesterday' ? 'Yesterday had no logged data.' : 'Track food, water, weight, sleep, or workouts to build your history.'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <TrendingUp className="h-10 w-10 text-text-muted" />
                <p className="text-sm text-text-muted">Click Generate to get AI-powered insights</p>
                <p className="text-xs text-text-muted">Based on your selected period</p>
              </div>
            )}
          </div>
        )}

        {/* Meals Tab */}
        {activeTab === 'meals' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">AI Meal Suggestions</h2>
              <button
                onClick={handleGenerate}
                disabled={loading || !hasApiKey}
                className="glass-button-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChefHat className="h-4 w-4" />}
                {meals ? 'Regenerate' : 'Get Suggestions'}
              </button>
            </div>

            {/* Preferences */}
            <div className="mb-4 flex flex-wrap gap-3">
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs"
              >
                <option value="">All meals</option>
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
              <input
                type="text"
                value={mealPrefs}
                onChange={(e) => setMealPrefs(e.target.value)}
                placeholder="Preferences (e.g., vegetarian, high protein)"
                className="glass-input flex-1 rounded-xl px-3 py-2 text-xs"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
                <p className="text-sm text-text-muted">Creating meal suggestions...</p>
              </div>
            ) : meals ? (
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

                    {/* Macros */}
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

                    {/* Ingredients */}
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
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <ChefHat className="h-10 w-10 text-text-muted" />
                <p className="text-sm text-text-muted">Get personalized Indian meal suggestions</p>
                <p className="text-xs text-text-muted">Based on your goals and nutritional needs</p>
              </div>
            )}
          </div>
        )}

        {/* Workout Tab */}
        {activeTab === 'workout' && (
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-text-primary">AI Workout Plan</h2>
              <button
                onClick={handleGenerate}
                disabled={loading || !hasApiKey}
                className="glass-button-primary flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dumbbell className="h-4 w-4" />}
                {workout ? 'New Plan' : 'Generate Plan'}
              </button>
            </div>

            {/* Preferences */}
            <div className="mb-4 flex flex-wrap gap-3">
              <select
                value={focusArea}
                onChange={(e) => setFocusArea(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs"
              >
                <option value="">Any focus</option>
                <option value="upper body">Upper Body</option>
                <option value="lower body">Lower Body</option>
                <option value="full body">Full Body</option>
                <option value="core">Core</option>
                <option value="cardio">Cardio</option>
                <option value="flexibility">Flexibility</option>
              </select>
              <select
                value={workoutDuration}
                onChange={(e) => setWorkoutDuration(e.target.value)}
                className="glass-input rounded-xl px-3 py-2 text-xs"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">60 minutes</option>
              </select>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-8 w-8 animate-spin text-accent-violet" />
                <p className="text-sm text-text-muted">Creating your workout plan...</p>
              </div>
            ) : workout ? (
              <div>
                {/* Plan Header */}
                <div className="mb-4 rounded-xl bg-white/[0.03] p-4">
                  <p className="text-base font-semibold text-text-primary">{workout.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">{workout.description}</p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-accent-amber" />
                      <span className="text-xs text-text-secondary">{workout.durationMinutes} min</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 text-accent-rose" />
                      <span className="text-xs text-text-secondary">~{workout.estimatedCalories} kcal</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Dumbbell className="h-3.5 w-3.5 text-accent-violet" />
                      <span className="text-xs text-text-secondary">{workout.exercises.length} exercises</span>
                    </div>
                  </div>
                </div>

                {/* Exercise List */}
                <div className="space-y-2">
                  {workout.exercises.map((ex, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-violet/10 text-xs font-bold text-accent-violet">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary">{ex.name}</p>
                        <p className="text-xs text-text-muted capitalize">{ex.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-text-primary">
                          {ex.sets} × {ex.reps}
                        </p>
                        <p className="text-[10px] text-text-muted">{ex.restSeconds}s rest</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <Dumbbell className="h-10 w-10 text-text-muted" />
                <p className="text-sm text-text-muted">Get a custom workout plan</p>
                <p className="text-xs text-text-muted">Tailored to your goals and fitness level</p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent-rose/20 bg-accent-rose/5 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent-rose" />
            <p className="text-xs text-accent-rose">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

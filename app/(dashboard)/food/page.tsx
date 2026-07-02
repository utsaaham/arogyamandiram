'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  Utensils,
  Trash2,
  X,
  BarChart3,
} from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import ProgressRing from '@/components/ui/ProgressRing';
import MacroBar from '@/components/ui/MacroBar';
import MetricChart from '@/components/ui/MetricChart';
import FoodResultCard from '@/components/food/FoodResultCard';
import RecentFoodCard from '@/components/food/RecentFoodCard';
import AddMealModal from '@/components/food/AddMealModal';
import HabitsCard from '@/components/food/HabitsCard';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { FOOD_FILTER_OPTIONS, type FoodCategoryFilter } from '@/lib/foodCategories';
import { getTargetsForUser } from '@/lib/health';
import {
  cn,
  formatNumber,
  formatTime,
  calcPercent,
  getToday,
} from '@/lib/utils';

interface FoodItem {
  id: string;
  name: string;
  category: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  isVegetarian: boolean;
}

const mealLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

const tabs: Array<{ key: FoodCategoryFilter | 'logged' | 'recent'; label: string }> = [
  { key: 'logged', label: 'Logged' },
  { key: 'recent', label: 'Recent' },
  ...FOOD_FILTER_OPTIONS,
];

export default function FoodLogPage() {
  const { user, loading: userLoading } = useUser();
  const { log, loading: logLoading, refetch } = useDailyLog();
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentFoods, setRecentFoods] = useState<{ name: string; lastDate: string; count: number }[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<FoodCategoryFilter | 'logged' | 'recent'>('all');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [addingMeal, setAddingMeal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [calorieHistory, setCalorieHistory] = useState<{ date: string; totalCalories: number }[]>([]);
  const [calorieHistoryLoading, setCalorieHistoryLoading] = useState(true);
  const [caloriePeriod, setCaloriePeriod] = useState(7);

  const searchTimerRef = useRef<NodeJS.Timeout>();
  const today = getToday();

  // Search with debounce
  const doSearch = useCallback(async (q: string, cat: string) => {
    setSearching(true);
    try {
      const categoryParam = cat !== 'all' ? cat : undefined;
      const res = await api.searchFoods(q, categoryParam);
      if (res.success && res.data) {
        const data = res.data as { foods?: FoodItem[]; edamamFoods?: FoodItem[] };
        const combined = [...(data.foods || []), ...(data.edamamFoods || [])];
        setResults(combined);
      } else if (!res.success) {
        showToast('Food search failed. Check your connection and try again.', 'error');
      }
    } catch {
      showToast('Food search failed. Check your connection and try again.', 'error');
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const cat = selectedTab === 'recent' || selectedTab === 'logged' ? 'all' : selectedTab;
    if (value.length > 0 && value.length < 3) return; // wait for 3+ chars
    searchTimerRef.current = setTimeout(() => doSearch(value, cat), 600);
  };

  const handleTabChange = (key: FoodCategoryFilter | 'logged' | 'recent') => {
    setSelectedTab(key);
    if (key === 'recent' || key === 'logged') return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    doSearch(query, key);
  };

  // Load initial foods on mount
  useEffect(() => {
    doSearch('', 'all');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load recent foods once
  useEffect(() => {
    let cancelled = false;
    setRecentLoading(true);
    api.getRecentFoods(30, 60).then((res) => {
      if (!res.success || !res.data || cancelled) return;
      const data = res.data as { recentFoods?: { name: string; lastDate: string; count: number }[] };
      setRecentFoods(data.recentFoods || []);
    }).catch(() => {
      if (!cancelled) {
        setRecentFoods([]);
      }
    }).finally(() => {
      if (!cancelled) {
        setRecentLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Load calorie history for chart
  useEffect(() => {
    let cancelled = false;

    const fetchHistory = async () => {
      setCalorieHistoryLoading(true);
      try {
        const res = await api.getCaloriesHistory(caloriePeriod);
        if (res.success && res.data && !cancelled) {
          const data = res.data as { history?: { date: string; totalCalories: number }[] };
          setCalorieHistory(data.history || []);
        }
      } catch {
        if (!cancelled) {
          setCalorieHistory([]);
        }
      } finally {
        if (!cancelled) {
          setCalorieHistoryLoading(false);
        }
      }
    };

    fetchHistory();

    return () => {
      cancelled = true;
    };
  }, [caloriePeriod]);

  // The API returns first 20 foods when query is empty

  const handleAddMeal = async (meal: Record<string, unknown>) => {
    setAddingMeal(true);
    try {
      const res = await api.addMeal(today, meal);
      if (res.success) {
        showToast(`${meal.name} added to ${mealLabels[(meal.mealType as string) || 'snack']}`, 'success');
        setSelectedFood(null);
        refetch();
      } else {
        showToast(res.error || 'Failed to add meal', 'error');
      }
    } catch {
      showToast('Failed to add meal', 'error');
    } finally {
      setAddingMeal(false);
    }
  };

  const handleRemoveMeal = async (mealId: string | undefined, index?: number) => {
    const key = mealId ?? `index-${index}`;
    setDeletingId(key);
    try {
      const res = await api.removeMeal(today, mealId, index);
      if (res.success) {
        showToast('Meal removed', 'info');
        refetch();
      } else {
        showToast(res.error || 'Failed to remove meal', 'error');
      }
    } catch {
      showToast('Failed to remove meal', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const loading = userLoading || logLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <CardSkeleton className="h-16" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <CardSkeleton className="lg:col-span-2 h-96" />
          <CardSkeleton className="h-96" />
        </div>
      </div>
    );
  }

  const targets = getTargetsForUser(user ?? undefined);
  const totalCal = log?.totalCalories || 0;
  const calPercent = calcPercent(totalCal, targets.dailyCalories);
  const meals = log?.meals || [];

  return (
    <div className="food-page animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop min-h-screen">
      <DashboardPageShell
        title="Food Log"
        subtitle="Nourish your day with smarter meal tracking"
        icon={Utensils}
        mobileVariant="card"
      />

      <div className="mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '160ms' }}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-4">
        {/* Left Column: Search + Results */}
        <div className="flex flex-col gap-4 lg:col-span-2 lg:h-[760px]">
          {/* Search bar + Tabs (search bar always visible; only content in box changes by tab) */}
          <div className="shrink-0 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/70 py-3 pl-10 pr-10 text-base text-neutral-100 shadow-none outline-none ring-0 placeholder:text-neutral-500 sm:text-sm"
                placeholder="Search foods... try 'chicken', 'salad', 'rice bowl'"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    doSearch('', selectedTab === 'recent' ? 'all' : selectedTab);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-emerald-400"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Recent, All, and category tabs in one row */}
            <div className="hide-scrollbar flex gap-2 overflow-x-auto p-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabChange(tab.key)}
                  className={cn(
                    'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                    selectedTab === tab.key
                      ? 'bg-emerald-500/15 text-neutral-400 border border-white/10'
                      : 'bg-neutral-900/70 text-neutral-400 hover:bg-neutral-800 border border-transparent'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Single content area: recent items or search results */}
          <div className="dashboard-unified-card flex min-h-0 flex-col rounded-2xl border p-4 sm:p-5 lg:min-h-0 lg:flex-1">
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1 hide-scrollbar lg:min-h-0">
            {selectedTab === 'logged' ? (
              meals.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Utensils className="h-8 w-8 text-neutral-400" />
                  <p className="text-sm text-neutral-400">Nothing on your plate yet</p>
                  <p className="text-xs text-neutral-500">Search above, or just tell the assistant what you ate.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Nutrition breakdown — mobile only (hidden on lg where right column shows it) */}
                  <div className="lg:hidden mb-4 flex flex-col items-center gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
                    <ProgressRing
                      progress={calPercent}
                      size={120}
                      strokeWidth={10}
                      color={calPercent > 100 ? 'stroke-accent-rose' : 'stroke-accent-emerald'}
                      value={formatNumber(Math.round(totalCal))}
                      label="kcal consumed"
                      sublabel={`of ${formatNumber(targets.dailyCalories)}`}
                      valueClassName="text-lg font-bold text-neutral-400"
                      labelClassName="text-[10px] font-medium text-neutral-400"
                    />
                    <div className="w-full space-y-3">
                      <MacroBar label="Protein" current={log?.totalProtein || 0} target={targets.protein} color="bg-accent-violet/70" bgColor="bg-accent-violet/20" />
                      <MacroBar label="Carbs" current={log?.totalCarbs || 0} target={targets.carbs} color="bg-accent-emerald/70" bgColor="bg-accent-emerald/20" />
                      <MacroBar label="Fat" current={log?.totalFat || 0} target={targets.fat} color="bg-accent-rose/70" bgColor="bg-accent-rose/20" />
                      <MacroBar label="Fiber" current={log?.totalFiber || 0} target={25} unit="g" color="bg-accent-emerald/70" bgColor="bg-accent-emerald/20" />
                      <MacroBar label="Sugar" current={log?.totalSugar || 0} target={50} unit="g" color="bg-emerald-400/70" bgColor="bg-emerald-400/20" />
                      <MacroBar label="Sodium" current={log?.totalSodium || 0} target={2300} unit=" mg" color="bg-sky-500/70" bgColor="bg-sky-500/20" />
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-neutral-400">Today&apos;s logged ({meals.length})</p>
                  {meals.map((meal, i) => {
                    const mealId = meal._id ?? (meal as { id?: string }).id;
                    const deleteKey = mealId ?? `index-${i}`;
                    return (
                      <div
                        key={mealId || i}
                        className="group flex items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-neutral-400">{meal.name}</p>
                          <p className="text-[11px] text-neutral-400">
                            {meal.quantity}{meal.unit} · {mealLabels[meal.mealType || 'snack']}{meal.time ? ` · ${formatTime(meal.time)}` : ''}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-0.5">
                            <span className="text-[10px] text-violet-400">{Math.round(meal.protein)}g P</span>
                            <span className="text-[10px] text-emerald-400">{Math.round(meal.carbs)}g C</span>
                            <span className="text-[10px] text-rose-400">{Math.round(meal.fat)}g F</span>
                            <span className="text-[10px] text-emerald-300">{Math.round(meal.fiber ?? 0)}g Fi</span>
                            <span className="text-[10px] text-yellow-400">{Math.round(meal.sugar ?? 0)}g S</span>
                            <span className="text-[10px] text-sky-400">{Math.round(meal.sodium ?? 0)}mg Na</span>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-neutral-400">
                          {Math.round(meal.calories)} kcal
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMeal(mealId, i);
                          }}
                          disabled={deletingId === deleteKey}
                          title="Remove meal"
                          className="shrink-0 rounded p-1 text-neutral-500 opacity-100 transition-all hover:bg-red-500/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          {deletingId === deleteKey ? (
                            <div className="h-3 w-3 animate-spin rounded-full border border-accent-rose border-t-transparent" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            ) : selectedTab === 'recent' ? (
              recentLoading ? (
              <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                </div>
              ) : recentFoods.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Utensils className="h-8 w-8 text-neutral-600" />
                  <p className="text-sm text-neutral-400">We will remember foods you log here.</p>
                  <p className="text-xs text-neutral-500">Pick a category and log a meal to see recent items.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="mb-3 text-xs text-neutral-400">
                    Your recent foods ({recentFoods.length})
                  </p>
                  {recentFoods.map((item) => (
                    <RecentFoodCard
                      key={item.name}
                      name={item.name}
                      count={item.count}
                      onSelect={() => {
                        setSelectedTab('all');
                        setQuery(item.name);
                        doSearch(item.name, 'all');
                      }}
                    />
                  ))}
                </div>
              )
            ) : searching ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
              </div>
            ) : results.length > 0 ? (
              <div
                className="space-y-2"
                style={isMobile ? { maxHeight: '420px', overflowY: 'auto' } : undefined}
              >
                {results.map((food) => (
                  <FoodResultCard
                    key={food.id}
                    food={food}
                    onSelect={() => setSelectedFood(food)}
                  />
                ))}
              </div>
            ) : query || selectedTab !== 'all' ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Utensils className="h-8 w-8 text-neutral-600" />
                <p className="text-sm text-neutral-400">No foods found</p>
                <p className="text-xs text-neutral-500">
                  Can&apos;t find it? Tell the assistant what you ate and we&apos;ll log it for you.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Search className="h-8 w-8 text-neutral-600" />
                <p className="text-sm text-neutral-400">Search foods to add</p>
                <p className="text-xs text-neutral-500">150+ built-in items plus broader search fallback</p>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Right Column: Today's Log */}
        <div className="flex flex-col gap-4 lg:h-[760px]">
          {/* Calorie Summary */}
          <div className="dashboard-unified-card flex flex-col items-center gap-4 rounded-2xl border p-4 sm:p-6">
            <ProgressRing
              progress={calPercent}
              size={120}
              strokeWidth={10}
              color={calPercent > 100 ? 'stroke-accent-rose' : 'stroke-accent-emerald'}
              value={formatNumber(Math.round(totalCal))}
              label="kcal consumed"
              sublabel={`of ${formatNumber(targets.dailyCalories)}`}
              valueClassName="text-lg font-bold text-neutral-400"
              labelClassName="text-[10px] font-medium text-neutral-400"
            />
            <div className="w-full space-y-3">
              <MacroBar
                label="Protein"
                current={log?.totalProtein || 0}
                target={targets.protein}
                color="bg-accent-violet/70"
                bgColor="bg-accent-violet/20"
              />
              <MacroBar
                label="Carbs"
                current={log?.totalCarbs || 0}
                target={targets.carbs}
                color="bg-accent-emerald/70"
                bgColor="bg-accent-emerald/20"
              />
              <MacroBar
                label="Fat"
                current={log?.totalFat || 0}
                target={targets.fat}
                color="bg-accent-rose/70"
                bgColor="bg-accent-rose/20"
              />
              <MacroBar
                label="Fiber"
                current={log?.totalFiber || 0}
                target={25}
                unit="g"
                color="bg-accent-emerald/70"
                bgColor="bg-accent-emerald/20"
              />
              <MacroBar
                label="Sugar"
                current={log?.totalSugar || 0}
                target={50}
                unit="g"
                color="bg-emerald-400/70"
                bgColor="bg-emerald-400/20"
              />
              <MacroBar
                label="Sodium"
                current={log?.totalSodium || 0}
                target={2300}
                unit=" mg"
                color="bg-sky-500/70"
                bgColor="bg-sky-500/20"
              />
            </div>
          </div>

          {/* Today's habits (meals stay under the Logged tab on the left) */}
          <HabitsCard log={log} targets={targets} onSaved={refetch} />
        </div>
      </div>

      {/* Daily calories history – hidden on mobile */}
      <div className="dashboard-unified-card hidden rounded-2xl border p-4 sm:p-6 lg:mt-4 lg:block">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-400" />
            <h2 className="text-base font-semibold text-neutral-400">Daily Calories</h2>
          </div>
          <div className="flex gap-1.5">
            {[
              { key: 7, label: '7D' },
              { key: 14, label: '2W' },
              { key: 30, label: '1M' },
              { key: 90, label: '3M' },
            ].map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setCaloriePeriod(opt.key)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  caloriePeriod === opt.key
                    ? 'bg-white/[0.08] text-neutral-400'
                    : 'bg-white/[0.02] text-neutral-400/70 hover:bg-white/[0.06]',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {calorieHistoryLoading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
          </div>
        ) : (
          <>
            <MetricChart
              data={calorieHistory.map((entry) => ({
                date: entry.date,
                value: entry.totalCalories,
              }))}
              color="#10b981"
              gradientId="caloriesGrad"
              gradientFrom="#064e3b"
              gradientTo="#020617"
              unit=""
              tooltipUnit=" kcal"
              formatY={(v) => formatNumber(Math.round(v))}
              height={240}
              targetValue={targets.dailyCalories}
              targetLabel={`Goal: ${formatNumber(targets.dailyCalories)} kcal`}
            />
            {calorieHistory.length > 0 && (() => {
              const logged = calorieHistory.filter((e) => e.totalCalories > 0);
              const avg = logged.length > 0
                ? Math.round(logged.reduce((s, e) => s + e.totalCalories, 0) / logged.length)
                : 0;
              const best = logged.length > 0 ? Math.max(...logged.map((e) => e.totalCalories)) : 0;
              return (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-black/40 p-3 text-center shadow-lg">
                    <p className="text-lg font-semibold text-neutral-400">{formatNumber(avg)} kcal</p>
                    <p className="text-[11px] text-neutral-400/70">Daily Average</p>
                  </div>
                  <div className="rounded-xl bg-black/40 p-3 text-center shadow-lg">
                    <p className="text-lg font-semibold text-neutral-400">{`${logged.length}/${calorieHistory.length}`}</p>
                    <p className="text-[11px] text-neutral-400/70">Days Logged</p>
                  </div>
                  <div className="rounded-xl bg-black/40 p-3 text-center shadow-lg">
                    <p className="text-lg font-semibold text-neutral-400">{formatNumber(best)} kcal</p>
                    <p className="text-[11px] text-neutral-400/70">Highest Day</p>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
      </div>

      {/* Modals */}
      {selectedFood && (
        <AddMealModal
          food={selectedFood}
          onClose={() => setSelectedFood(null)}
          onAdd={(meal) => handleAddMeal(meal as Record<string, unknown>)}
          loading={addingMeal}
        />
      )}

    </div>
  );
}

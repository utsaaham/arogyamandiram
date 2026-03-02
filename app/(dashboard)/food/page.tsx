'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Search,
  Utensils,
  Trash2,
  Coffee,
  Sun,
  Moon,
  Cookie,
  PlusCircle,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import ProgressRing from '@/components/ui/ProgressRing';
import MacroBar from '@/components/ui/MacroBar';
import MetricChart from '@/components/ui/MetricChart';
import FoodResultCard from '@/components/food/FoodResultCard';
import RecentFoodCard from '@/components/food/RecentFoodCard';
import AddMealModal from '@/components/food/AddMealModal';
import CustomFoodModal from '@/components/food/CustomFoodModal';
import AIFoodLoggerModal from '@/components/food/AIFoodLoggerModal';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { showToast } from '@/components/ui/Toast';
import { useDailyLog } from '@/hooks/useDailyLog';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { getTargetsForUser } from '@/lib/health';
import {
  cn,
  formatNumber,
  formatTime,
  calcPercent,
  getToday,
  formatDate,
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

const mealIcons: Record<string, typeof Coffee> = {
  breakfast: Coffee,
  lunch: Sun,
  dinner: Moon,
  snack: Cookie,
};

const mealLabels: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

const categories = [
  { key: 'all', label: 'All' },
  { key: 'curry', label: 'Curries' },
  { key: 'dal', label: 'Dals' },
  { key: 'bread', label: 'Breads' },
  { key: 'rice', label: 'Rice' },
  { key: 'snack', label: 'Snacks' },
  { key: 'street_food', label: 'Street Food' },
  { key: 'sweet', label: 'Sweets' },
  { key: 'beverage', label: 'Drinks' },
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'chutney', label: 'Chutneys' },
  { key: 'raita', label: 'Raita' },
  { key: 'salad', label: 'Salads' },
  { key: 'non_veg', label: 'Non-Veg' },
  { key: 'seafood', label: 'Seafood' },
  { key: 'fruit', label: 'Fruits' },
  { key: 'dry_fruit', label: 'Dry Fruits' },
  { key: 'other', label: 'Other' },
];

const tabs = [{ key: 'recent', label: 'Recent' }, ...categories];

export default function FoodLogPage() {
  const { user, loading: userLoading } = useUser();
  const { log, loading: logLoading, refetch } = useDailyLog();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [recentFoods, setRecentFoods] = useState<{ name: string; lastDate: string; count: number }[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [showAILogger, setShowAILogger] = useState(false);
  const [addingMeal, setAddingMeal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedMealType, setExpandedMealType] = useState<string | null>(null);
  const [calorieHistory, setCalorieHistory] = useState<{ date: string; totalCalories: number }[]>([]);
  const [calorieHistoryLoading, setCalorieHistoryLoading] = useState(true);
  const [caloriePeriod, setCaloriePeriod] = useState(30);

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
      }
    } catch {
      // silently handle
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const cat = selectedTab === 'recent' ? 'all' : selectedTab;
    searchTimerRef.current = setTimeout(() => doSearch(value, cat), 300);
  };

  const handleTabChange = (key: string) => {
    setSelectedTab(key);
    if (key === 'recent') return;
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
        setShowCustom(false);
        setShowAILogger(false);
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

  const handleRemoveMeal = async (mealId: string) => {
    setDeletingId(mealId);
    try {
      const res = await api.removeMeal(today, mealId);
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

  // Group meals
  const mealGroups = meals.reduce<Record<string, typeof meals>>((acc, meal) => {
    const type = meal.mealType || 'snack';
    if (!acc[type]) acc[type] = [];
    acc[type].push(meal);
    return acc;
  }, {});

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Food Log</h1>
          <p className="text-sm text-text-muted">{formatDate(today)}</p>
        </div>
        <div className="flex min-h-[44px] flex-wrap items-center gap-2 sm:mt-0">
          <button
            onClick={() => setShowCustom(true)}
            className="glass-button-secondary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            <PlusCircle className="h-4 w-4" />
            Custom Food
          </button>
          {user?.hasOpenAiKey && (
            <button
              onClick={() => setShowAILogger(true)}
              className="glass-button-secondary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              <Sparkles className="h-4 w-4" />
              AI Logger
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Search + Results */}
        <div className="space-y-4 lg:col-span-2">
          {/* Search bar + Tabs (search bar always visible; only content in box changes by tab) */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="glass-input w-full rounded-xl py-3 pl-10 pr-10 text-base sm:text-sm"
                placeholder="Search foods... try 'paneer', 'dosa', 'biryani'"
              />
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    doSearch('', selectedTab === 'recent' ? 'all' : selectedTab);
                  }}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
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
                    'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    selectedTab === tab.key
                      ? tab.key === 'recent'
                        ? 'bg-accent-emerald/15 text-accent-emerald ring-1 ring-accent-emerald/30'
                        : 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                      : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Single content area: recent items or search results */}
          <div className="glass-card rounded-2xl p-4 sm:p-5">
            {selectedTab === 'recent' ? (
              recentLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-emerald border-t-transparent" />
                </div>
              ) : recentFoods.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Utensils className="h-8 w-8 text-text-muted" />
                  <p className="text-sm text-text-muted">We will remember foods you log here.</p>
                  <p className="text-xs text-text-muted">Pick a category and log a meal to see recent items.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 hide-scrollbar">
                  <p className="mb-3 text-xs text-text-muted">
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
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1 hide-scrollbar">
                <p className="mb-3 text-xs text-text-muted">{results.length} results</p>
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
                <Utensils className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">No foods found</p>
                <button
                  onClick={() => setShowCustom(true)}
                  className="text-xs font-medium text-accent-violet hover:underline"
                >
                  Add custom food instead
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <Search className="h-8 w-8 text-text-muted" />
                <p className="text-sm text-text-muted">Search for Indian foods to add</p>
                <p className="text-xs text-text-muted">150+ items: curries, dals, breads, sweets & more</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Today's Log */}
        <div className="flex flex-col gap-4">
          {/* Calorie Summary */}
          <div className="glass-card flex flex-col items-center gap-4 rounded-2xl p-4 sm:p-6">
            <ProgressRing
              progress={calPercent}
              size={120}
              strokeWidth={10}
              color={calPercent > 100 ? 'stroke-accent-rose' : 'stroke-accent-emerald'}
              value={formatNumber(Math.round(totalCal))}
              label="kcal consumed"
              sublabel={`of ${formatNumber(targets.dailyCalories)}`}
            />
            <div className="w-full space-y-3">
              <MacroBar
                label="Protein"
                current={log?.totalProtein || 0}
                target={targets.protein}
                color="bg-accent-violet"
                bgColor="bg-accent-violet/10"
              />
              <MacroBar
                label="Carbs"
                current={log?.totalCarbs || 0}
                target={targets.carbs}
                color="bg-accent-amber"
                bgColor="bg-accent-amber/10"
              />
              <MacroBar
                label="Fat"
                current={log?.totalFat || 0}
                target={targets.fat}
                color="bg-accent-rose"
                bgColor="bg-accent-rose/10"
              />
              <MacroBar
                label="Fiber"
                current={log?.totalFiber || 0}
                target={25}
                unit="g"
                color="bg-accent-emerald"
                bgColor="bg-accent-emerald/10"
              />
              <MacroBar
                label="Sugar"
                current={log?.totalSugar || 0}
                target={50}
                unit="g"
                color="bg-amber-400"
                bgColor="bg-amber-400/10"
              />
              <MacroBar
                label="Sodium"
                current={log?.totalSodium || 0}
                target={2300}
                unit=" mg"
                color="bg-sky-500"
                bgColor="bg-sky-500/10"
              />
            </div>
          </div>

          {/* Logged Meals */}
          <div className="glass-card flex-1 rounded-2xl p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">Logged Meals</h3>
              <span className="text-xs text-text-muted">{meals.length} items</span>
            </div>

            {meals.length === 0 ? (
              <div className="py-6 text-center">
                <Utensils className="mx-auto h-6 w-6 text-text-muted" />
                <p className="mt-2 text-xs text-text-muted">No meals logged yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {['breakfast', 'lunch', 'dinner', 'snack'].map((type) => {
                  const items = mealGroups[type];
                  if (!items || items.length === 0) return null;
                  const MealIcon = mealIcons[type] || Utensils;
                  const groupCals = items.reduce((s, m) => s + m.calories, 0);
                  const isExpanded = expandedMealType === type;

                  return (
                    <div key={type} className="rounded-xl bg-white/[0.03]">
                      <button
                        onClick={() => setExpandedMealType(isExpanded ? null : type)}
                        className="flex w-full items-center gap-3 px-3 py-2.5"
                      >
                        <MealIcon className="h-4 w-4 text-text-secondary" />
                        <span className="flex-1 text-left text-xs font-medium text-text-primary">
                          {mealLabels[type]}
                          <span className="ml-1 text-text-muted">({items.length})</span>
                        </span>
                        <span className="text-xs font-semibold text-text-secondary">
                          {Math.round(groupCals)} kcal
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-text-muted" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="space-y-1 border-t border-white/[0.04] px-3 py-2">
                          {items.map((meal, i) => (
                            <div
                              key={meal._id || i}
                              className="group flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]"
                            >
                              {meal.isCustom ? (
                                <PlusCircle className="h-3 w-3 shrink-0 text-accent-amber" />
                              ) : (
                                <div className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full',
                                  // Approximate veg detection by name
                                  'bg-accent-emerald'
                                )} />
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-text-primary">{meal.name}</p>
                                <p className="text-[10px] text-text-muted">
                                  {meal.quantity}{meal.unit} · {formatTime(meal.time)}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs text-text-secondary">
                                {Math.round(meal.calories)}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (meal._id) handleRemoveMeal(meal._id);
                                }}
                                disabled={deletingId === meal._id}
                                className="ml-1 shrink-0 rounded p-1 text-text-muted opacity-100 transition-all hover:bg-accent-rose/10 hover:text-accent-rose sm:opacity-0 sm:group-hover:opacity-100"
                              >
                                {deletingId === meal._id ? (
                                  <div className="h-3 w-3 animate-spin rounded-full border border-accent-rose border-t-transparent" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily calories history */}
      <div className="glass-card mt-2 rounded-2xl p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-text-primary">Daily Calories</h2>
          <div className="flex gap-1.5">
            {[7, 30].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setCaloriePeriod(opt)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  caloriePeriod === opt
                    ? 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                    : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                )}
              >
                {opt === 7 ? '7D' : '1M'}
              </button>
            ))}
          </div>
        </div>

        {calorieHistoryLoading ? (
          <div className="flex h-56 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
          </div>
        ) : (
          <MetricChart
            data={calorieHistory.map((entry) => ({
              date: entry.date,
              value: entry.totalCalories,
            }))}
            color="#f97316"
            gradientId="caloriesGrad"
            unit=""
            tooltipUnit=" kcal"
            formatY={(v) => formatNumber(Math.round(v))}
            height={200}
          />
        )}
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

      {showCustom && (
        <CustomFoodModal
          onClose={() => setShowCustom(false)}
          onAdd={(meal) => handleAddMeal(meal as Record<string, unknown>)}
          loading={addingMeal}
        />
      )}

      {showAILogger && (
        <AIFoodLoggerModal
          onClose={() => setShowAILogger(false)}
          onAdd={(meal) => handleAddMeal(meal as Record<string, unknown>)}
          loading={addingMeal}
        />
      )}
    </div>
  );
}

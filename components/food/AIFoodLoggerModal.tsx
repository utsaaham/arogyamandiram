'use client';

import { useState } from 'react';
import { X, Sparkles, Coffee, Sun, Moon, Cookie, Plus } from 'lucide-react';
import { cn, getCurrentTime } from '@/lib/utils';
import api from '@/lib/apiClient';

interface AIFoodLoggerModalProps {
  onClose: () => void;
  onAdd: (meal: {
    foodId: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar?: number;
    sodium?: number;
    saturatedFat?: number;
    cholesterol?: number;
    quantity: number;
    unit: string;
    mealType: string;
    time: string;
    isCustom: boolean;
  }) => void;
  loading?: boolean;
}

const mealTypes = [
  { key: 'breakfast', label: 'Breakfast', icon: Coffee },
  { key: 'lunch', label: 'Lunch', icon: Sun },
  { key: 'dinner', label: 'Dinner', icon: Moon },
  { key: 'snack', label: 'Snack', icon: Cookie },
];

function getDefaultMealType(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

interface ParsedMeal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  cholesterol?: number;
  quantity: number;
  unit: string;
}

export default function AIFoodLoggerModal({ onClose, onAdd, loading }: AIFoodLoggerModalProps) {
  const [text, setText] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [meal, setMeal] = useState<ParsedMeal | null>(null);
  const [mealType, setMealType] = useState(getDefaultMealType());
  const [time, setTime] = useState(getCurrentTime());

  const handleLookup = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError('');
    setFetching(true);
    try {
      const res = await api.aiFoodLogger(trimmed);
      if (res.success && res.data?.meal) {
        const m = res.data.meal as ParsedMeal;
        setMeal({
          name: m.name ?? 'Meal',
          calories: Number(m.calories) || 0,
          protein: Number(m.protein) || 0,
          carbs: Number(m.carbs) || 0,
          fat: Number(m.fat) || 0,
          fiber: Number(m.fiber) || 0,
          sugar: m.sugar != null ? Number(m.sugar) : undefined,
          sodium: m.sodium != null ? Number(m.sodium) : undefined,
          saturatedFat: m.saturatedFat != null ? Number(m.saturatedFat) : undefined,
          cholesterol: m.cholesterol != null ? Number(m.cholesterol) : undefined,
          quantity: Number(m.quantity) || 1,
          unit: m.unit ?? 'serving',
        });
      } else {
        setError(res.error || 'Could not get nutrition. Try again.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setFetching(false);
    }
  };

  const handleAdd = () => {
    if (!meal) return;
    onAdd({
      foodId: `ai-${Date.now()}`,
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      fiber: meal.fiber,
      sugar: meal.sugar,
      sodium: meal.sodium,
      saturatedFat: meal.saturatedFat,
      cholesterol: meal.cholesterol,
      quantity: meal.quantity,
      unit: meal.unit,
      mealType,
      time,
      isCustom: true,
    });
  };

  const handleBack = () => {
    setMeal(null);
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/[0.06] bg-bg-surface p-6 shadow-2xl animate-slide-up">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-violet" />
            AI Food Logger
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!meal ? (
          <>
            <p className="mt-4 text-sm text-text-muted">What do you want to log today?</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., 2 idlis and sambar, chicken sandwich and fries"
              className="glass-input mt-2 min-h-[100px] w-full rounded-xl px-3 py-2.5 text-sm resize-y"
              disabled={fetching}
              rows={3}
            />
            {error && <p className="mt-2 text-xs text-accent-rose">{error}</p>}
            <button
              onClick={handleLookup}
              disabled={fetching || !text.trim()}
              className="glass-button-primary mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {fetching ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Look up nutrition
                </>
              )}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleBack}
              className="mt-2 text-xs text-accent-violet hover:underline"
            >
              ← Change description
            </button>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-text-primary">{meal.name}</p>
                <p className="text-xs text-text-muted">
                  {meal.quantity} {meal.unit} · {Math.round(meal.calories)} kcal
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-text-muted">Protein</span>
                <span className="text-text-primary font-medium">{meal.protein}g</span>
                <span className="text-text-muted">Carbs</span>
                <span className="text-text-primary font-medium">{meal.carbs}g</span>
                <span className="text-text-muted">Fat</span>
                <span className="text-text-primary font-medium">{meal.fat}g</span>
                <span className="text-text-muted">Fiber</span>
                <span className="text-text-primary font-medium">{meal.fiber}g</span>
                {meal.sugar != null && meal.sugar > 0 && (
                  <>
                    <span className="text-text-muted">Sugar</span>
                    <span className="text-text-primary font-medium">{meal.sugar}g</span>
                  </>
                )}
                {meal.sodium != null && meal.sodium > 0 && (
                  <>
                    <span className="text-text-muted">Sodium</span>
                    <span className="text-text-primary font-medium">{meal.sodium} mg</span>
                  </>
                )}
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Meal type</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {mealTypes.map((mt) => (
                    <button
                      key={mt.key}
                      type="button"
                      onClick={() => setMealType(mt.key)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition-all',
                        mealType === mt.key
                          ? 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                          : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06]'
                      )}
                    >
                      <mt.icon className="h-4 w-4" />
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="glass-button-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add to log
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

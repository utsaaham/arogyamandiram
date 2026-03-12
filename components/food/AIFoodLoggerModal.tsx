'use client';

import { useState, useCallback } from 'react';
import { X, Sparkles, Coffee, Sun, Moon, Cookie, Plus, Flame } from 'lucide-react';
import { cn, getCurrentTime } from '@/lib/utils';
import api from '@/lib/apiClient';

const CALORIE_MIN = 0;
const CALORIE_MAX = 2000;

type MealPayload = {
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
};

interface AIFoodLoggerModalProps {
  onClose: () => void;
  onAdd: (meal: MealPayload) => void;
  onAddBatch?: (meals: MealPayload[]) => void;
  onDebugLog?: (log: unknown) => void;
  loading?: boolean;
}

const mealTypes = [
  { key: 'breakfast', label: 'Breakfast', icon: Coffee },
  { key: 'lunch', label: 'Lunch', icon: Sun },
  { key: 'dinner', label: 'Dinner', icon: Moon },
  { key: 'snack', label: 'Snack', icon: Cookie },
];

const MEAL_TIME_MAP: Record<string, [number, number]> = {
  breakfast: [5, 11],
  lunch: [11, 15],
  dinner: [17, 21],
  snack: [0, 24],
};

function getDefaultMealType(): string {
  const hour = new Date().getHours();
  for (const [key, [start, end]] of Object.entries(MEAL_TIME_MAP)) {
    if (key === 'snack') continue;
    if (hour >= start && hour < end) return key;
  }
  return 'snack';
}

type AINutritionItem = {
  name?: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  saturatedFat?: number;
  cholesterol?: number;
  quantity?: number;
  unit?: string;
};

export interface ParsedItem {
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

function safeNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v)) return v;
  return undefined;
}

function safeString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

function clampMacro(val: number | undefined): number {
  return Math.max(0, val ?? 0);
}

function parseItem(obj: AINutritionItem): ParsedItem {
  const name = safeString(obj.name);
  if (!name) {
    throw new Error('AI returned an item with missing or empty name');
  }

  const caloriesRaw = safeNumber(obj.calories);
  if (caloriesRaw === undefined) {
    throw new Error(`AI returned item "${name}" with missing or invalid calories`);
  }
  if (caloriesRaw < CALORIE_MIN || caloriesRaw > CALORIE_MAX) {
    throw new Error(
      `AI returned item "${name}" with invalid calories (${caloriesRaw}). Expected 0–${CALORIE_MAX} kcal.`
    );
  }

  const quantity = Math.max(0.1, safeNumber(obj.quantity) ?? 1);
  const unit = safeString(obj.unit)?.trim() || 'g';

  return {
    name,
    calories: Math.round(caloriesRaw),
    protein: clampMacro(safeNumber(obj.protein)),
    carbs: clampMacro(safeNumber(obj.carbs)),
    fat: clampMacro(safeNumber(obj.fat)),
    fiber: clampMacro(safeNumber(obj.fiber)),
    sugar: safeNumber(obj.sugar) !== undefined ? clampMacro(safeNumber(obj.sugar)) : undefined,
    sodium: safeNumber(obj.sodium) !== undefined ? clampMacro(safeNumber(obj.sodium)) : undefined,
    saturatedFat:
      safeNumber(obj.saturatedFat) !== undefined ? clampMacro(safeNumber(obj.saturatedFat)) : undefined,
    cholesterol:
      safeNumber(obj.cholesterol) !== undefined ? clampMacro(safeNumber(obj.cholesterol)) : undefined,
    quantity,
    unit,
  };
}

function parseAndValidateItems(raw: unknown[]): ParsedItem[] {
  const parsed: ParsedItem[] = [];
  const errors: string[] = [];

  for (let i = 0; i < raw.length; i++) {
    const x = raw[i];
    if (x == null || typeof x !== 'object') continue;
    try {
      parsed.push(parseItem(x as AINutritionItem));
    } catch (err) {
      errors.push(err instanceof Error ? err.message : `Item ${i + 1}: invalid`);
    }
  }

  if (parsed.length === 0 && errors.length > 0) {
    throw new Error(errors[0]);
  }
  if (parsed.length === 0) {
    throw new Error('AI response contained no valid food items. Try listing each item clearly.');
  }

  return parsed;
}

export default function AIFoodLoggerModal({ onClose, onAdd, onAddBatch, onDebugLog, loading }: AIFoodLoggerModalProps) {
  const [text, setText] = useState('');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const [items, setItems] = useState<ParsedItem[] | null>(null);
  const [mealType, setMealType] = useState(getDefaultMealType());
  const [time, setTime] = useState(getCurrentTime());

  const totalCalories = items
    ? items.reduce((sum, item) => sum + (item.calories ?? 0), 0)
    : 0;

  const handleLookup = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError('');
    setFetching(true);
    setItems(null);

    try {
      const res = await api.aiFoodLogger(trimmed);

      if (!res?.data?.items || !Array.isArray(res.data.items)) {
        setError(res?.error ?? 'AI response malformed: expected items array');
        setItems(null);
        return;
      }

      const data = res.data as {
        items: AINutritionItem[];
        total?: { calories?: number };
        debugLog?: unknown;
      };

      if (data.debugLog != null && onDebugLog) {
        onDebugLog(data.debugLog);
      }

      const parsed = parseAndValidateItems(data.items);
      setItems(parsed);
    } catch (err) {
      console.error('AI food logger error:', err);
      const message = err instanceof Error ? err.message : 'AI parsing failed';
      const normalized = message.toLowerCase();

      if (normalized.includes('openai api key required')) {
        setError('Connect your OpenAI API key in Settings → API Keys to use AI Food Logger.');
      } else if (normalized.includes('invalid') && normalized.includes('api key')) {
        setError('Your OpenAI API key looks invalid or expired. Update it in Settings → API Keys.');
      } else {
        setError(message);
      }
      setItems(null);
    } finally {
      setFetching(false);
    }
  }, [text, onDebugLog]);

  const handleAdd = useCallback(() => {
    if (!items || items.length === 0) return;
    const ts = Date.now();
    const meals: MealPayload[] = items.map((item, index) => ({
      foodId: `ai-${ts}-${index}`,
      name: item.name,
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
      fiber: item.fiber,
      sugar: item.sugar,
      sodium: item.sodium,
      saturatedFat: item.saturatedFat,
      cholesterol: item.cholesterol,
      quantity: item.quantity,
      unit: item.unit,
      mealType,
      time,
      isCustom: true,
    }));

    if (onAddBatch) {
      onAddBatch(meals);
    } else {
      meals.forEach((m) => onAdd(m));
    }
  }, [items, mealType, time, onAdd, onAddBatch]);

  const handleBack = useCallback(() => {
    setItems(null);
    setError('');
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative z-10 mx-4 w-full max-w-md overflow-y-auto rounded-3xl sm:rounded-2xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-lg animate-slide-up"
        style={{
          maxHeight:
            'min(70dvh, calc(100dvh - max(env(safe-area-inset-top), 12px) - max(env(safe-area-inset-bottom), 16px) - 32px))',
        }}
      >
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-neutral-400 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-neutral-400" />
            AI Food Logger
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!items ? (
          <>
            <p className="mt-4 text-sm text-neutral-400">What do you want to log today?</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., 60 ml tomato pappu, 150g rice, 10g chutney, 5 potato chips"
              className="mt-2 min-h-[100px] w-full resize-y rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2.5 text-sm text-neutral-400 placeholder:text-neutral-500 input-no-focus-ring"
              disabled={fetching}
              rows={3}
            />
            {error && <p className="mt-2 text-xs text-accent-rose">{error}</p>}
            <button
              onClick={handleLookup}
              disabled={fetching || !text.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-orange-400 disabled:opacity-50"
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
              className="mt-2 text-xs text-orange-400 hover:underline"
            >
              ← Change description
            </button>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-neutral-400">AI breakdown</p>
                <div className="flex items-center gap-1 text-xs text-neutral-400">
                  <Flame className="h-3.5 w-3.5 text-neutral-400" />
                  <span>{Math.round(totalCalories)} kcal total</span>
                </div>
              </div>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {items.map((item, idx) => (
                  <div
                    key={`${item.name}-${idx}`}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-neutral-400 truncate">{item.name}</p>
                        <p className="text-[11px] text-neutral-400">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 text-right text-xs text-neutral-400">
                        <span className="font-medium text-neutral-400">{Math.round(item.calories)} kcal</span>
                        <span className="text-[11px]">
                          P {item.protein}g · C {item.carbs}g · F {item.fat}g
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-400">Meal type</label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {mealTypes.map((mt) => (
                    <button
                      key={mt.key}
                      type="button"
                      onClick={() => setMealType(mt.key)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition-all text-neutral-400',
                        mealType === mt.key
                          ? 'bg-orange-500/15 ring-1 ring-orange-400/40'
                          : 'bg-white/[0.04] hover:bg-white/[0.06]'
                      )}
                    >
                      <mt.icon className="h-4 w-4 text-neutral-400" />
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-neutral-400">Time</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
                />
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-orange-400 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Add {items.length === 1 ? 'item' : `${items.length} items`} to log
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

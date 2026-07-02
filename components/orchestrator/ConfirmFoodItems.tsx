'use client';

import { useState } from 'react';
import { Check, X, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParsedFoodItem } from '@/contexts/OrchestratorSidebarContext';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
type MealType = typeof MEAL_TYPES[number];

function guessMealType(): MealType {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}

function nowTimeValue(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface ConfirmFoodItemsProps {
  items: ParsedFoodItem[];
  total?: Record<string, number>;
  onConfirm: (mealType: string, time: string) => Promise<void>;
  onCancel: () => void;
}

export default function ConfirmFoodItems({ items, total, onConfirm, onCancel }: ConfirmFoodItemsProps) {
  const [mealType, setMealType] = useState<MealType>(guessMealType());
  const [time, setTime] = useState<string>(nowTimeValue());
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(mealType, time || nowTimeValue());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3 text-sm">
      {/* Items list */}
      <div className="mb-3 flex flex-col gap-2">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-900/40 px-3 py-2">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Utensils className="h-3 w-3 shrink-0 text-emerald-500/60" />
                <span className="truncate text-neutral-300 text-xs">
                  {item.quantity} {item.unit} {item.name}
                </span>
              </div>
              <span className="shrink-0 text-[11px] text-neutral-500">{item.calories} cal</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              <div>
                <span className="text-[11px] font-semibold text-violet-400">{Math.round(item.protein)}g</span>
                <p className="text-[9px] text-neutral-600">Protein</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-emerald-400">{Math.round(item.carbs)}g</span>
                <p className="text-[9px] text-neutral-600">Carbs</p>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-rose-400">{Math.round(item.fat)}g</span>
                <p className="text-[9px] text-neutral-600">Fat</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Total + macro breakdown */}
      {total && total.calories !== undefined && (
        <div className="mb-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-xs text-neutral-400">Total</span>
            <span className="text-xs font-semibold text-emerald-400">{Math.round(total.calories)} cal</span>
          </div>
          <div className="grid grid-cols-3 gap-px bg-neutral-800/50 border-t border-emerald-500/10">
            {[
              { label: 'Protein', value: total.protein, color: 'text-violet-400' },
              { label: 'Carbs',   value: total.carbs,   color: 'text-emerald-400' },
              { label: 'Fat',     value: total.fat,     color: 'text-rose-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex flex-col items-center py-2 bg-neutral-900/60">
                <span className={`text-xs font-semibold ${color}`}>{Math.round(value ?? 0)}g</span>
                <span className="text-[10px] text-neutral-500">{label}</span>
              </div>
            ))}
          </div>
          {(total.fiber || total.sugar || total.sodium) ? (
            <div className="grid grid-cols-3 gap-px bg-neutral-800/50 border-t border-neutral-800">
              {[
                { label: 'Fiber',  value: total.fiber,  unit: 'g',  color: 'text-emerald-300' },
                { label: 'Sugar',  value: total.sugar,  unit: 'g',  color: 'text-emerald-300' },
                { label: 'Sodium', value: total.sodium, unit: 'mg', color: 'text-sky-400' },
              ].map(({ label, value, unit, color }) => (
                <div key={label} className="flex flex-col items-center py-2 bg-neutral-900/60">
                  <span className={`text-xs font-semibold ${color}`}>{Math.round(value ?? 0)}{unit}</span>
                  <span className="text-[10px] text-neutral-500">{label}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* When did you have it? */}
      <div className="mb-3">
        <p className="mb-1.5 text-[10px] text-neutral-500 uppercase tracking-wide">When did you have it?</p>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1.5 text-xs text-neutral-300 focus:border-emerald-500/40 focus:outline-none"
        />
      </div>

      {/* Meal type selector */}
      <div className="mb-3">
        <p className="mb-1.5 text-[10px] text-neutral-500 uppercase tracking-wide">Meal type</p>
        <div className="flex gap-1.5 flex-wrap">
          {MEAL_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => setMealType(t)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
                mealType === t
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-neutral-800 text-neutral-500 border border-neutral-700 hover:text-neutral-400'
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => void handleConfirm()}
          disabled={loading}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-colors',
            'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/25',
            loading && 'opacity-60'
          )}
        >
          <Check className="h-3.5 w-3.5" />
          {loading ? 'Logging...' : 'Log These'}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs text-neutral-500 border border-neutral-800 hover:text-neutral-400 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { X, Minus, Plus, Coffee, Sun, Moon, Cookie } from 'lucide-react';
import { cn, getCurrentTime, formatNumber } from '@/lib/utils';

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

interface AddMealModalProps {
  food: FoodItem;
  onClose: () => void;
  onAdd: (meal: {
    foodId: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
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

export default function AddMealModal({ food, onClose, onAdd, loading }: AddMealModalProps) {
  const [quantity, setQuantity] = useState(food.servingSize);
  const [mealType, setMealType] = useState(getDefaultMealType());
  const [time, setTime] = useState(getCurrentTime());

  const multiplier = quantity / food.servingSize;
  const scaledCalories = Math.round(food.calories * multiplier);
  const scaledProtein = Math.round(food.protein * multiplier * 10) / 10;
  const scaledCarbs = Math.round(food.carbs * multiplier * 10) / 10;
  const scaledFat = Math.round(food.fat * multiplier * 10) / 10;
  const scaledFiber = Math.round((food.fiber || 0) * multiplier * 10) / 10;

  const adjustQty = (delta: number) => {
    setQuantity((prev) => Math.max(1, Math.round((prev + delta) * 10) / 10));
  };

  const handleSubmit = () => {
    onAdd({
      foodId: food.id,
      name: food.name,
      calories: scaledCalories,
      protein: scaledProtein,
      carbs: scaledCarbs,
      fat: scaledFat,
      fiber: scaledFiber,
      quantity,
      unit: food.servingUnit,
      mealType,
      time,
      isCustom: false,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-white/[0.06] bg-bg-surface p-6 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{food.name}</h3>
            <p className="text-xs text-text-muted capitalize">{food.category.replace('_', ' ')}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06] hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quantity Selector */}
        <div className="mt-6">
          <label className="text-xs font-medium text-text-muted">Quantity ({food.servingUnit})</label>
          <div className="mt-2 flex items-center gap-4">
            <button
              onClick={() => adjustQty(-food.servingSize * 0.5)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-text-secondary hover:bg-white/[0.1]"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseFloat(e.target.value) || 1))}
              className="glass-input w-24 rounded-xl px-3 py-2 text-center text-lg font-bold"
              min={1}
              step={food.servingUnit === 'piece' || food.servingUnit === 'cup' ? 0.5 : 10}
            />
            <button
              onClick={() => adjustQty(food.servingSize * 0.5)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-text-secondary hover:bg-white/[0.1]"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="mt-2 flex gap-2">
            {[0.5, 1, 1.5, 2].map((mult) => (
              <button
                key={mult}
                onClick={() => setQuantity(Math.round(food.servingSize * mult * 10) / 10)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-medium transition-all',
                  Math.abs(quantity - food.servingSize * mult) < 0.01
                    ? 'bg-accent-violet/20 text-accent-violet'
                    : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                )}
              >
                {mult}x
              </button>
            ))}
          </div>
        </div>

        {/* Nutrition Preview */}
        <div className="mt-5 grid grid-cols-4 gap-2 rounded-xl bg-white/[0.03] p-3">
          <div className="text-center">
            <p className="text-base font-bold text-accent-emerald">{formatNumber(scaledCalories)}</p>
            <p className="text-[10px] text-text-muted">kcal</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-accent-violet">{scaledProtein}g</p>
            <p className="text-[10px] text-text-muted">Protein</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-accent-amber">{scaledCarbs}g</p>
            <p className="text-[10px] text-text-muted">Carbs</p>
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-accent-rose">{scaledFat}g</p>
            <p className="text-[10px] text-text-muted">Fat</p>
          </div>
        </div>

        {/* Meal Type Selector */}
        <div className="mt-5">
          <label className="text-xs font-medium text-text-muted">Meal Type</label>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {mealTypes.map((mt) => (
              <button
                key={mt.key}
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

        {/* Time */}
        <div className="mt-5">
          <label className="text-xs font-medium text-text-muted">Time</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="glass-input mt-2 w-full rounded-xl px-3 py-2 text-sm"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="glass-button-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add to {mealTypes.find((m) => m.key === mealType)?.label}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

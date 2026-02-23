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

// Protein shake math: user gives scoops + milk (ml) + water (ml). Powder per scoop; milk per 100ml; water = 0.
const PER_SCOOP = { cal: 120, protein: 24, carbs: 3, fat: 1.5 };
const PER_100ML_MILK = { cal: 62, protein: 3.2, carbs: 4.8, fat: 3.3 };

function getDefaultMealType(): string {
  const hour = new Date().getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 20) return 'dinner';
  return 'snack';
}

export default function AddMealModal({ food, onClose, onAdd, loading }: AddMealModalProps) {
  const [quantity, setQuantity] = useState(food.servingSize);
  const [milkMl, setMilkMl] = useState(130);
  const [waterMl, setWaterMl] = useState(70);
  const [mealType, setMealType] = useState(getDefaultMealType());
  const [time, setTime] = useState(getCurrentTime());

  const isScoop = food.servingUnit === 'scoop';
  const scoops = quantity;

  const multiplier = quantity / food.servingSize;
  let scaledCalories: number;
  let scaledProtein: number;
  let scaledCarbs: number;
  let scaledFat: number;
  if (isScoop) {
    scaledCalories = Math.round(scoops * PER_SCOOP.cal + (milkMl / 100) * PER_100ML_MILK.cal);
    scaledProtein = Math.round((scoops * PER_SCOOP.protein + (milkMl / 100) * PER_100ML_MILK.protein) * 10) / 10;
    scaledCarbs = Math.round((scoops * PER_SCOOP.carbs + (milkMl / 100) * PER_100ML_MILK.carbs) * 10) / 10;
    scaledFat = Math.round((scoops * PER_SCOOP.fat + (milkMl / 100) * PER_100ML_MILK.fat) * 10) / 10;
  } else {
    scaledCalories = Math.round(food.calories * multiplier);
    scaledProtein = Math.round(food.protein * multiplier * 10) / 10;
    scaledCarbs = Math.round(food.carbs * multiplier * 10) / 10;
    scaledFat = Math.round(food.fat * multiplier * 10) / 10;
  }
  const scaledFiber = Math.round((food.fiber || 0) * multiplier * 10) / 10;

  const minQty = isScoop ? 0.25 : 1;
  const stepQty = isScoop ? 0.25 : (food.servingUnit === 'piece' || food.servingUnit === 'cup' ? 0.5 : 10);
  const adjustQty = (delta: number) => {
    setQuantity((prev) => Math.max(minQty, Math.round((prev + delta) * 100) / 100));
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

        {/* Quantity: for other foods single field; for protein shake = scoops + milk + water */}
        <div className="mt-6">
          {!isScoop && (
            <>
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
                  onChange={(e) => setQuantity(Math.max(minQty, parseFloat(e.target.value) || minQty))}
                  className="glass-input w-24 rounded-xl px-3 py-2 text-center text-lg font-bold"
                  min={minQty}
                  step={stepQty}
                />
                <button
                  onClick={() => adjustQty(food.servingSize * 0.5)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06] text-text-secondary hover:bg-white/[0.1]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {[0.5, 1, 1.5, 2].map((val) => {
                  const qty = food.servingSize * val;
                  return (
                    <button
                      key={val}
                      onClick={() => setQuantity(Math.round(qty * 100) / 100)}
                      className={cn(
                        'rounded-lg px-3 py-1 text-xs font-medium transition-all',
                        Math.abs(quantity - qty) < 0.01 ? 'bg-accent-violet/20 text-accent-violet' : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                      )}
                    >
                      {val}x
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {isScoop && (
            <>
              <label className="text-xs font-medium text-text-muted">Scoops</label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(0.25, parseFloat(e.target.value) || 0.25))}
                  className="glass-input w-20 rounded-xl px-3 py-2 text-center text-lg font-bold"
                  min={0.25}
                  step={0.25}
                />
                <div className="flex flex-wrap gap-1.5">
                  {[0.25, 0.5, 1, 1.5, 2].map((val) => (
                    <button
                      key={val}
                      onClick={() => setQuantity(val)}
                      className={cn(
                        'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                        Math.abs(quantity - val) < 0.01 ? 'bg-accent-violet/20 text-accent-violet' : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                      )}
                    >
                      {val === 0.25 ? '¼' : val === 1.5 ? '1½' : val}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-text-muted">Milk (ml)</label>
                  <input
                    type="number"
                    value={milkMl}
                    onChange={(e) => setMilkMl(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Water (ml)</label>
                  <input
                    type="number"
                    value={waterMl}
                    onChange={(e) => setWaterMl(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                    min={0}
                  />
                </div>
              </div>
            </>
          )}
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

'use client';

import { useState } from 'react';
import { X, Plus, Coffee, Sun, Moon, Cookie } from 'lucide-react';
import { cn, getCurrentTime } from '@/lib/utils';

interface CustomFoodModalProps {
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

export default function CustomFoodModal({ onClose, onAdd, loading }: CustomFoodModalProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('g');
  const [mealType, setMealType] = useState(getDefaultMealType());
  const [time, setTime] = useState(getCurrentTime());

  const handleSubmit = () => {
    if (!name.trim() || !calories) return;
    onAdd({
      foodId: `custom-${Date.now()}`,
      name: name.trim(),
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      fiber: 0,
      quantity: parseFloat(quantity) || 100,
      unit,
      mealType,
      time,
      isCustom: true,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-white/[0.06] bg-bg-surface p-6 shadow-2xl animate-slide-up">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-text-primary">Add Custom Food</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-text-muted">Food Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              placeholder="e.g., Homemade Upma"
            />
          </div>

          {/* Quantity + Unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-text-muted">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-text-muted">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              >
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="piece">piece</option>
                <option value="cup">cup</option>
                <option value="tbsp">tbsp</option>
                <option value="bowl">bowl</option>
                <option value="plate">plate</option>
              </select>
            </div>
          </div>

          {/* Nutrition */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted">Calories (kcal) *</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
                placeholder="0"
              />
            </div>
          </div>

          {/* Meal Type */}
          <div>
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
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !calories}
          className="glass-button-primary mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          ) : (
            <>
              <Plus className="h-4 w-4" />
              Add Custom Food
            </>
          )}
        </button>
      </div>
    </div>
  );
}

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
    sugar?: number;
    sodium?: number;
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
  const [fiber, setFiber] = useState('');
  const [sugar, setSugar] = useState('');
  const [sodium, setSodium] = useState('');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('g');
  const [mealType, setMealType] = useState(getDefaultMealType());
  const [time, setTime] = useState(getCurrentTime());

  const handleSubmit = () => {
    if (!name.trim() || !calories) return;
    const fiberNum = parseFloat(fiber) || 0;
    const sugarNum = parseFloat(sugar) || 0;
    const sodiumNum = parseFloat(sodium) || 0;
    onAdd({
      foodId: `custom-${Date.now()}`,
      name: name.trim(),
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0,
      fiber: fiberNum,
      ...(sugarNum > 0 && { sugar: sugarNum }),
      ...(sodiumNum > 0 && { sodium: sodiumNum }),
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

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-2xl border border-neutral-800 bg-neutral-900/95 p-6 shadow-lg animate-slide-up">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold text-neutral-400">Add Custom Food</h3>
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
            <label className="text-xs font-medium text-neutral-400">Food Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 placeholder:text-neutral-500 input-no-focus-ring"
              placeholder="e.g., Homemade Upma"
            />
          </div>

          {/* Quantity + Unit */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-neutral-400">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
              />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-neutral-400">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
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
              <label className="text-xs font-medium text-neutral-400">Calories (kcal) *</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400">Fiber (g)</label>
              <input
                type="number"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400">Sugar (g)</label>
              <input
                type="number"
                value={sugar}
                onChange={(e) => setSugar(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
                placeholder="0"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-neutral-400">Sodium (mg)</label>
              <input
                type="number"
                value={sodium}
                onChange={(e) => setSodium(e.target.value)}
                className="mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-sm text-neutral-400 input-no-focus-ring"
                placeholder="0"
              />
            </div>
          </div>

          {/* Meal Type */}
          <div>
            <label className="text-xs font-medium text-neutral-400">Meal Type</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {mealTypes.map((mt) => (
                <button
                  key={mt.key}
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

          {/* Time */}
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
          onClick={handleSubmit}
          disabled={loading || !name.trim() || !calories}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-orange-400 disabled:opacity-50"
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

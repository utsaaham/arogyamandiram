import { useState } from 'react';
import { X, Minus, Plus, Coffee, Sun, Moon, Cookie } from 'lucide-react';
import { getFoodCategoryLabel } from '@/lib/foodCategories';
import { cn, getCurrentTime, formatNumber } from '@/lib/utils';

interface FoodMeasure {
  label: string;  // e.g. "1 large", "1 cup", "100g"
  grams: number;  // gram equivalent
}

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
  measures?: FoodMeasure[];
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
  const isScoop = food.servingUnit === 'scoop';

  // Build the list of measure options
  // If measures exist from USDA, use them. Otherwise fall back to 100g/100ml base.
  const measureOptions: FoodMeasure[] = food.measures?.length
    ? food.measures
    : [{ label: `100${food.servingUnit}`, grams: food.servingSize }];

  const [measureIdx, setMeasureIdx] = useState(0);
  // quantity = how many units of the selected measure
  const [quantity, setQuantity] = useState(1);
  const [milkMl, setMilkMl] = useState(130);
  const [waterMl, setWaterMl] = useState(70);
  const [mealType, setMealType] = useState(getDefaultMealType());
  const [time, setTime] = useState(getCurrentTime());

  const selectedMeasure = measureOptions[measureIdx];
  const isBaseGrams = selectedMeasure.label.startsWith('100');

  // For base-unit measure (100g/100ml), step in practical increments
  // For natural measures (1 egg, 1 cup), step in 0.5 units
  const stepQty   = isScoop ? 0.25 : isBaseGrams ? 0.5 : 0.5;
  const minQty    = isScoop ? 0.25 : 0.5;

  // Total effective grams = quantity × grams per unit of measure
  const effectiveGrams = isScoop ? quantity /* handled separately */ : quantity * selectedMeasure.grams;
  const multiplier = effectiveGrams / food.servingSize; // servingSize is always 100

  let scaledCalories: number;
  let scaledProtein: number;
  let scaledCarbs: number;
  let scaledFat: number;

  if (isScoop) {
    const scoops = quantity;
    scaledCalories = Math.round(scoops * PER_SCOOP.cal + (milkMl / 100) * PER_100ML_MILK.cal);
    scaledProtein  = Math.round((scoops * PER_SCOOP.protein + (milkMl / 100) * PER_100ML_MILK.protein) * 10) / 10;
    scaledCarbs    = Math.round((scoops * PER_SCOOP.carbs   + (milkMl / 100) * PER_100ML_MILK.carbs)   * 10) / 10;
    scaledFat      = Math.round((scoops * PER_SCOOP.fat     + (milkMl / 100) * PER_100ML_MILK.fat)     * 10) / 10;
  } else {
    scaledCalories = Math.round(food.calories * multiplier);
    scaledProtein  = Math.round(food.protein  * multiplier * 10) / 10;
    scaledCarbs    = Math.round(food.carbs    * multiplier * 10) / 10;
    scaledFat      = Math.round(food.fat      * multiplier * 10) / 10;
  }
  const scaledFiber = Math.round((food.fiber || 0) * multiplier * 10) / 10;

  const adjustQty = (delta: number) => {
    setQuantity((prev) => Math.max(minQty, Math.round((prev + delta) * 100) / 100));
  };

  const selectMeasure = (idx: number) => {
    setMeasureIdx(idx);
    setQuantity(1); // reset to 1 unit of the new measure
  };

  const handleSubmit = () => {
    // Save quantity as effective grams for base unit, else as count with label as unit
    const submitQty  = isScoop ? quantity : isBaseGrams ? Math.round(effectiveGrams) : quantity;
    const submitUnit = isScoop ? 'scoop' : isBaseGrams ? food.servingUnit : selectedMeasure.label;

    onAdd({
      foodId:   food.id,
      name:     food.name,
      calories: scaledCalories,
      protein:  scaledProtein,
      carbs:    scaledCarbs,
      fat:      scaledFat,
      fiber:    scaledFiber,
      quantity: submitQty,
      unit:     submitUnit,
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
      <div
        className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-card animate-slide-up"
        style={{ background: 'linear-gradient(160deg, #111712 0%, #0c1410 100%)' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{food.name}</h3>
            <p className="text-xs text-text-muted">{getFoodCategoryLabel(food.category)}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-white/[0.06] hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quantity section */}
        <div className="mt-6">
          {!isScoop && (
            <>
              {/* Measure selector - only show if there's more than one option */}
              {measureOptions.length > 1 && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-text-muted">Serving size</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {measureOptions.map((m, i) => (
                      <button
                        key={i}
                        onClick={() => selectMeasure(i)}
                        className={cn(
                          'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                          measureIdx === i
                            ? 'bg-white text-black'
                            : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                        )}
                      >
                        {m.label}
                        <span className="ml-1 opacity-50">· {m.grams}g</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantity stepper */}
              <label className="text-xs font-medium text-text-muted">
                {isBaseGrams ? `Amount (${food.servingUnit})` : 'Quantity'}
              </label>
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => adjustQty(-stepQty)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-text-secondary hover:bg-white/[0.1]"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="text-center">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(minQty, parseFloat(e.target.value) || minQty))}
                    className="w-16 rounded-lg bg-white/[0.04] px-2 py-1.5 text-center text-sm font-semibold text-text-primary focus:bg-white/[0.06] focus:outline-none"
                    min={minQty}
                    step={stepQty}
                  />
                  {!isBaseGrams && (
                    <p className="mt-0.5 text-[10px] text-text-muted">
                      = {Math.round(effectiveGrams)}{food.servingUnit}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => adjustQty(stepQty)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-text-secondary hover:bg-white/[0.1]"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Quick count picks */}
              <div className="mt-2 flex flex-wrap gap-2">
                {[0.5, 1, 1.5, 2, 3].map((val) => (
                  <button
                    key={val}
                    onClick={() => setQuantity(val)}
                    className={cn(
                      'rounded-lg px-3 py-1 text-xs font-medium transition-all',
                      Math.abs(quantity - val) < 0.01
                        ? 'bg-white text-black'
                        : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
                    )}
                  >
                    {val === 0.5 ? '½' : val === 1.5 ? '1½' : val}×
                  </button>
                ))}
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
                  className="w-20 rounded-xl bg-white/[0.04] px-3 py-2 text-center text-lg font-bold text-text-primary focus:bg-white/[0.06] focus:outline-none"
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
                        Math.abs(quantity - val) < 0.01 ? 'bg-white text-black' : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.08]'
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
                    className="mt-1 w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-text-primary focus:bg-white/[0.06] focus:outline-none"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Water (ml)</label>
                  <input
                    type="number"
                    value={waterMl}
                    onChange={(e) => setWaterMl(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="mt-1 w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-text-primary focus:bg-white/[0.06] focus:outline-none"
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
            <p className="text-base font-bold text-accent-emerald">{scaledCarbs}g</p>
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
                    ? 'bg-white text-black'
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
            className="mt-2 w-full rounded-xl bg-white/[0.04] px-3 py-2 text-sm text-text-primary focus:bg-white/[0.06] focus:outline-none"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-white/90 disabled:opacity-50"
        >
          {loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
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

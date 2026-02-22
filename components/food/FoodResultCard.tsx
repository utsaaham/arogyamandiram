'use client';

import { Leaf, Drumstick, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FoodResultCardProps {
  food: {
    id: string;
    name: string;
    category: string;
    servingSize: number;
    servingUnit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    isVegetarian: boolean;
  };
  onSelect: () => void;
}

export default function FoodResultCard({ food, onSelect }: FoodResultCardProps) {
  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl bg-white/[0.03] p-3 text-left transition-all hover:bg-white/[0.06] active:scale-[0.99]"
    >
      {/* Veg/Non-veg indicator */}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          food.isVegetarian ? 'bg-accent-emerald/10' : 'bg-accent-rose/10'
        )}
      >
        {food.isVegetarian ? (
          <Leaf className="h-4 w-4 text-accent-emerald" />
        ) : (
          <Drumstick className="h-4 w-4 text-accent-rose" />
        )}
      </div>

      {/* Food info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{food.name}</p>
        <p className="text-[11px] text-text-muted">
          {food.servingSize}{food.servingUnit} · {food.calories} kcal
          <span className="ml-2 capitalize opacity-60">{food.category.replace('_', ' ')}</span>
        </p>
      </div>

      {/* Macros */}
      <div className="hidden shrink-0 items-center gap-3 sm:flex">
        <div className="text-center">
          <p className="text-xs font-semibold text-accent-violet">{food.protein}g</p>
          <p className="text-[9px] text-text-muted">P</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-accent-amber">{food.carbs}g</p>
          <p className="text-[9px] text-text-muted">C</p>
        </div>
        <div className="text-center">
          <p className="text-xs font-semibold text-accent-rose">{food.fat}g</p>
          <p className="text-[9px] text-text-muted">F</p>
        </div>
      </div>

      {/* Add icon */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-violet/10">
        <Plus className="h-4 w-4 text-accent-violet" />
      </div>
    </button>
  );
}

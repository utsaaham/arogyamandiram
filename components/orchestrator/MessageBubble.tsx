'use client';

import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConversationEntry, MealSuggestion, WorkoutPlan } from '@/contexts/OrchestratorSidebarContext';
import ConfirmSimpleItem from './ConfirmSimpleItem';
import ConfirmFoodItems from './ConfirmFoodItems';
import ConfirmWorkoutItems from './ConfirmWorkoutItems';

// ─── Meal Ideas Result ────────────────────────────────────────────────────────

function MealIdeasResult({ suggestions }: { suggestions: MealSuggestion[] }) {
  return (
    <div className="mt-2 flex flex-col gap-2">
      {suggestions.map((s, i) => (
        <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-neutral-200">{s.name}</p>
            <span className="shrink-0 text-[11px] text-neutral-500">{s.calories} cal</span>
          </div>
          <p className="mt-0.5 text-[11px] text-neutral-500 line-clamp-2">{s.description}</p>
          <div className="mt-1.5 flex gap-3 text-[10px] text-neutral-600">
            <span>P {s.protein}g</span>
            <span>C {s.carbs}g</span>
            <span>F {s.fat}g</span>
            {s.isVegetarian && <span className="text-emerald-600">Veg</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Workout Plan Result ─────────────────────────────────────────────────────

function WorkoutPlanResult({ plan }: { plan: WorkoutPlan }) {
  if (!plan?.exercises?.length) return null;
  return (
    <div className="mt-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-3">
      {plan.name && <p className="mb-2 text-xs font-semibold text-rose-400">{plan.name}</p>}
      <div className="flex flex-col gap-1.5">
        {plan.exercises.map((ex, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-neutral-300">{ex.exercise}</span>
            <span className="text-[11px] text-neutral-500">
              {ex.sets}×{ex.reps} · {ex.restSeconds}s rest
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

interface MessageBubbleProps {
  entry: ConversationEntry;
  onConfirmSimple: () => Promise<void>;
  onConfirmFood: (mealType: string, time: string) => Promise<void>;
  onConfirmWorkout: () => Promise<void>;
  onCancel: () => void;
}

export default function MessageBubble({ entry, onConfirmSimple, onConfirmFood, onConfirmWorkout, onCancel }: MessageBubbleProps) {
  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* User message */}
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-neutral-800 px-3 py-2 text-xs text-neutral-200 select-text cursor-text">
          {entry.userImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entry.userImage}
              alt="Attached food photo"
              className={cn('max-h-40 w-auto rounded-xl object-cover', entry.userText && 'mb-1.5')}
            />
          )}
          {entry.userText}
        </div>
      </div>

      {/* AI result */}
      <div className="flex justify-start">
        <div className="w-full max-w-full">

          {/* Status: pending */}
          {entry.status === 'pending' && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}

          {/* Status: error */}
          {entry.status === 'error' && (
            <div className="flex items-start gap-1.5 text-xs text-red-400">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{entry.errorMessage || 'Something went wrong'}</span>
            </div>
          )}

          {/* Status: success (simple tools) */}
          {entry.status === 'success' && entry.result && entry.tool !== 'meal-ideas' && entry.tool !== 'workout-plan' && (
            <span className="text-xs text-neutral-300">{entry.result.summary}</span>
          )}

          {/* Status: awaiting-confirm (water / weight / sleep) */}
          {entry.status === 'awaiting-confirm' && (entry.tool === 'water' || entry.tool === 'weight' || entry.tool === 'sleep') && entry.result && (
            <ConfirmSimpleItem
              summary={entry.result.summary}
              accentColor={entry.tool === 'water' ? 'cyan' : entry.tool === 'weight' ? 'amber' : 'violet'}
              onConfirm={onConfirmSimple}
              onCancel={onCancel}
            />
          )}

          {/* Status: awaiting-confirm (food) */}
          {entry.status === 'awaiting-confirm' && entry.tool === 'food-ai-logger' && entry.result?.foodItems && (
            <>
              <p className="mb-1 text-xs text-neutral-400">{entry.result.summary}</p>
              <ConfirmFoodItems
                items={entry.result.foodItems}
                total={entry.result.foodTotal}
                onConfirm={onConfirmFood}
                onCancel={onCancel}
              />
            </>
          )}

          {/* Status: awaiting-confirm (workout) */}
          {entry.status === 'awaiting-confirm' && entry.tool === 'workout-ai-logger' && entry.result?.workoutItems && (
            <>
              <p className="mb-1 text-xs text-neutral-400">{entry.result.summary}</p>
              <ConfirmWorkoutItems
                items={entry.result.workoutItems}
                onConfirm={onConfirmWorkout}
                onCancel={onCancel}
              />
            </>
          )}

          {/* Meal ideas result */}
          {entry.status === 'success' && entry.tool === 'meal-ideas' && entry.result?.mealSuggestions && (
            <MealIdeasResult suggestions={entry.result.mealSuggestions} />
          )}

          {/* Workout plan result */}
          {entry.status === 'success' && entry.tool === 'workout-plan' && entry.result?.workoutPlan && (
            <>
              <span className="text-xs text-neutral-300 mb-1 block">{entry.result.summary}</span>
              <WorkoutPlanResult plan={entry.result.workoutPlan as WorkoutPlan} />
            </>
          )}

          {/* Cancelled */}
          {entry.status === 'cancelled' && (
            <span className="text-xs text-neutral-600 italic">Dismissed</span>
          )}
        </div>
      </div>
    </div>
  );
}

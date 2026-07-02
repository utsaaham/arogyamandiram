'use client';

// Today's habits, living right next to your food. Auto-tracked rows fill in
// on their own (water, sleep, meals, movement — watch data included), and the
// quick-tap chips below feed the Vitals habit insights.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookHeart,
  Check,
  Droplets,
  Dumbbell,
  Loader2,
  Moon,
  Utensils,
  Watch,
} from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import api from '@/lib/apiClient';
import type { DailyLogData } from '@/hooks/useDailyLog';
import type { UserTargets } from '@/types';
import { cn, formatNumber } from '@/lib/utils';
import { HABIT_LABELS, type HabitKey } from '@/types';

const MOOD_FACES = ['😞', '😕', '😐', '🙂', '😄'];

type AutoHabitRow = {
  key: string;
  label: string;
  icon: typeof Droplets;
  iconCls: string;
  value: string;
  hint?: string;
  done: boolean;
};

function buildAutoRows(log: DailyLogData | null, targets: UserTargets): AutoHabitRow[] {
  const water = log?.waterIntake ?? 0;
  const sleepHours = log?.sleep?.duration ?? 0;
  const mealCount = log?.meals?.length ?? 0;
  const totalCal = log?.totalCalories ?? 0;

  const workouts = log?.workouts ?? [];
  const watchCal = log?.activeCalories;
  const manualCal = workouts
    .filter((w) => w.source !== 'device')
    .reduce((s, w) => s + (w.caloriesBurned || 0), 0);
  // Watch active energy already covers device workouts; manual ones are extra.
  const burned = typeof watchCal === 'number' ? Math.round(watchCal + manualCal) : Math.round(log?.caloriesBurned ?? manualCal);
  const hasWatch = typeof watchCal === 'number';

  return [
    {
      key: 'water',
      label: 'Water',
      icon: Droplets,
      iconCls: 'text-sky-400',
      value: `${formatNumber(water)} / ${formatNumber(targets.dailyWater)} ml`,
      done: water >= targets.dailyWater,
    },
    {
      key: 'sleep',
      label: 'Sleep',
      icon: Moon,
      iconCls: 'text-indigo-400',
      value: sleepHours > 0 ? `${sleepHours.toFixed(1)} h of ${targets.sleepHours} h` : 'Not logged yet',
      done: sleepHours >= targets.sleepHours - 0.5 && sleepHours > 0,
    },
    {
      key: 'food',
      label: 'Meals',
      icon: Utensils,
      iconCls: 'text-emerald-400',
      value: mealCount > 0
        ? `${mealCount} meal${mealCount !== 1 ? 's' : ''} · ${formatNumber(Math.round(totalCal))} kcal`
        : 'Nothing logged yet',
      done: mealCount > 0,
    },
    {
      key: 'move',
      label: 'Movement',
      icon: Dumbbell,
      iconCls: 'text-orange-400',
      value: burned > 0
        ? `${formatNumber(burned)} kcal burned${workouts.length > 0 ? ` · ${workouts.length} workout${workouts.length !== 1 ? 's' : ''}` : ''}`
        : 'No movement logged yet',
      hint: hasWatch ? 'Watch data included' : undefined,
      done: burned >= targets.dailyCalorieBurn,
    },
  ];
}

type HabitsCardProps = {
  log: DailyLogData | null;
  targets: UserTargets;
  onSaved?: () => void;
};

export default function HabitsCard({ log, targets, onSaved }: HabitsCardProps) {
  const [selected, setSelected] = useState<HabitKey[]>([]);
  const [mood, setMood] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const dirtyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const flashTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Seed from today's log once it arrives; user edits win after that.
  useEffect(() => {
    if (dirtyRef.current) return;
    setSelected(((log?.habits ?? []) as HabitKey[]).filter((h) => h in HABIT_LABELS));
    setMood(log?.mood ?? null);
  }, [log]);

  useEffect(() => () => {
    clearTimeout(saveTimerRef.current);
    clearTimeout(flashTimerRef.current);
  }, []);

  // Every tap saves on its own after a short pause, so rapid taps batch up.
  const scheduleSave = (habits: HabitKey[], moodValue: number | null) => {
    dirtyRef.current = true;
    setSaveState('saving');
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.logScoresJournal({
          habits,
          ...(moodValue !== null ? { mood: moodValue } : {}),
        });
        if (res.success) {
          setSaveState('saved');
          onSaved?.();
          clearTimeout(flashTimerRef.current);
          flashTimerRef.current = setTimeout(() => setSaveState('idle'), 2000);
        } else {
          setSaveState('idle');
          showToast('Could not save your habits. Give it another go?', 'error');
        }
      } catch {
        setSaveState('idle');
        showToast('Could not save your habits. Give it another go?', 'error');
      }
    }, 600);
  };

  const toggleHabit = (key: HabitKey) => {
    const next = selected.includes(key) ? selected.filter((h) => h !== key) : [...selected, key];
    setSelected(next);
    scheduleSave(next, mood);
  };

  const setMoodAndSave = (m: number) => {
    const next = mood === m ? null : m;
    setMood(next);
    scheduleSave(selected, next);
  };

  const autoRows = buildAutoRows(log, targets);

  return (
    <div className="dashboard-unified-card flex min-h-0 flex-1 flex-col rounded-2xl border p-4 sm:p-5">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <BookHeart className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Today&apos;s habits</h3>
          {saveState === 'saving' && (
            <span className="flex items-center gap-1 text-[10px] text-zinc-500">
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
              Saving
            </span>
          )}
          {saveState === 'saved' && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Check className="h-2.5 w-2.5 stroke-[3]" />
              Saved
            </span>
          )}
        </div>
        <Link href="/vitals" className="text-[11px] font-medium text-emerald-400/80 hover:text-emerald-300">
          See what they do to your Vitals
        </Link>
      </div>

      <div className="hide-scrollbar min-h-0 flex-1 overflow-y-auto pr-1">
        {/* Auto-tracked from your day */}
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Tracked for you</p>
        <div className="mt-2 space-y-1.5">
          {autoRows.map((row) => {
            const RowIcon = row.icon;
            return (
              <div
                key={row.key}
                className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2.5"
              >
                <RowIcon className={cn('h-4 w-4 shrink-0', row.iconCls)} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-zinc-300">{row.label}</p>
                  <p className="truncate text-[11px] text-zinc-500">{row.value}</p>
                  {row.hint && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-zinc-600">
                      <Watch className="h-2.5 w-2.5" />
                      {row.hint}
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    row.done ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-700'
                  )}
                >
                  {row.done && <Check className="h-3 w-3 stroke-[3] text-white" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick-tap habits */}
        <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-zinc-500">Anything else today?</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(HABIT_LABELS) as HabitKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleHabit(key)}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                selected.includes(key)
                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                  : 'border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]'
              )}
            >
              {HABIT_LABELS[key]}
            </button>
          ))}
        </div>

        {/* Mood */}
        <p className="mt-4 text-[11px] font-medium uppercase tracking-wider text-zinc-500">How did today feel?</p>
        <div className="mt-2 flex gap-2">
          {[1, 2, 3, 4, 5].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMoodAndSave(m)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-xl border text-[13px] transition-colors',
                mood === m
                  ? 'border-emerald-500/40 bg-emerald-500/15'
                  : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06]'
              )}
            >
              {MOOD_FACES[m - 1]}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-3 shrink-0 text-center text-[10px] text-zinc-600">
        Tap anything and it saves on its own. No buttons, no fuss.
      </p>
    </div>
  );
}

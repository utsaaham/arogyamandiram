'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlarmClock, Check, CheckSquare, Clock, Loader2, RotateCcw, Settings, Zap } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import { showToast } from '@/components/ui/Toast';
import { careStatus, cadenceInfo, humanDays, isDailyCadence, type CareStatus } from '@/lib/careCadence';
import { removeLoggedMealsByName } from '@/lib/checklistFoodSync';
import { cn, getToday } from '@/lib/utils';
import { usePlanAutoRefresh } from '@/hooks/usePlanAutoRefresh';

type TodoGroup = { id: string; name: string };

type TodoTemplate = {
  id: string;
  title: string;
  note: string;
  time: string;
  category: 'food' | 'supplement' | 'medicine' | 'habit' | 'care' | 'other';
  group?: string;
  enabled: boolean;
  frequency?: number;
  times?: string[];
  cadence?: string;
  cadenceDays?: number;
  lastDone?: string | null;
  baseItems?: Record<string, unknown>[];
};

type VirtualTodoItem = TodoTemplate & {
  _completionId: string;
  _doseLabel: string | null;
  /** True when the item cycles (non-daily cadence) instead of resetting daily */
  _cycles: boolean;
};

type TodoCompletion = {
  templateId: string;
  completedAt: string;
};

const DAILY_GROUP_ID = 'daily';

function formatCompletedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function formatTimeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** True when a timed daily item is past its time and still unchecked. */
function isMissed(item: TodoTemplate, done: boolean, now: Date): boolean {
  if (done || !item.time) return false;
  const [h, m] = item.time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  return now.getHours() * 60 + now.getMinutes() > h * 60 + m + 30; // half-hour grace
}

function careStatusLine(status: CareStatus, cadence: string | undefined, cadenceDays?: number): { text: string; tone: 'ok' | 'due' | 'overdue' } {
  const every = cadenceInfo(cadence, cadenceDays).label.toLowerCase();
  switch (status.state) {
    case 'never':
      return { text: `Never done yet · repeats ${every}`, tone: 'due' };
    case 'done':
      return {
        text: `Done ${humanDays(status.daysAgo)} · comes back in ${status.nextInDays} day${status.nextInDays !== 1 ? 's' : ''}`,
        tone: 'ok',
      };
    case 'due':
      return { text: `Due now · last done ${humanDays(status.daysAgo)}`, tone: 'due' };
    case 'overdue':
      return {
        text: `You've been putting this off! Last done ${humanDays(status.daysAgo)}`,
        tone: 'overdue',
      };
  }
}

export default function TodosTab() {
  const today = getToday();
  const [templates, setTemplates] = useState<TodoTemplate[]>([]);
  const [completions, setCompletions] = useState<TodoCompletion[]>([]);
  const [groups, setGroups] = useState<TodoGroup[]>([{ id: DAILY_GROUP_ID, name: 'Daily' }]);
  const [selectedGroup, setSelectedGroup] = useState<string>(DAILY_GROUP_ID);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTodosForDate(today);
      if (res.success && res.data) {
        setTemplates((res.data.templates ?? []) as TodoTemplate[]);
        setCompletions((res.data.completions ?? []) as TodoCompletion[]);
        const nextGroups = (res.data.groups ?? []) as TodoGroup[];
        if (nextGroups.length > 0) {
          setGroups(nextGroups);
          setSelectedGroup((prev) => (nextGroups.some((g) => g.id === prev) ? prev : DAILY_GROUP_ID));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [today]);

  usePlanAutoRefresh(load);

  const visibleTemplates = useMemo(
    () => templates.filter((t) => (t.group || DAILY_GROUP_ID) === selectedGroup),
    [templates, selectedGroup]
  );

  // Daily items split into per-dose rows; cycling items stay single rows.
  const virtualItems = useMemo(() => visibleTemplates.flatMap((t): VirtualTodoItem[] => {
    if (!isDailyCadence(t.cadence)) {
      return [{ ...t, _completionId: t.id, _doseLabel: null, _cycles: true }];
    }
    const freq = t.frequency ?? 1;
    if (freq <= 1) return [{ ...t, _completionId: t.id, _doseLabel: null, _cycles: false }];
    return Array.from({ length: freq }, (_, i): VirtualTodoItem => ({
      ...t,
      // Each dose carries its own time so late nudges fire per dose
      time: t.times?.[i]?.trim() || t.time,
      _completionId: `${t.id}::${i}`,
      _doseLabel: `Dose ${i + 1}`,
      _cycles: false,
    }));
  }), [visibleTemplates]);

  const isCompletedToday = (completionId: string) =>
    completions.some((c) => c.templateId === completionId);

  const getCompletion = (completionId: string) =>
    completions.find((c) => c.templateId === completionId);

  // Cycling items count as done for the whole cycle, not just today
  const careStatusFor = (item: TodoTemplate): CareStatus => {
    if (isCompletedToday(item.id)) {
      return careStatus(today, item.cadence, today, item.cadenceDays);
    }
    return careStatus(item.lastDone ?? null, item.cadence, today, item.cadenceDays);
  };

  const toggle = async (completionId: string) => {
    if (toggling.has(completionId)) return;
    const nowCompleted = !isCompletedToday(completionId);
    const baseId = completionId.includes('::') ? completionId.split('::')[0] : completionId;
    const tmpl = templates.find((t) => t.id === baseId);

    setToggling((prev) => new Set(prev).add(completionId));

    if (nowCompleted) {
      setCompletions((prev) => [...prev, { templateId: completionId, completedAt: new Date().toISOString() }]);
    } else {
      setCompletions((prev) => prev.filter((c) => c.templateId !== completionId));
    }

    try {
      const mealTypeNow = () => {
        const h = new Date().getHours();
        if (h < 10) return 'breakfast';
        if (h < 14) return 'lunch';
        if (h < 18) return 'snack';
        return 'dinner';
      };

      const isFirstDose = !completionId.includes('::') || completionId.endsWith('::0');
      if (nowCompleted && tmpl?.category === 'food' && isFirstDose) {
        const items = tmpl.baseItems ?? [];
        if (items.length > 0) {
          const mealType = mealTypeNow();
          await Promise.all(items.map((item) => api.addMeal(today, { ...item, mealType })));
          showToast(`Logged ${items.length} food item${items.length !== 1 ? 's' : ''} to your food log`, 'success');
        }
      }

      // Supplements and medicines land in the food log too (0 kcal), so the
      // food page and your insights know what you actually took today.
      if (nowCompleted && tmpl && (tmpl.category === 'supplement' || tmpl.category === 'medicine')) {
        const kind = tmpl.category === 'medicine' ? 'medicine' : 'supplement';
        await api.addMeal(today, {
          name: `${tmpl.title} (${kind})`,
          calories: 0, protein: 0, carbs: 0, fat: 0,
          quantity: 1, unit: 'dose',
          mealType: mealTypeNow(),
          isCustom: true,
        });
        showToast(`Noted in your food log, so your day knows you took your ${kind}.`, 'success');
      }

      // Unchecking takes it back out of the food log, so nothing lingers.
      if (!nowCompleted && tmpl && (tmpl.category === 'supplement' || tmpl.category === 'medicine')) {
        const kind = tmpl.category === 'medicine' ? 'medicine' : 'supplement';
        const removed = await removeLoggedMealsByName(today, [`${tmpl.title} (${kind})`]);
        if (removed > 0) showToast(`Unchecked, and we took the ${kind} back out of your food log.`, 'info');
      }
      if (!nowCompleted && tmpl?.category === 'food' && isFirstDose) {
        const names = (tmpl.baseItems ?? [])
          .map((item) => String((item as { name?: unknown }).name ?? ''))
          .filter(Boolean);
        const removed = await removeLoggedMealsByName(today, names);
        if (removed > 0) showToast(`Unchecked, and we removed ${removed} item${removed !== 1 ? 's' : ''} from your food log.`, 'info');
      }

      const res = await api.toggleTodo(completionId, today, nowCompleted);
      if (!res.success) {
        setCompletions((prev) =>
          nowCompleted
            ? prev.filter((c) => c.templateId !== completionId)
            : [...prev, { templateId: completionId, completedAt: new Date().toISOString() }]
        );
        showToast(res.error || 'That didn’t save. Try again?', 'error');
      }
    } catch {
      showToast('That didn’t save. Try again?', 'error');
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(completionId); return s; });
    }
  };

  const now = new Date();

  // Nudges: things you said you'd do and haven't yet
  const missedTodos = virtualItems.filter((v) => !v._cycles && isMissed(v, isCompletedToday(v._completionId), now));
  const waitingCycles = virtualItems.filter((v) => {
    if (!v._cycles) return false;
    const s = careStatusFor(v);
    return s.state === 'overdue' || s.state === 'due';
  });

  const completedCount = virtualItems.filter((v) =>
    v._cycles ? careStatusFor(v).state === 'done' : isCompletedToday(v._completionId)
  ).length;
  const total = virtualItems.length;

  if (loading) return null;

  const groupChips = (
    <div className="dashboard-unified-card rounded-2xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setSelectedGroup(g.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors',
              selectedGroup === g.id
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
            )}
          >
            {g.name}
          </button>
        ))}
      </div>
    </div>
  );

  const selectedGroupName = groups.find((g) => g.id === selectedGroup)?.name ?? 'Daily';
  const isDailyGroup = selectedGroup === DAILY_GROUP_ID;

  return (
    <div className="space-y-3">
      {groupChips}

      {total === 0 ? (
        <div className="dashboard-unified-card rounded-2xl border px-8 py-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60">
            <CheckSquare className="h-7 w-7 text-zinc-600" />
          </div>
          <p className="mt-3 text-sm font-semibold text-zinc-300">
            {isDailyGroup ? 'No to-dos yet' : `Nothing in ${selectedGroupName} yet`}
          </p>
          <p className="mx-auto mt-1.5 max-w-[300px] text-xs text-zinc-500">
            {isDailyGroup
              ? 'Add your daily supplements, medicines, and habits, with a time if you like, and we’ll keep you honest.'
              : 'Add items with their own rhythm: daily, weekly, monthly, or every N days. We’ll remember when you last did each one.'}
          </p>
          <Link
            href="/settings?tab=todos"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/18"
          >
            <Settings className="h-3.5 w-3.5" />
            Add items
          </Link>
        </div>
      ) : (
        <>
          {/* Gentle nudges for forgotten things */}
          {missedTodos.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
              <div className="flex items-center gap-2">
                <AlarmClock className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-semibold text-amber-300">Psst, you might have forgotten...</p>
              </div>
              <ul className="mt-2 space-y-1">
                {missedTodos.slice(0, 4).map((v) => (
                  <li key={v._completionId} className="text-xs text-amber-200/80">
                    {v.title}{v._doseLabel ? ` (${v._doseLabel})` : ''} was planned for {formatTimeLabel(v.time)}. Still time to catch up!
                  </li>
                ))}
              </ul>
            </div>
          )}
          {waitingCycles.length > 0 && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-amber-400" />
                <p className="text-xs font-semibold text-amber-300">These have been waiting a while</p>
              </div>
              <ul className="mt-2 space-y-1">
                {waitingCycles.slice(0, 4).map((v) => {
                  const s = careStatusFor(v);
                  return (
                    <li key={v._completionId} className="text-xs text-amber-200/80">
                      {v.title}: {s.state === 'never'
                        ? 'never done yet'
                        : `last done ${humanDays((s as { daysAgo: number }).daysAgo)}`}. Worth checking off soon.
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="dashboard-unified-card rounded-2xl border p-4">
            <p className="text-xs text-zinc-400">{isDailyGroup ? 'Today so far' : `${selectedGroupName}, handled`}</p>
            <p className="mt-1 text-xl font-bold text-zinc-100">
              {completedCount}
              <span className="text-sm font-normal text-zinc-500"> / {total}</span>
            </p>
            {total > 0 && completedCount === total && (
              <p className="mt-1 text-xs font-medium text-emerald-400">
                {isDailyGroup ? 'Clean sweep! Nothing left for today.' : 'All taken care of. Look at you go.'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            {virtualItems.map((v) => {
              const status = v._cycles ? careStatusFor(v) : null;
              const done = v._cycles ? status!.state === 'done' : isCompletedToday(v._completionId);
              const completion = getCompletion(v._completionId);
              const isToggling = toggling.has(v._completionId);
              const missed = !v._cycles && isMissed(v, done, now);
              const statusLine = v._cycles ? careStatusLine(status!, v.cadence, v.cadenceDays) : null;

              return (
                <button
                  key={v._completionId}
                  type="button"
                  onClick={() => toggle(v._completionId)}
                  disabled={isToggling}
                  className={cn(
                    'group w-full rounded-2xl border px-4 py-3 text-left transition-all',
                    missed || statusLine?.tone === 'overdue'
                      ? 'border-amber-500/30 bg-amber-500/[0.04]'
                      : 'border-zinc-800 bg-zinc-900/30',
                    !isToggling && 'hover:bg-white/[0.04] active:scale-[0.995]',
                    done && 'opacity-75'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                      done ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-600 group-hover:border-zinc-500'
                    )}>
                      {isToggling
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />
                        : done ? <Check className="h-3.5 w-3.5 text-white stroke-[3]" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className={cn('text-sm font-medium', done ? 'line-through text-zinc-500' : 'text-zinc-100')}>
                          {v.title}
                          {v._doseLabel && <span className="ml-2 text-xs font-normal text-zinc-500">{v._doseLabel}</span>}
                        </p>
                        {v._cycles && (
                          <span className="rounded-full bg-fuchsia-400/10 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300">
                            {cadenceInfo(v.cadence, v.cadenceDays).label}
                          </span>
                        )}
                      </div>
                      {v.note && <p className="truncate text-xs text-zinc-500">{v.note}</p>}
                      {v._cycles && statusLine ? (
                        <p className={cn(
                          'mt-0.5 text-[11px] font-medium',
                          statusLine.tone === 'ok' && 'text-emerald-500',
                          statusLine.tone === 'due' && 'text-amber-400',
                          statusLine.tone === 'overdue' && 'text-amber-300'
                        )}>
                          {statusLine.text}
                        </p>
                      ) : done && completion ? (
                        <p className="mt-0.5 text-[11px] font-medium text-emerald-500">
                          Done at {formatCompletedAt(completion.completedAt)}
                        </p>
                      ) : v.category === 'food' ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-sky-400/80">
                          <Zap className="h-3 w-3" />
                          Logs to food when checked
                        </p>
                      ) : missed ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-amber-400">
                          <AlarmClock className="h-3 w-3" />
                          Planned for {formatTimeLabel(v.time)}. Not too late!
                        </p>
                      ) : v.time ? (
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {formatTimeLabel(v.time)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-1 pb-1">
        <Link
          href="/settings?tab=todos"
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-zinc-600 transition-all hover:bg-white/[0.04] hover:text-zinc-400"
        >
          <Settings className="h-3.5 w-3.5" />
          Manage items and groups
        </Link>
      </div>
    </div>
  );
}

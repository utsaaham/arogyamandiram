'use client';

import { useCallback, useMemo, useState } from 'react';
import { Check, CheckSquare, Clock, Loader2, Scissors, Settings, Zap } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/apiClient';
import { showToast } from '@/components/ui/Toast';
import { cn, getToday } from '@/lib/utils';
import { usePlanAutoRefresh } from './usePlanAutoRefresh';

type TodoTemplate = {
  id: string;
  title: string;
  note: string;
  time: string;
  category: 'food' | 'supplement' | 'medicine' | 'habit' | 'care' | 'other';
  enabled: boolean;
  frequency?: number;
  baseItems?: Record<string, unknown>[];
};

type VirtualTodoItem = TodoTemplate & {
  _completionId: string;
  _doseLabel: string | null;
};

type TodoCompletion = {
  templateId: string;
  completedAt: string;
};

function formatCompletedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

type TodosTabProps = {
  mode?: 'todos' | 'care';
};

export default function TodosTab({ mode = 'todos' }: TodosTabProps) {
  const today = getToday();
  const [templates, setTemplates] = useState<TodoTemplate[]>([]);
  const [completions, setCompletions] = useState<TodoCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTodosForDate(today);
      if (res.success && res.data) {
        setTemplates((res.data.templates ?? []) as TodoTemplate[]);
        setCompletions((res.data.completions ?? []) as TodoCompletion[]);
      }
    } finally {
      setLoading(false);
    }
  }, [today]);

  usePlanAutoRefresh(load);

  const visibleTemplates = useMemo(() => {
    if (mode === 'care') return templates.filter((t) => t.category === 'care');
    return templates.filter((t) => t.category !== 'care');
  }, [mode, templates]);

  const virtualItems = useMemo(() => visibleTemplates.flatMap((t): VirtualTodoItem[] => {
    const freq = t.frequency ?? 1;
    if (freq <= 1) return [{ ...t, _completionId: t.id, _doseLabel: null }];
    return Array.from({ length: freq }, (_, i): VirtualTodoItem => ({
      ...t,
      _completionId: `${t.id}::${i}`,
      _doseLabel: `Dose ${i + 1}`,
    }));
  }), [visibleTemplates]);

  const isCompleted = (completionId: string) =>
    completions.some((c) => c.templateId === completionId);

  const getCompletion = (completionId: string) =>
    completions.find((c) => c.templateId === completionId);

  const toggle = async (completionId: string) => {
    if (toggling.has(completionId)) return;
    const nowCompleted = !isCompleted(completionId);
    const baseId = completionId.includes('::') ? completionId.split('::')[0] : completionId;
    const tmpl = templates.find((t) => t.id === baseId);

    setToggling((prev) => new Set(prev).add(completionId));

    if (nowCompleted) {
      setCompletions((prev) => [...prev, { templateId: completionId, completedAt: new Date().toISOString() }]);
    } else {
      setCompletions((prev) => prev.filter((c) => c.templateId !== completionId));
    }

    try {
      const isFirstDose = !completionId.includes('::') || completionId.endsWith('::0');
      if (nowCompleted && tmpl?.category === 'food' && isFirstDose) {
        const items = tmpl.baseItems ?? [];
        if (items.length > 0) {
          const mealType = (() => {
            const h = new Date().getHours();
            if (h < 10) return 'breakfast';
            if (h < 14) return 'lunch';
            if (h < 18) return 'snack';
            return 'dinner';
          })();
          await Promise.all(items.map((item) => api.addMeal(today, { ...item, mealType })));
          showToast(`Logged ${items.length} food item${items.length !== 1 ? 's' : ''} to your food log`, 'success');
        }
      }

      const res = await api.toggleTodo(completionId, today, nowCompleted);
      if (!res.success) {
        setCompletions((prev) =>
          nowCompleted
            ? prev.filter((c) => c.templateId !== completionId)
            : [...prev, { templateId: completionId, completedAt: new Date().toISOString() }]
        );
        showToast(res.error || 'Failed to update', 'error');
      }
    } catch {
      showToast('Failed to update todo', 'error');
    } finally {
      setToggling((prev) => { const s = new Set(prev); s.delete(completionId); return s; });
    }
  };

  const completedCount = virtualItems.filter((v) => isCompleted(v._completionId)).length;
  const total = virtualItems.length;

  if (loading) return null;

  if (total === 0) {
    const isCare = mode === 'care';
    return (
      <div className="dashboard-unified-card rounded-2xl border px-8 py-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800/60">
          {isCare ? <Scissors className="h-7 w-7 text-zinc-600" /> : <CheckSquare className="h-7 w-7 text-zinc-600" />}
        </div>
        <p className="mt-3 text-sm font-semibold text-zinc-300">
          {isCare ? 'No care items for today' : 'No todos for today'}
        </p>
        <Link
          href="/settings?tab=todos"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/18"
        >
          <Settings className="h-3.5 w-3.5" />
          {isCare ? 'Set up Care' : 'Set up Todos'}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="dashboard-unified-card rounded-2xl border p-4">
        <p className="text-xs text-zinc-400">{mode === 'care' ? 'Care progress' : 'Todo progress'}</p>
        <p className="mt-1 text-xl font-bold text-zinc-100">
          {completedCount}
          <span className="text-sm font-normal text-zinc-500"> / {total}</span>
        </p>
      </div>

      <div className="space-y-2">
        {virtualItems.map((v) => {
          const done = isCompleted(v._completionId);
          const completion = getCompletion(v._completionId);
          const isToggling = toggling.has(v._completionId);

          return (
            <button
              key={v._completionId}
              type="button"
              onClick={() => toggle(v._completionId)}
              disabled={isToggling}
              className={cn(
                'group w-full rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-left transition-all',
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
                  <p className={cn('text-sm font-medium', done ? 'line-through text-zinc-500' : 'text-zinc-100')}>
                    {v.title}
                    {v._doseLabel && <span className="ml-2 text-xs font-normal text-zinc-500">{v._doseLabel}</span>}
                  </p>
                  {v.note && <p className="truncate text-xs text-zinc-500">{v.note}</p>}
                  {done && completion ? (
                    <p className="mt-0.5 text-[11px] font-medium text-emerald-500">
                      Done at {formatCompletedAt(completion.completedAt)}
                    </p>
                  ) : v.category === 'food' ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-sky-400/80">
                      <Zap className="h-3 w-3" />
                      Logs to food when checked
                    </p>
                  ) : v.time ? (
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {v.time}
                    </p>
                  ) : null}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

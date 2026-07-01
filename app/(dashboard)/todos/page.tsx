'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Check,
  CheckSquare,
  Settings,
  Pill,
  Flame,
  Zap,
  Clock,
  Utensils,
  Loader2,
  MoreHorizontal,
  Scissors,
} from 'lucide-react';
import Link from 'next/link';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import api from '@/lib/apiClient';
import { cn, getToday } from '@/lib/utils';
import DashboardPageShell from '@/components/layout/DashboardPageShell';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodoTemplate {
  id: string;
  title: string;
  note: string;
  time: string;
  category: 'food' | 'supplement' | 'medicine' | 'habit' | 'care' | 'other';
  enabled: boolean;
  frequency?: number;
  baseItems?: Record<string, unknown>[];
}

interface VirtualTodoItem extends TodoTemplate {
  _completionId: string;
  _doseLabel: string | null;
}

interface TodoCompletion {
  templateId: string;
  completedAt: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG = {
  food:       { label: 'Food',       icon: Utensils,    textCls: 'text-sky-400',     bgCls: 'bg-sky-400/15',     barCls: 'bg-sky-500' },
  supplement: { label: 'Supplement', icon: Zap,         textCls: 'text-emerald-400', bgCls: 'bg-emerald-400/15', barCls: 'bg-emerald-500' },
  medicine:   { label: 'Medicine',   icon: Pill,        textCls: 'text-rose-400',    bgCls: 'bg-rose-400/15',    barCls: 'bg-rose-500' },
  habit:      { label: 'Habit',      icon: Flame,       textCls: 'text-amber-400',   bgCls: 'bg-amber-400/15',   barCls: 'bg-amber-500' },
  care:       { label: 'Care',       icon: Scissors,    textCls: 'text-fuchsia-300', bgCls: 'bg-fuchsia-400/15', barCls: 'bg-fuchsia-500' },
  other:      { label: 'Other',      icon: MoreHorizontal,  textCls: 'text-zinc-400',    bgCls: 'bg-zinc-400/15',    barCls: 'bg-zinc-500' },
};

function formatCompletedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodosPage() {
  const today = getToday();

  const [templates, setTemplates] = useState<TodoTemplate[]>([]);
  const [completions, setCompletions] = useState<TodoCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const fetchTodos = useCallback(async () => {
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

  useEffect(() => { fetchTodos(); }, [fetchTodos]);

  // Expand templates into virtual items (multi-dose templates → one item per dose)
  const virtualItems: VirtualTodoItem[] = templates.flatMap((t): VirtualTodoItem[] => {
    const freq = t.frequency ?? 1;
    if (freq <= 1) return [{ ...t, _completionId: t.id, _doseLabel: null }];
    return Array.from({ length: freq }, (_, i): VirtualTodoItem => ({
      ...t,
      _completionId: `${t.id}::${i}`,
      _doseLabel: `Dose ${i + 1}`,
    }));
  });

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
  const allDone = total > 0 && completedCount === total;

  return (
    <div className="animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop">
      <DashboardPageShell
        title="Checklist"
        subtitle={today}
        icon={CheckSquare}
        mobileVariant="card"
      />

      <div className="mobile-fade-up mobile-dash-px lg:px-0 space-y-3" style={{ animationDelay: '80ms' }}>

        {/* ── Progress card ── */}
        {!loading && total > 0 && (
          <div className="dashboard-unified-card rounded-2xl p-5">
            <div>
              <p className="text-sm text-zinc-400">Today&apos;s progress</p>
              <p className="mt-0.5 text-2xl font-bold text-zinc-100">
                {completedCount}
                <span className="text-base font-normal text-zinc-500"> / {total}</span>
              </p>
            </div>
            {allDone && (
              <p className="mt-2 text-sm font-medium text-emerald-400">All done for today!</p>
            )}
          </div>
        )}

        {/* ── Todo list ── */}
        {loading ? (
          <CardSkeleton />
        ) : total === 0 ? (
          <div className="dashboard-unified-card rounded-2xl px-8 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/60">
              <CheckSquare className="h-8 w-8 text-zinc-600" />
            </div>
            <p className="mt-4 text-base font-semibold text-zinc-300">No checklist items yet</p>
            <p className="mt-1.5 text-sm text-zinc-500 max-w-[260px] mx-auto">
              Set up recurring items like supplements, medicines, care, and habits.
            </p>
            <Link
              href="/settings?tab=todos"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 px-5 py-2.5 text-sm font-semibold text-emerald-400 hover:bg-emerald-500/18 transition-colors ring-1 ring-emerald-500/20"
            >
              <Settings className="h-4 w-4" />
              Set up Checklist
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {virtualItems.map((v) => {
              const done = isCompleted(v._completionId);
              const completion = getCompletion(v._completionId);
              const cfg = CATEGORY_CONFIG[v.category] ?? CATEGORY_CONFIG.other;
              const CategoryIcon = cfg.icon;
              const isToggling = toggling.has(v._completionId);

              return (
                <button
                  key={v._completionId}
                  type="button"
                  onClick={() => toggle(v._completionId)}
                  disabled={isToggling}
                  className={cn(
                    'group w-full overflow-hidden rounded-2xl text-left transition-all duration-200',
                    'dashboard-unified-card',
                    !isToggling && 'hover:bg-white/[0.04] active:scale-[0.995]',
                    done && 'opacity-75',
                    isToggling && 'cursor-default'
                  )}
                >
                  <div className="flex items-center gap-3.5 px-4 py-3.5">
                      {/* Category icon */}
                      <div className={cn(
                        'shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
                        done ? 'bg-zinc-800/60' : cfg.bgCls
                      )}>
                        {isToggling
                          ? <Loader2 className="h-5 w-5 text-zinc-500 animate-spin" />
                          : <CategoryIcon className={cn('h-5 w-5 transition-colors', done ? 'text-zinc-600' : cfg.textCls)} />
                        }
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-semibold leading-snug',
                          done ? 'line-through text-zinc-500' : 'text-zinc-100'
                        )}>
                          {v.title}
                          {v._doseLabel && (
                            <span className={cn('ml-2 text-xs font-normal', done ? 'text-zinc-600' : 'text-zinc-500')}>
                              {v._doseLabel}
                            </span>
                          )}
                        </p>
                        {v.note && (
                          <p className="mt-0.5 text-xs text-zinc-500 truncate">{v.note}</p>
                        )}
                        {done && completion ? (
                          <p className="mt-0.5 text-[11px] font-medium text-emerald-500">
                            Done at {formatCompletedAt(completion.completedAt)}
                          </p>
                        ) : v.category === 'food' ? (
                          <p className="mt-0.5 text-[11px] text-sky-600/80">Logs to food when checked</p>
                        ) : v.time ? (
                          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-600">
                            <Clock className="h-3 w-3" />{v.time}
                          </p>
                        ) : null}
                      </div>

                      {/* Checkbox */}
                      <div className={cn(
                        'shrink-0 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all duration-200',
                        done
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-zinc-600 group-hover:border-zinc-500'
                      )}>
                        {done && <Check className="h-3.5 w-3.5 text-white stroke-[3]" />}
                      </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Manage link */}
        {!loading && total > 0 && (
          <div className="flex justify-end pb-2">
            <Link
              href="/settings?tab=todos"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04] transition-all"
            >
              <Settings className="h-3.5 w-3.5" />
              Manage checklist
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}

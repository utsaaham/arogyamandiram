'use client';

// ============================================
// Settings > Connectors > Import a week plan
// ============================================
// Paste the "My Week" HTML, hit Parse to see exactly what was read, then Import
// to write one DailyPlan per day. Parse never writes, so a bad paste costs
// nothing. Import overwrites the plan for those seven dates.

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, FileCode2, Loader2, Upload, Check } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import api, { type PlanImportPreview } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

/** Monday of the current week, as YYYY-MM-DD in local time. */
function currentWeekStart(): string {
  const d = new Date();
  const offset = (d.getDay() + 6) % 7; // 0 = Sunday -> shift so Monday is 0
  d.setDate(d.getDate() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PlanImportCard() {
  const [html, setHtml] = useState('');
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [preview, setPreview] = useState<PlanImportPreview | null>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [imported, setImported] = useState<string[]>([]);

  const totals = useMemo(() => {
    if (!preview) return null;
    return preview.days.reduce(
      (acc, d) => ({
        items: acc.items + d.itemCount,
        exercises: acc.exercises + d.exerciseCount,
      }),
      { items: 0, exercises: 0 }
    );
  }, [preview]);

  async function handleParse() {
    if (!html.trim()) {
      showToast('Paste the plan HTML first', 'error');
      return;
    }
    setParsing(true);
    setImported([]);
    const res = await api.previewPlanImport(html, weekStart);
    setParsing(false);

    if (!res.success || !res.data) {
      setPreview(null);
      showToast(res.error || 'Could not parse that file', 'error');
      return;
    }
    setPreview(res.data);
    showToast(`Parsed ${res.data.days.length} days`, 'success');
  }

  async function handleImport() {
    if (!preview) return;
    setImporting(true);
    const res = await api.importPlan(html, weekStart);
    setImporting(false);

    if (!res.success || !res.data) {
      showToast(res.error || 'Import failed', 'error');
      return;
    }
    setImported(res.data.dates);
    showToast(`Imported ${res.data.dates.length} days`, 'success');
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">Import a week plan</h2>
            {preview && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {preview.days.length} days parsed
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Paste your plan HTML to fill Ciel&apos;s food and workout plan for a whole week. Parse first
            to check it, then import.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleParse}
            disabled={parsing || !html.trim()}
            className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50"
          >
            {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCode2 className="h-3.5 w-3.5" />}
            Parse
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!preview || importing}
            className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
          >
            {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            Import
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-xs font-medium text-text-muted">Plan HTML</label>
          <textarea
            value={html}
            onChange={(e) => { setHtml(e.target.value); setPreview(null); setImported([]); }}
            rows={6}
            spellCheck={false}
            placeholder="Paste the whole file, starting with <!doctype html>"
            className="glass-input mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          {html.trim() && (
            <p className="mt-1 text-[11px] text-text-muted">
              {(html.length / 1024).toFixed(0)} KB pasted
            </p>
          )}
        </div>

        {preview?.datedSource ? (
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              Week of {preview.weekStart}
            </label>
            <p className="mt-1 text-[11px] text-text-muted">
              This file dates its own days, so the week picker does not apply.
              {preview.rolledWeeks !== 0 && preview.weekStarting && (
                <> It was written for {preview.weekStarting} and rolls forward{' '}
                  {preview.rolledWeeks} week{Math.abs(preview.rolledWeeks) === 1 ? '' : 's'} to the
                  week you are in, which is what the file asks for.</>
              )}
            </p>
          </div>
        ) : (
          <div>
            <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              Week starts (Monday)
            </label>
            <input
              type="date"
              value={weekStart}
              onChange={(e) => { setWeekStart(e.target.value); setPreview(null); setImported([]); }}
              className="glass-input mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 sm:w-52"
            />
            <p className="mt-1 text-[11px] text-text-muted">
              An older plan file is Monday to Sunday with no dates of its own, so it gets mapped onto
              this week. A file that carries its own dates ignores this.
            </p>
          </div>
        )}

        {preview && (
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-muted">
              <span>{totals?.items} food items</span>
              <span>{totals?.exercises} exercises</span>
              {preview.hasProfile && <span>profile block</span>}
              {preview.guide.length > 0 && <span>{preview.guide.length} guide sections</span>}
            </div>

            {preview.sourceUnit === 'lb' && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-300/90">
                Loads in this file are in pounds. The workout screen shows kilograms, so every weight is
                converted on import.
              </p>
            )}

            <div className="space-y-1.5">
              {preview.days.map((day) => {
                const open = openDay === day.dayName;
                const done = imported.includes(day.date);
                return (
                  <div key={day.dayName} className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
                    <button
                      type="button"
                      onClick={() => setOpenDay(open ? null : day.dayName)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-900"
                    >
                      {done
                        ? <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        : <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform', open && 'rotate-180')} />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span className="text-sm font-semibold text-text-primary">{day.dayName}</span>
                          <span className="text-[11px] text-text-muted">{day.date}</span>
                          <span className="text-[11px] font-medium text-emerald-400">{day.short}</span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-text-muted">
                          {Math.round(day.totals.calories)} kcal &middot; {day.totals.protein} g protein &middot;{' '}
                          {day.itemCount} items &middot; {day.mainCount} main lifts
                        </div>
                      </div>
                    </button>

                    {open && (
                      <div className="grid gap-4 border-t border-zinc-800 px-3 py-3 sm:grid-cols-2">
                        <div>
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Food</h4>
                          <ul className="mt-1.5 space-y-1">
                            {day.meals.map((meal) => (
                              <li key={meal.slot + meal.name}>
                                <div className="text-[11px] font-medium text-zinc-300">
                                  {meal.slot} &middot; {meal.name}
                                </div>
                                <ul className="mt-0.5 space-y-0.5 pl-3">
                                  {meal.items.map((it) => (
                                    <li key={it.name} className="truncate text-[11px] text-text-muted">
                                      {it.name} <span className="text-zinc-600">({it.calories} kcal, {it.protein}P)</span>
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Training</h4>
                          <ul className="mt-1.5 space-y-0.5">
                            {day.exercises.map((ex, i) => (
                              <li key={`${ex.name}-${i}`} className="text-[11px] text-text-muted">
                                <span className="text-zinc-600">{ex.block}</span>{' '}
                                <span className="text-zinc-300">{ex.name}</span>
                                {ex.sets ? ` - ${ex.sets} x ${ex.reps}${ex.repsMax ? `-${ex.repsMax}` : ''}` : ''}
                                {ex.durationMinutes ? ` - ${ex.durationMinutes} min` : ''}
                                {ex.weightKg ? ` @ ${ex.weightKg} kg` : ex.bodyweight ? ' @ bodyweight' : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {imported.length > 0 && (
              <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300/90">
                Imported {imported.length} days. Open Today&apos;s Plan to see them.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

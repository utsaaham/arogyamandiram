'use client';

// ============================================
// Settings > Connectors > Paste a health export
// ============================================
// For weeks that arrive as a file rather than through the phone connector.
// Read shows exactly which days and numbers were found and writes nothing;
// Import stores the raw snapshot and maps it into the daily log, the same way
// a device push does. Importing a date you already have overwrites that day.

import { useMemo, useState } from 'react';
import { Check, ClipboardPaste, FileCode2, Loader2, Upload } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import api, { type HealthImportPreview } from '@/lib/apiClient';

const nf = new Intl.NumberFormat('en-US');
const dash = (v: number | null, suffix = '', digits = 0) =>
  v === null ? '—' : `${nf.format(Number(v.toFixed(digits)))}${suffix}`;

export default function HealthImportCard() {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<HealthImportPreview | null>(null);
  const [reading, setReading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<string[]>([]);

  const range = useMemo(() => {
    if (!preview || preview.days.length === 0) return '';
    const first = preview.days[0].date;
    const last = preview.days[preview.days.length - 1].date;
    return first === last ? first : `${first} to ${last}`;
  }, [preview]);

  const reset = (value: string) => {
    setText(value);
    setPreview(null);
    setImported([]);
  };

  async function handleRead() {
    if (!text.trim()) {
      showToast('Paste the export first', 'error');
      return;
    }
    setReading(true);
    const res = await api.previewHealthImport(text);
    setReading(false);

    if (!res.success || !res.data) {
      setPreview(null);
      showToast(res.error || 'Could not read that paste', 'error');
      return;
    }
    setPreview(res.data);
    setImported([]);
    showToast(`Read ${res.data.days.length} day${res.data.days.length === 1 ? '' : 's'}`, 'success');
  }

  async function handleImport() {
    if (!preview) return;
    setImporting(true);
    const res = await api.importHealthPaste(text);
    setImporting(false);

    if (!res.success || !res.data) {
      showToast(res.error || 'Import failed', 'error');
      return;
    }
    setImported(res.data.dates);
    showToast(`Imported ${res.data.dates.length} day${res.data.dates.length === 1 ? '' : 's'}`, 'success');
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-text-primary">Paste a health export</h2>
            {preview && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {preview.days.length} day{preview.days.length === 1 ? '' : 's'} read
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-text-muted">
            No phone connector needed. Paste the export JSON, or the whole dashboard file, and the
            days land in your log like a device sync would put them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRead}
            disabled={reading || !text.trim()}
            className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100 disabled:opacity-50"
          >
            {reading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileCode2 className="h-3.5 w-3.5" />}
            Read
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
          <label className="flex items-center gap-1.5 text-xs font-medium text-text-muted">
            <ClipboardPaste className="h-3.5 w-3.5" />
            Export JSON or dashboard HTML
          </label>
          <textarea
            value={text}
            onChange={(e) => reset(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder='Paste the "Copy JSON" output, or the whole file starting with <!doctype html>'
            className="glass-input mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
          {text.trim() && (
            <p className="mt-1 text-[11px] text-text-muted">
              {(text.length / 1024).toFixed(0)} KB pasted
            </p>
          )}
        </div>

        {preview && (
          <div className="space-y-3 border-t border-zinc-800 pt-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-muted">
              <span>{range}</span>
              <span>read from {preview.source === 'html' ? 'the dashboard file' : 'JSON'}</span>
              {preview.extractedAt && (
                <span>exported {new Date(preview.extractedAt).toLocaleString()}</span>
              )}
              {preview.skipped > 0 && (
                <span className="text-amber-300/90">{preview.skipped} older days dropped</span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-[11px]">
                <thead className="text-text-muted">
                  <tr className="border-b border-zinc-800">
                    <th className="py-1.5 pr-3 font-medium">Day</th>
                    <th className="py-1.5 pr-3 font-medium">Steps</th>
                    <th className="py-1.5 pr-3 font-medium">Active kcal</th>
                    <th className="py-1.5 pr-3 font-medium">Resting HR</th>
                    <th className="py-1.5 pr-3 font-medium">HRV</th>
                    <th className="py-1.5 pr-3 font-medium">Sleep</th>
                    <th className="py-1.5 font-medium">Workouts</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.days.map((day) => (
                    <tr key={day.date} className="border-b border-zinc-800/60 last:border-0">
                      <td className="py-1.5 pr-3 whitespace-nowrap font-medium text-zinc-300">
                        <span className="inline-flex items-center gap-1.5">
                          {imported.includes(day.date) && <Check className="h-3 w-3 text-emerald-400" />}
                          {day.date}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-text-muted">{dash(day.steps)}</td>
                      <td className="py-1.5 pr-3 text-text-muted">{dash(day.activeCalories)}</td>
                      <td className="py-1.5 pr-3 text-text-muted">{dash(day.restingBpm, ' bpm')}</td>
                      <td className="py-1.5 pr-3 text-text-muted">{dash(day.hrvSdnnMs, ' ms', 1)}</td>
                      <td className="py-1.5 pr-3 text-text-muted">{dash(day.sleepHours, ' h', 1)}</td>
                      <td className="py-1.5 text-text-muted">
                        {day.workoutCount === 0 ? '—' : day.workoutNames.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {preview.days.some((d) => d.sleepHours === null) && (
              <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-300/90">
                Some days carry no sleep. Those nights stay empty in your log rather than being
                filled in with a guess.
              </p>
            )}

            {imported.length > 0 && (
              <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-emerald-300/90">
                Imported {imported.length} day{imported.length === 1 ? '' : 's'}. Open the dashboard to
                see them.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

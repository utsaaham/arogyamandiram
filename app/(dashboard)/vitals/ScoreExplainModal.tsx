'use client';

// ============================================
// Vitals › tap-to-explain - exact score breakdown modal
// ============================================
// Everything shown here is deterministic arithmetic from the attribution
// engine (lib/intelligence/attribution.ts): why the value, biggest +/−
// contributors, what changed since yesterday, and the fastest lever.

import { X, TrendingUp, TrendingDown, Minus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScoreAttribution } from '@/lib/scores';

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  low: 'border-zinc-600 bg-zinc-800/60 text-zinc-400',
};

export function ConfidenceChip({ level, reason }: { level: string; reason?: string }) {
  return (
    <span
      title={reason}
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize',
        CONFIDENCE_STYLES[level] ?? CONFIDENCE_STYLES.low
      )}
    >
      {level} confidence
    </span>
  );
}

export function ChangeArrow({ direction, deltaPts }: { direction: 'up' | 'down' | 'flat' | null; deltaPts?: number | null }) {
  if (!direction) return null;
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  const color = direction === 'up' ? 'text-emerald-400' : direction === 'down' ? 'text-rose-400' : 'text-zinc-500';
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[11px] font-semibold', color)}>
      <Icon className="h-3.5 w-3.5" />
      {deltaPts != null && deltaPts !== 0 ? `${deltaPts > 0 ? '+' : ''}${deltaPts}` : ''}
    </span>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  attribution: ScoreAttribution | null;
}

export default function ScoreExplainModal({ open, onClose, title, attribution }: Props) {
  if (!open || !attribution) return null;
  const { score, contributions, penalties, changeVsYesterday, vsBaseline, confidence, fastestLever } = attribution;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-zinc-800 bg-zinc-950 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-text-primary">{title}: why {score ?? '--'}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {vsBaseline.phrase && (
                <span className="text-[11px] text-zinc-400">{vsBaseline.phrase}</span>
              )}
              <ConfidenceChip level={confidence.level} reason={confidence.reason} />
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-500 hover:text-zinc-300">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* What changed since yesterday */}
        {changeVsYesterday.totalDelta !== null && (
          <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="flex items-center gap-2">
              <ChangeArrow direction={changeVsYesterday.direction} deltaPts={changeVsYesterday.totalDelta} />
              <p className="text-xs font-semibold text-zinc-300">vs yesterday</p>
            </div>
            {changeVsYesterday.biggestReason && (
              <p className="mt-1 text-xs text-zinc-400">{changeVsYesterday.biggestReason}</p>
            )}
            {changeVsYesterday.byComponent.length > 1 && (
              <ul className="mt-2 space-y-0.5">
                {changeVsYesterday.byComponent.slice(0, 4).map((c) => (
                  <li key={c.key} className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{c.label}</span>
                    <span className={c.deltaPts > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {c.deltaPts > 0 ? '+' : ''}{c.deltaPts} pts
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Contribution table */}
        <div className="mt-4">
          <p className="text-xs font-semibold text-zinc-300">What makes up this score</p>
          <div className="mt-2 space-y-2">
            {contributions.map((c) => (
              <div key={c.key} className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-zinc-200">{c.label}</p>
                  <p className="text-[11px] text-zinc-400">
                    {c.componentScore}/100 · {c.weightPct}% weight · <span className="font-semibold text-zinc-200">{c.contributionPts} pts</span>
                  </p>
                </div>
                {c.note && <p className="mt-0.5 text-[11px] text-zinc-500">{c.note}</p>}
              </div>
            ))}
            {penalties.map((p) => (
              <div key={p.key} className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-rose-300">{p.label}</p>
                  {p.contributionPts !== 0 && (
                    <p className="text-[11px] font-semibold text-rose-400">{p.contributionPts} pts</p>
                  )}
                </div>
                {p.note && <p className="mt-0.5 text-[11px] text-zinc-500">{p.note}</p>}
              </div>
            ))}
            {contributions.length === 0 && penalties.length === 0 && (
              <p className="text-[12px] text-zinc-500">No signals available for this score today.</p>
            )}
          </div>
        </div>

        {/* Fastest lever */}
        {fastestLever && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2.5">
            <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-xs font-semibold text-emerald-300">Fastest lever</p>
              <p className="mt-0.5 text-[11px] text-emerald-100/80">{fastestLever.note}</p>
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-[10px] text-zinc-600">
          Exact arithmetic from your own baselines. Wellness estimates, not medical advice.
        </p>
      </div>
    </div>
  );
}

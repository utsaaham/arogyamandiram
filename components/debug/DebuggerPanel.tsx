'use client';

import { useState, useCallback, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

/** Meal Ideas debug log shape (matches API response). New format: prompt/response. Legacy: step1/step2. */
export interface MealIdeasDebugLog {
  userRequest: { selectedMealTypes: string[]; preferences: string; requestedAt: string };
  mealHistorySent?: Record<string, string[]>;
  /** Per-day meal history for display (date -> mealType -> { items, totalCalories }). */
  mealHistoryByDay?: Record<string, Record<string, { items: string[]; totalCalories: number }>>;
  /** User profile context (height, weight, targetWeight, activityLevel, goal, age). */
  userContext?: { height?: number; weight?: number; targetWeight?: number; activityLevel?: string; goal?: string; age?: number };
  /** New single-step format */
  systemPrompt?: string;
  userPrompt?: string;
  prompt?: string;
  response?: string;
  /** Legacy two-step format */
  step1Prompt?: string;
  step1Response?: string;
  step2Prompt?: string;
  step2Response?: string;
  metadata: {
    model: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    latencyMs?: number;
    step1Usage?: { prompt_tokens?: number; completion_tokens?: number };
    step2Usage?: { prompt_tokens?: number; completion_tokens?: number };
    step1LatencyMs?: number;
    step2LatencyMs?: number;
    timestamp: string;
  };
}

export interface DebuggerPanelFoodLogs {
  mealIdeas?: MealIdeasDebugLog | null;
  aiLogger?: unknown | null;
}

interface DebuggerPanelProps {
  foodLogs?: DebuggerPanelFoodLogs | null;
}

const CARD_BORDER = 'border border-[#1e1e1e]';

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        'flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200',
        className
      )}
    >
      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

/** Simple JSON syntax highlighting (keys, strings, numbers). */
function JsonHighlight({ raw }: { raw: string }) {
  try {
    const parsed = JSON.parse(raw);
    const str = JSON.stringify(parsed, null, 2);
    const parts: { type: 'key' | 'string' | 'number' | 'other'; text: string }[] = [];
    let i = 0;
    const keyRe = /^"(?:[^"\\]|\\.)*"(?=\s*:)/;
    const strRe = /^"(?:[^"\\]|\\.)*"/;
    const numRe = /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/i;
    while (i < str.length) {
      const rest = str.slice(i);
      const ws = rest.match(/^\s+/);
      if (ws) {
        parts.push({ type: 'other', text: ws[0] });
        i += ws[0].length;
        continue;
      }
      if (rest.startsWith('"')) {
        const keyMatch = rest.match(keyRe);
        const key = keyMatch && rest[keyMatch[0].length].match(/\s/) ? keyMatch[0] : null;
        if (key) {
          parts.push({ type: 'key', text: key });
          i += key.length;
          continue;
        }
        const strMatch = rest.match(strRe);
        if (strMatch) {
          parts.push({ type: 'string', text: strMatch[0] });
          i += strMatch[0].length;
          continue;
        }
      }
      const numMatch = rest.match(numRe);
      if (numMatch) {
        parts.push({ type: 'number', text: numMatch[0] });
        i += numMatch[0].length;
        continue;
      }
      const one = rest[0];
      parts.push({ type: 'other', text: one });
      i += 1;
    }
    return (
      <code className="block whitespace-pre text-left font-mono text-[11px] leading-relaxed">
        {parts.map((p, idx) => (
          <span
            key={idx}
            className={
              p.type === 'key'
                ? 'text-amber-400/90'
                : p.type === 'string'
                  ? 'text-emerald-300/90'
                  : p.type === 'number'
                    ? 'text-sky-400'
                    : 'text-zinc-500'
            }
          >
            {p.text}
          </span>
        ))}
      </code>
    );
  } catch {
    return (
      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-400">
        {raw}
      </pre>
    );
  }
}

export const SECTION_IDS = ['input', 'step1', 'metadata'] as const;

type SectionId = (typeof SECTION_IDS)[number];

const CONNECTOR_COLOR = '#2a2a2a';

/** Vertical connector: 2px line + downward arrow + center label */
function PipelineConnector({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-3" aria-hidden>
      <div className="h-6 w-[2px] shrink-0 rounded-full" style={{ backgroundColor: CONNECTOR_COLOR }} />
      <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 -mt-0.5" style={{ color: CONNECTOR_COLOR }}>
        <path d="M7 2l6 8H1L7 2z" fill="currentColor" />
      </svg>
      <div className="h-2 w-[2px] shrink-0" style={{ backgroundColor: CONNECTOR_COLOR }} />
      <span className="mt-1.5 max-w-[220px] text-center text-[10px] leading-tight text-zinc-500">{label}</span>
      <div className="mt-1.5 h-4 w-[2px] shrink-0" style={{ backgroundColor: CONNECTOR_COLOR }} />
    </div>
  );
}

/** Collapsible zone card with 1px #1e1e1e border */
function PipelineZone({
  label,
  open,
  onToggle,
  badges,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  badges?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('w-full overflow-hidden rounded-md bg-white/[0.02]', CARD_BORDER)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <div className="flex min-w-0 items-center gap-2">
          {open ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          )}
          <span className="text-[11px] font-medium uppercase tracking-widest text-zinc-400">
            {label}
          </span>
          {badges}
        </div>
      </button>
      <div
        className={cn(
          'grid transition-all duration-200 ease-out',
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-[#1e1e1e] px-3 pb-3 pt-2">{children}</div>
        </div>
      </div>
    </div>
  );
}

function totalTokens(log: MealIdeasDebugLog): number {
  const u = log.metadata?.usage ?? {};
  if ((u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0) > 0) {
    return (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
  }
  const s1 = log.metadata?.step1Usage ?? {};
  const s2 = log.metadata?.step2Usage ?? {};
  return (
    (s1.prompt_tokens ?? 0) +
    (s1.completion_tokens ?? 0) +
    (s2.prompt_tokens ?? 0) +
    (s2.completion_tokens ?? 0)
  );
}

function Step2ResponseBlock({ raw, isJson }: { raw: string; isJson: boolean }) {
  const [formatted, setFormatted] = useState(true);
  const displayRaw = !formatted || !isJson;
  const displayContent = displayRaw
    ? raw
    : (() => {
        try {
          return JSON.stringify(JSON.parse(raw), null, 2);
        } catch {
          return raw;
        }
      })();
  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-end gap-2">
        {isJson && (
          <button
            type="button"
            onClick={() => setFormatted((f) => !f)}
            className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-zinc-500 hover:bg-white/10 hover:text-zinc-400"
          >
            {formatted ? 'Raw' : 'Formatted'}
          </button>
        )}
        <CopyButton text={raw} />
      </div>
      <div className="max-h-[320px] overflow-auto pr-4">
        {displayRaw ? (
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-400">
            {raw}
          </pre>
        ) : (
          <JsonHighlight raw={displayContent} />
        )}
      </div>
    </div>
  );
}

function MetadataBar({ log, totalLatency }: { log: MealIdeasDebugLog; totalLatency: number }) {
  const meta = log.metadata ?? {};
  const u = meta.usage ?? {};
  let promptTotal = u.prompt_tokens ?? 0;
  let completionTotal = u.completion_tokens ?? 0;
  if (promptTotal + completionTotal === 0) {
    const s1 = meta.step1Usage ?? {};
    const s2 = meta.step2Usage ?? {};
    promptTotal = (s1.prompt_tokens ?? 0) + (s2.prompt_tokens ?? 0);
    completionTotal = (s1.completion_tokens ?? 0) + (s2.completion_tokens ?? 0);
  }
  const total = promptTotal + completionTotal;
  const timestamp = meta.timestamp ?? '';
  const formattedTs = timestamp
    ? new Date(timestamp).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';
  const username = (meta as { username?: string }).username;

  const items: { label: string; value: ReactNode }[] = [
    ...(username ? [{ label: 'User', value: username }] : []),
    { label: 'Model', value: meta.model ?? '—' },
    { label: 'Prompt', value: promptTotal.toLocaleString() },
    { label: 'Completion', value: completionTotal.toLocaleString() },
    { label: 'Total', value: total.toLocaleString() },
    { label: 'Latency', value: `${totalLatency.toLocaleString()}ms` },
    {
      label: 'Status',
      value: (
        <span className="flex items-center gap-1.5 font-medium text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          SUCCESS
        </span>
      ),
    },
    { label: 'Timestamp', value: formattedTs },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-x-6 gap-y-3 text-[11px]">
      {items.map(({ label, value }) => (
        <div key={label} className="flex min-w-0 flex-col">
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</span>
          <span className="font-mono text-zinc-300">{value}</span>
        </div>
      ))}
    </div>
  );
}

/** Thin → divider row between prompt and response inside a step card */
function StepDivider() {
  return (
    <div className="flex items-center gap-2 py-2">
      <div className="h-px flex-1 bg-[#1e1e1e]" aria-hidden />
      <span className="text-[10px] text-zinc-500">→</span>
      <div className="h-px flex-1 bg-[#1e1e1e]" aria-hidden />
    </div>
  );
}

export function MealIdeasLogView({
  log,
  openSections,
  onToggleSection,
  allExpanded,
}: {
  log: MealIdeasDebugLog;
  openSections: Set<SectionId>;
  onToggleSection: (id: SectionId, isCurrentlyOpen: boolean) => void;
  allExpanded: boolean;
}) {
  const isOpen = useCallback(
    (id: SectionId) => (allExpanded ? true : openSections.has(id)),
    [allExpanded, openSections]
  );

  const handleToggle = useCallback(
    (id: SectionId) => {
      onToggleSection(id, isOpen(id));
    },
    [onToggleSection, isOpen]
  );

  const mealHistoryByDay = log.mealHistoryByDay ?? {};
  const hasByDay = Object.keys(mealHistoryByDay).length > 0;
  const dates = Object.keys(mealHistoryByDay).sort((a, b) => b.localeCompare(a));
  /** Flat rows for table: { dateStr, mealType, items, totalCalories }[] */
  const flatRows: { dateStr: string; mealType: string; items: string[]; totalCalories: number }[] = [];
  for (const dateStr of dates) {
    const dayMeals = mealHistoryByDay[dateStr] ?? {};
    for (const [mealType, { items, totalCalories }] of Object.entries(dayMeals)) {
      if (items.length > 0) {
        flatRows.push({ dateStr, mealType, items, totalCalories });
      }
    }
  }
  const totalEntries = hasByDay
    ? flatRows.reduce((s, r) => s + r.items.length, 0)
    : Object.values(log.mealHistorySent ?? {}).reduce((s, arr) => s + (arr?.length ?? 0), 0);

  const isNewFormat = (log.systemPrompt != null || log.prompt != null) && log.response != null;
  const responseRaw: string = isNewFormat ? (log.response ?? '') : (log.step2Response ?? '');
  const responseIsJson = (() => {
    try {
      JSON.parse(responseRaw);
      return true;
    } catch {
      return false;
    }
  })();

  const totalLatency = log.metadata?.latencyMs ?? (log.metadata?.step1LatencyMs ?? 0) + (log.metadata?.step2LatencyMs ?? 0);
  const usage = log.metadata?.usage ?? {};
  const usageTokens = (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);
  const legacyTokens = usageTokens === 0
    ? (log.metadata?.step1Usage?.prompt_tokens ?? 0) +
      (log.metadata?.step1Usage?.completion_tokens ?? 0) +
      (log.metadata?.step2Usage?.prompt_tokens ?? 0) +
      (log.metadata?.step2Usage?.completion_tokens ?? 0)
    : 0;
  const displayTokens = usageTokens > 0 ? usageTokens : legacyTokens;

  return (
    <div className="flex flex-col items-center">
      {/* Zone 1 — INPUT */}
      <div className="w-full">
        <PipelineZone
          label="Input"
          open={isOpen('input')}
          onToggle={() => handleToggle('input')}
        >
          <div className="space-y-4">
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                User Request
              </p>
              <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
                <CopyButton text={JSON.stringify(log.userRequest, null, 2)} className="absolute right-2 top-2" />
                <div className="max-h-[200px] overflow-auto pr-16">
                  <JsonHighlight raw={JSON.stringify(log.userRequest, null, 2)} />
                </div>
              </div>
            </div>
            {log.userContext && (
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  User Context
                </p>
                <div className="overflow-x-auto rounded border border-[#1e1e1e] bg-black/20">
                  <table className="w-full text-[11px]">
                    <tbody className="text-zinc-400">
                      <tr className="border-b border-[#1e1e1e]/50">
                        <td className="py-2 pl-3 pr-4 text-zinc-500">Height</td>
                        <td className="py-2 pr-3">{log.userContext.height != null ? `${log.userContext.height} cm` : '—'}</td>
                      </tr>
                      <tr className="border-b border-[#1e1e1e]/50">
                        <td className="py-2 pl-3 pr-4 text-zinc-500">Weight</td>
                        <td className="py-2 pr-3">{log.userContext.weight != null ? `${log.userContext.weight} kg` : '—'}</td>
                      </tr>
                      <tr className="border-b border-[#1e1e1e]/50">
                        <td className="py-2 pl-3 pr-4 text-zinc-500">Target weight</td>
                        <td className="py-2 pr-3">{log.userContext.targetWeight != null ? `${log.userContext.targetWeight} kg` : '—'}</td>
                      </tr>
                      <tr className="border-b border-[#1e1e1e]/50">
                        <td className="py-2 pl-3 pr-4 text-zinc-500">Age</td>
                        <td className="py-2 pr-3">{log.userContext.age != null ? `${log.userContext.age} years` : '—'}</td>
                      </tr>
                      <tr className="border-b border-[#1e1e1e]/50">
                        <td className="py-2 pl-3 pr-4 text-zinc-500">Activity level</td>
                        <td className="py-2 pr-3">{log.userContext.activityLevel ?? '—'}</td>
                      </tr>
                      <tr className="border-b border-[#1e1e1e]/50">
                        <td className="py-2 pl-3 pr-4 text-zinc-500">Goal</td>
                        <td className="py-2 pr-3">{log.userContext.goal ? (log.userContext.goal === 'lose' ? 'lose weight' : log.userContext.goal === 'gain' ? 'gain weight' : 'maintain weight') : '—'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Meal History · {totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}
              </p>
              <div className="overflow-x-auto rounded border border-[#1e1e1e] bg-black/20">
                {!hasByDay && totalEntries === 0 ? (
                  <div className="py-6 text-center text-[11px] italic text-zinc-500">
                    none logged
                  </div>
                ) : hasByDay ? (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-[#1e1e1e] text-left text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        <th className="pb-2 pr-4 pt-2 pl-3">Date</th>
                        <th className="pb-2 pr-4 pt-2">Meal type</th>
                        <th className="pb-2 pr-4 pt-2">Items</th>
                        <th className="pb-2 pt-2 pr-3">Calories</th>
                      </tr>
                    </thead>
                    <tbody className="text-zinc-400">
                      {flatRows.map((row, i) => (
                        <tr key={`${row.dateStr}-${row.mealType}-${i}`} className="border-b border-[#1e1e1e]/50">
                          <td className="py-2 pl-3 pr-4 text-zinc-300">{formatDate(row.dateStr)}</td>
                          <td className="py-2 pr-4 font-medium capitalize text-zinc-300">{row.mealType}</td>
                          <td className="py-2 pr-4">{row.items.join(', ')}</td>
                          <td className="py-2 pr-3">
                            {row.totalCalories > 0 ? (
                              <span className="text-zinc-400">{Math.round(row.totalCalories)} kcal</span>
                            ) : (
                              <span className="italic text-zinc-500">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-[#1e1e1e] text-left text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                        <th className="pb-2 pr-4 pt-2 pl-3">Date</th>
                        <th className="pb-2 pr-4 pt-2">Meal type</th>
                        <th className="pb-2 pr-4 pt-2">Items</th>
                        <th className="pb-2 pt-2 pr-3">Calories</th>
                      </tr>
                    </thead>
                    <tbody className="text-zinc-400">
                      {Object.entries(log.mealHistorySent ?? {}).map(([mealType, items]) => (
                        <tr key={mealType} className="border-b border-[#1e1e1e]/50">
                          <td className="py-2 pl-3 pr-4 italic text-zinc-500">—</td>
                          <td className="py-2 pr-4 font-medium capitalize text-zinc-300">{mealType}</td>
                          <td className="py-2 pr-4">{Array.isArray(items) && items.length ? items.join(', ') : <span className="italic text-zinc-500">none</span>}</td>
                          <td className="py-2 pr-3 italic text-zinc-500">—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </PipelineZone>
      </div>

      <PipelineConnector label="fed to AI" />

      {/* Zone 2 — AI Request (single step) */}
      <div className="w-full">
        <PipelineZone
          label="AI Request"
          open={isOpen('step1')}
          onToggle={() => handleToggle('step1')}
          badges={
            <div className="flex items-center gap-2">
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                {displayTokens} tokens
              </span>
              {totalLatency > 0 && (
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  {totalLatency}ms
                </span>
              )}
            </div>
          }
        >
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              System prompt
            </p>
            <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
              <CopyButton text={isNewFormat ? (log.systemPrompt ?? '') : (log.step1Prompt ?? '').split('\n\n')[0] ?? ''} className="absolute right-2 top-2" />
              <pre className="max-h-[180px] overflow-auto whitespace-pre-wrap break-words pr-16 font-mono text-[11px] leading-relaxed text-zinc-400">
                {isNewFormat ? (log.systemPrompt ?? '') : '(Legacy: two-step flow — no separate system prompt)'}
              </pre>
            </div>
          </div>
          <StepDivider />
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              User prompt
            </p>
            <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
              <CopyButton text={isNewFormat ? (log.userPrompt ?? log.prompt ?? '') : (log.step1Prompt ?? '') + '\n\n---\n\n' + (log.step2Prompt ?? '')} className="absolute right-2 top-2" />
              <div className="max-h-[240px] overflow-auto pr-16">
                {isNewFormat
                  ? (() => {
                      const raw = log.userPrompt ?? log.prompt ?? '';
                      try {
                        JSON.parse(raw);
                        return <JsonHighlight raw={raw} />;
                      } catch {
                        return (
                          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-400">
                            {raw}
                          </pre>
                        );
                      }
                    })()
                  : (
                      <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-zinc-400">
                        {(log.step1Prompt ?? '') + '\n\n--- Step 2 ---\n\n' + (log.step2Prompt ?? '')}
                      </pre>
                    )}
              </div>
            </div>
          </div>
          <StepDivider />
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Response
            </p>
            <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
              <Step2ResponseBlock raw={responseRaw} isJson={responseIsJson} />
            </div>
          </div>
        </PipelineZone>
      </div>

      <PipelineConnector label="passed to output" />

      {/* Zone 4 — OUTPUT · METADATA */}
      <div className="w-full">
        <PipelineZone
          label="Output · Metadata"
          open={isOpen('metadata')}
          onToggle={() => handleToggle('metadata')}
        >
          <MetadataBar log={log} totalLatency={totalLatency} />
        </PipelineZone>
      </div>
    </div>
  );
}

export { totalTokens };

/** Generic JSON log view for agents without a dedicated view (insights, workout planner, etc.). */
export function GenericJsonLogView({
  log,
  openSections,
  onToggleSection,
  allExpanded,
}: {
  log: Record<string, unknown>;
  openSections: Set<SectionId>;
  onToggleSection: (id: SectionId, isCurrentlyOpen: boolean) => void;
  allExpanded: boolean;
}) {
  const isOpen = (id: SectionId) => (allExpanded ? true : openSections.has(id));
  const handleToggle = (id: SectionId) => onToggleSection(id, isOpen(id));
  const meta = (log.metadata as Record<string, unknown>) ?? {};
  const usage = (meta.usage as { prompt_tokens?: number; completion_tokens?: number }) ?? {};
  const tokens = (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0);
  const raw = JSON.stringify(log, null, 2);
  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <PipelineZone
          label="Log"
          open={isOpen('input')}
          onToggle={() => handleToggle('input')}
          badges={
            tokens > 0 ? (
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                {tokens} tokens
              </span>
            ) : undefined
          }
        >
          <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
            <CopyButton text={raw} className="absolute right-2 top-2" />
            <pre className="max-h-[400px] overflow-auto whitespace-pre-wrap break-words pr-16 font-mono text-[11px] leading-relaxed text-zinc-400">
              {raw}
            </pre>
          </div>
        </PipelineZone>
      </div>
    </div>
  );
}

/** AI Food Logger debug log shape (single-step, Responses API). */
export interface AILoggerDebugLog {
  userRequest: { text: string; requestedAt: string };
  instructions: string;
  prompt: string;
  response: string;
  metadata: {
    model: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    latencyMs: number;
    timestamp: string;
    status: string;
  };
}

export function totalTokensAILogger(log: AILoggerDebugLog): number {
  const u = log.metadata?.usage ?? {};
  return (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
}

export function AILoggerLogView({
  log,
  openSections,
  onToggleSection,
  allExpanded,
}: {
  log: AILoggerDebugLog;
  openSections: Set<SectionId>;
  onToggleSection: (id: SectionId, isCurrentlyOpen: boolean) => void;
  allExpanded: boolean;
}) {
  const meta = log.metadata ?? {};
  const usage = meta.usage ?? {};
  const isOpen = (id: SectionId) => (allExpanded ? true : openSections.has(id));
  const handleToggle = (id: SectionId) => onToggleSection(id, isOpen(id));

  const responseIsJson = (() => {
    try {
      JSON.parse(log.response);
      return true;
    } catch {
      return false;
    }
  })();

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <PipelineZone label="Input" open={isOpen('input')} onToggle={() => handleToggle('input')}>
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              User Request
            </p>
            <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
              <CopyButton text={log.userRequest.text} className="absolute right-2 top-2" />
              <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap break-words pr-16 font-mono text-[11px] leading-relaxed text-zinc-400">
                {log.userRequest.text}
              </pre>
            </div>
          </div>
        </PipelineZone>
      </div>

      <PipelineConnector label="fed to AI" />

      <div className="w-full">
        <PipelineZone
          label="Step 1 · Nutrition Lookup"
          open={isOpen('step1')}
          onToggle={() => handleToggle('step1')}
          badges={
            <div className="flex items-center gap-2">
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                {(usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0)} tokens
              </span>
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                {meta.latencyMs}ms
              </span>
            </div>
          }
        >
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Instructions
            </p>
            <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
              <CopyButton text={log.instructions} className="absolute right-2 top-2" />
              <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap break-words pr-16 font-mono text-[11px] leading-relaxed text-zinc-400">
                {log.instructions}
              </pre>
            </div>
          </div>
          <StepDivider />
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
              Response
            </p>
            <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
              <Step2ResponseBlock raw={log.response} isJson={responseIsJson} />
            </div>
          </div>
        </PipelineZone>
      </div>

      <PipelineConnector label="passed to output" />

      <div className="w-full">
        <PipelineZone
          label="Output · Metadata"
          open={isOpen('metadata')}
          onToggle={() => handleToggle('metadata')}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
            {(meta as { username?: string }).username && (
              <>
                <div className="flex flex-col">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">User</span>
                  <span className="font-mono text-zinc-300">{(meta as { username?: string }).username}</span>
                </div>
                <div className="h-8 w-px bg-[#1e1e1e]" aria-hidden />
              </>
            )}
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Model</span>
              <span className="font-mono text-zinc-300">{meta.model ?? '—'}</span>
            </div>
            <div className="h-8 w-px bg-[#1e1e1e]" aria-hidden />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Tokens</span>
              <span className="font-mono text-zinc-300">
                {(usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0)} total
              </span>
            </div>
            <div className="h-8 w-px bg-[#1e1e1e]" aria-hidden />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Latency</span>
              <span className="font-mono text-zinc-300">{meta.latencyMs?.toLocaleString()}ms</span>
            </div>
            <div className="h-8 w-px bg-[#1e1e1e]" aria-hidden />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Status</span>
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
                {(meta.status ?? 'success').toUpperCase()}
              </span>
            </div>
            <div className="h-8 w-px bg-[#1e1e1e]" aria-hidden />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Timestamp</span>
              <span className="font-mono text-zinc-300">
                {meta.timestamp
                  ? new Date(meta.timestamp).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                  : '—'}
              </span>
            </div>
          </div>
        </PipelineZone>
      </div>
    </div>
  );
}

export default function DebuggerPanel({ foodLogs }: DebuggerPanelProps) {
  const [foodOpen, setFoodOpen] = useState(true);
  const [mealIdeasOpen, setMealIdeasOpen] = useState(true);
  const [aiLoggerOpen, setAiLoggerOpen] = useState(false);
  const hasMealIdeas = foodLogs?.mealIdeas != null;
  const hasAiLogger = foodLogs?.aiLogger != null;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d0f] p-4 font-mono">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">Debugger</h3>
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setFoodOpen((o) => !o)}
          className="flex w-full items-center gap-2 py-1.5 text-left text-base font-medium text-zinc-300"
        >
          {foodOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          Food
        </button>
        {foodOpen && (
          <div className="ml-3 mt-1 space-y-2 border-l border-white/10 pl-3">
            <div>
              <button
                type="button"
                onClick={() => setMealIdeasOpen((o) => !o)}
                className="flex w-full items-center gap-2 py-1 text-left text-sm text-zinc-400"
              >
                {mealIdeasOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                Meal Ideas
              </button>
              {mealIdeasOpen && (
                <div className="ml-3 mt-1">
                  {hasMealIdeas ? (
                    <MealIdeasLogView
                      log={foodLogs!.mealIdeas!}
                      openSections={new Set(SECTION_IDS)}
                      onToggleSection={(_id, _open) => {}}
                      allExpanded={true}
                    />
                  ) : (
                    <p className="py-2 text-[11px] text-zinc-500">No recent Meal Ideas log.</p>
                  )}
                </div>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => setAiLoggerOpen((o) => !o)}
                className="flex w-full items-center gap-2 py-1 text-left text-sm text-zinc-400"
              >
                {aiLoggerOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                AI Logger
              </button>
              {aiLoggerOpen && (
                <div className="ml-3 mt-1">
                  {hasAiLogger ? (
                    <div className="relative rounded border border-white/10 bg-black/20 p-3">
                      <CopyButton text={JSON.stringify(foodLogs!.aiLogger, null, 2)} />
                      <pre className="mt-2 max-h-[16rem] overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] text-zinc-400">
                        {JSON.stringify(foodLogs!.aiLogger, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <p className="py-2 text-[11px] text-zinc-500">No recent AI Logger log.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback, type ReactNode } from 'react';
import {
  CopyButton,
  JsonHighlight,
  PipelineConnector,
  PipelineZone,
  Step2ResponseBlock,
  StepDivider,
  type SectionId,
} from './DebugPipelineShared';
import { formatDate } from '@/lib/utils';

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

export function totalTokens(log: MealIdeasDebugLog): number {
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

  const items: { label: string; value: ReactNode; oneLine?: boolean; colSpan?: number }[] = [
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
    { label: 'Timestamp', value: formattedTs, oneLine: true, colSpan: 2 },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
      {items.map(({ label, value, oneLine, colSpan }) => (
        <div
          key={label}
          className={`flex min-w-0 flex-col py-2 px-3 text-[11px] border-r border-b border-[#1e1e1e] ${colSpan === 2 ? 'sm:col-span-2' : ''}`}
        >
          <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">{label}</span>
          <span className={`font-mono text-zinc-300 ${oneLine ? 'whitespace-nowrap' : ''}`}>{value}</span>
        </div>
      ))}
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
            <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-3">
              <Step2ResponseBlock raw={responseRaw} isJson={responseIsJson} />
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
          <MetadataBar log={log} totalLatency={totalLatency} />
        </PipelineZone>
      </div>
    </div>
  );
}

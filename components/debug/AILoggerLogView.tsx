'use client';

import {
  CopyButton,
  PipelineConnector,
  PipelineZone,
  Step2ResponseBlock,
  StepDivider,
  type SectionId,
} from './DebugPipelineShared';

/** AI Food Logger debug log shape. Supports single-step (legacy) and two-step pipeline. */
export interface AILoggerDebugLog {
  userRequest: { text: string; requestedAt: string };
  /** Legacy single-step */
  instructions?: string;
  prompt?: string;
  response?: string;
  /** Two-step pipeline */
  step1?: {
    prompt?: string;
    instructions?: string;
    response?: string;
    parsedItems?: { name: string; quantity: number; unit: string }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  step2?: {
    prompt?: string;
    instructions?: string;
    response?: string;
    /** Final items after quantity/unit safeguard (what we actually return) */
    finalItems?: Array<{
      name: string;
      quantity: number;
      unit: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber?: number;
      sugar?: number;
      sodium?: number;
      saturatedFat?: number;
      cholesterol?: number;
    }>;
    total?: { calories: number; protein: number; carbs: number; fat: number; fiber?: number; sugar?: number; sodium?: number; saturatedFat?: number; cholesterol?: number };
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  metadata: {
    model: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    step1Usage?: { prompt_tokens?: number; completion_tokens?: number };
    step2Usage?: { prompt_tokens?: number; completion_tokens?: number };
    latencyMs?: number;
    timestamp: string;
    status: string;
    pipeline?: string;
  };
}

function tokensFromUsage(u: { prompt_tokens?: number; completion_tokens?: number; input_tokens?: number; output_tokens?: number } | undefined): number {
  if (!u) return 0;
  const p = u.prompt_tokens ?? u.input_tokens ?? 0;
  const c = u.completion_tokens ?? u.output_tokens ?? 0;
  return p + c;
}

export function totalTokensAILogger(log: AILoggerDebugLog): number {
  const meta = log.metadata ?? {};
  const total = tokensFromUsage(meta.usage);
  if (total > 0) return total;
  return tokensFromUsage(meta.step1Usage ?? log.step1?.usage) + tokensFromUsage(meta.step2Usage ?? log.step2?.usage);
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
  const isTwoStep = log.step1 != null && log.step2 != null;
  const step1Usage = meta.step1Usage ?? log.step1?.usage ?? {};
  const step2Usage = meta.step2Usage ?? log.step2?.usage ?? {};
  const totalTokens = totalTokensAILogger(log);
  const isOpen = (id: SectionId) => (allExpanded ? true : openSections.has(id));
  const handleToggle = (id: SectionId) => onToggleSection(id, isOpen(id));

  const responseRaw = isTwoStep ? (log.step2?.response ?? '') : (log.response ?? '');
  const responseIsJson = (() => {
    try {
      JSON.parse(responseRaw);
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
              <CopyButton text={log.userRequest?.text ?? ''} className="absolute right-2 top-2" />
              <pre className="max-h-[200px] overflow-auto whitespace-pre-wrap break-words pr-16 font-mono text-[11px] leading-relaxed text-zinc-400">
                {log.userRequest?.text ?? '—'}
              </pre>
            </div>
          </div>
        </PipelineZone>
      </div>

      <PipelineConnector label={isTwoStep ? 'Step 1: Parse' : 'fed to AI'} />

      {isTwoStep ? (
        <>
          <div className="w-full">
            <PipelineZone
              label="Step 1 · Food Parser"
              open={isOpen('step1')}
              onToggle={() => handleToggle('step1')}
              badges={
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                    {tokensFromUsage(step1Usage)} tokens
                  </span>
                </div>
              }
            >
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Prompt
                </p>
                <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
                  <CopyButton text={log.step1?.prompt ?? ''} className="absolute right-2 top-2" />
                  <pre className="max-h-[120px] overflow-auto whitespace-pre-wrap break-words pr-16 font-mono text-[11px] leading-relaxed text-zinc-400">
                    {log.step1?.prompt ?? '—'}
                  </pre>
                </div>
              </div>
              <StepDivider />
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Parsed Items
                </p>
                <div className="rounded border border-[#1e1e1e] bg-black/20 p-3">
                  <Step2ResponseBlock raw={log.step1?.response ?? '[]'} isJson={true} />
                </div>
              </div>
            </PipelineZone>
          </div>

          <PipelineConnector label="Step 2: Nutrition" />

          <div className="w-full">
            <PipelineZone
              label="Step 2 · Nutrition Lookup"
              open={isOpen('step2')}
              onToggle={() => handleToggle('step2')}
              badges={
                <div className="flex items-center gap-2">
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                    {tokensFromUsage(step2Usage)} tokens
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                    {meta.latencyMs?.toLocaleString()}ms
                  </span>
                </div>
              }
            >
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Input (parsed items)
                </p>
                <div className="rounded border border-[#1e1e1e] bg-black/20 p-3">
                  <Step2ResponseBlock raw={log.step2?.prompt ?? '{}'} isJson={true} />
                </div>
              </div>
              <StepDivider />
              <div>
                <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                  Model response (raw)
                </p>
                <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
                  <Step2ResponseBlock raw={responseRaw} isJson={responseIsJson} />
                </div>
              </div>
              {log.step2?.finalItems != null && log.step2.finalItems.length > 0 && (
                <>
                  <StepDivider />
                  <div>
                    <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                      Final output (quantity/unit preserved)
                    </p>
                    <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-3">
                      <Step2ResponseBlock raw={JSON.stringify({ items: log.step2.finalItems, total: log.step2.total ?? null }, null, 2)} isJson={true} />
                      {log.step2.total != null && (
                        <p className="mt-2 text-[10px] text-zinc-500">
                          Total: {log.step2.total.calories} kcal · P {log.step2.total.protein}g · C {log.step2.total.carbs}g · F {log.step2.total.fat}g
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </PipelineZone>
          </div>
        </>
      ) : (
        <div className="w-full">
          <PipelineZone
            label="Step 1 · Nutrition Lookup"
            open={isOpen('step1')}
            onToggle={() => handleToggle('step1')}
            badges={
              <div className="flex items-center gap-2">
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  {totalTokens} tokens
                </span>
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  {meta.latencyMs?.toLocaleString()}ms
                </span>
              </div>
            }
          >
            <div>
              <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">
                Instructions
              </p>
              <div className="relative rounded border border-[#1e1e1e] bg-black/20 p-3">
                <CopyButton text={log.instructions ?? ''} className="absolute right-2 top-2" />
                <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap break-words pr-16 font-mono text-[11px] leading-relaxed text-zinc-400">
                  {log.instructions ?? '—'}
                </pre>
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
      )}

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
                {totalTokens.toLocaleString()} total
              </span>
            </div>
            <div className="h-8 w-px bg-[#1e1e1e]" aria-hidden />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Latency</span>
              <span className="font-mono text-zinc-300">{meta.latencyMs != null ? `${meta.latencyMs.toLocaleString()}ms` : '—'}</span>
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

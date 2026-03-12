'use client';

import {
  PipelineConnector,
  PipelineZone,
  Step2ResponseBlock,
  StepDivider,
  type SectionId,
} from './DebugPipelineShared';

type UsageShape = {
  prompt_tokens?: number;
  completion_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
};

function tokensFromUsage(usage: UsageShape | undefined): number {
  if (!usage) return 0;
  return (usage.prompt_tokens ?? usage.input_tokens ?? 0) + (usage.completion_tokens ?? usage.output_tokens ?? 0);
}

type InsightsDebugLog = {
  userRequest?: {
    period?: string;
    startDate?: string;
    endDate?: string;
    requestedAt?: string;
  };
  systemPrompt?: string;
  userPrompt?: string;
  response?: string;
  parsedResult?: unknown;
  metadata?: {
    model?: string;
    usage?: UsageShape;
    latencyMs?: number;
    timestamp?: string;
    status?: string;
  };
};

export default function InsightsLogView({
  log,
  openSections,
  onToggleSection,
  allExpanded,
}: {
  log: InsightsDebugLog;
  openSections: Set<SectionId>;
  onToggleSection: (id: SectionId, isCurrentlyOpen: boolean) => void;
  allExpanded: boolean;
}) {
  const meta = log.metadata ?? {};
  const usage = meta.usage ?? {};
  const totalTokens = tokensFromUsage(usage);
  const rawResponse = log.response ?? '';
  const parsedJson = JSON.stringify(log.parsedResult ?? {}, null, 2);
  const requestJson = JSON.stringify(log.userRequest ?? {}, null, 2);

  const isOpen = (id: SectionId) => (allExpanded ? true : openSections.has(id));
  const handleToggle = (id: SectionId) => onToggleSection(id, isOpen(id));

  return (
    <div className="flex flex-col items-center">
      <div className="w-full">
        <PipelineZone
          label="Input"
          open={isOpen('input')}
          onToggle={() => handleToggle('input')}
        >
          <Step2ResponseBlock raw={requestJson} isJson={true} />
        </PipelineZone>
      </div>

      <PipelineConnector label="fed to AI" />

      <div className="w-full">
        <PipelineZone
          label="Step 1 · Prompt Construction"
          open={isOpen('step1')}
          onToggle={() => handleToggle('step1')}
          badges={
            <div className="flex items-center gap-2">
              <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                {totalTokens.toLocaleString()} tokens
              </span>
            </div>
          }
        >
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">System Prompt</p>
            <div className="rounded border border-[#1e1e1e] bg-black/20 p-3">
              <Step2ResponseBlock raw={log.systemPrompt ?? '—'} isJson={false} />
            </div>
          </div>
          <StepDivider />
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">User Prompt</p>
            <div className="rounded border border-[#1e1e1e] bg-black/20 p-3">
              <Step2ResponseBlock raw={log.userPrompt ?? '—'} isJson={false} />
            </div>
          </div>
        </PipelineZone>
      </div>

      <PipelineConnector label="model output" />

      <div className="w-full">
        <PipelineZone
          label="Step 2 · Response"
          open={isOpen('step2')}
          onToggle={() => handleToggle('step2')}
        >
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">Raw Response</p>
            <div className="rounded border border-[#1e1e1e] bg-black/20 p-3">
              <Step2ResponseBlock raw={rawResponse || '—'} isJson={true} />
            </div>
          </div>
          <StepDivider />
          <div>
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-widest text-zinc-500">Parsed Insights</p>
            <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-3">
              <Step2ResponseBlock raw={parsedJson} isJson={true} />
            </div>
          </div>
        </PipelineZone>
      </div>

      <PipelineConnector label="saved to logs" />

      <div className="w-full">
        <PipelineZone
          label="Output · Metadata"
          open={isOpen('metadata')}
          onToggle={() => handleToggle('metadata')}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px]">
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Model</span>
              <span className="font-mono text-zinc-300">{meta.model ?? '—'}</span>
            </div>
            <div className="h-8 w-px bg-[#1e1e1e]" aria-hidden />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Latency</span>
              <span className="font-mono text-zinc-300">{meta.latencyMs != null ? `${meta.latencyMs}ms` : '—'}</span>
            </div>
            <div className="h-8 w-px bg-[#1e1e1e]" aria-hidden />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Status</span>
              <span className="font-mono text-zinc-300">{(meta.status ?? 'success').toUpperCase()}</span>
            </div>
            <div className="h-8 w-px bg-[#1e1e1e]" aria-hidden />
            <div className="flex flex-col">
              <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Timestamp</span>
              <span className="font-mono text-zinc-300">{meta.timestamp ?? '—'}</span>
            </div>
          </div>
        </PipelineZone>
      </div>
    </div>
  );
}

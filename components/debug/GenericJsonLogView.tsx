'use client';

import { CopyButton, PipelineZone, type SectionId } from './DebugPipelineShared';

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

'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { MealIdeasLogView, type MealIdeasDebugLog } from './MealIdeasLogView';
import { AILoggerLogView, type AILoggerDebugLog } from './AILoggerLogView';
import { SECTION_IDS } from './DebugPipelineShared';

// Re-exports for consumers that import from DebuggerPanel
export { MealIdeasLogView, totalTokens, type MealIdeasDebugLog } from './MealIdeasLogView';
export { AILoggerLogView, totalTokensAILogger, type AILoggerDebugLog } from './AILoggerLogView';
export { GenericJsonLogView } from './GenericJsonLogView';
export { SECTION_IDS } from './DebugPipelineShared';

export interface DebuggerPanelFoodLogs {
  mealIdeas?: MealIdeasDebugLog | null;
  aiLogger?: unknown | null;
}

interface DebuggerPanelProps {
  foodLogs?: DebuggerPanelFoodLogs | null;
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
                    <div className="rounded border border-white/10 bg-black/20 p-3">
                      <AILoggerLogView
                        log={foodLogs!.aiLogger as AILoggerDebugLog}
                        openSections={new Set(SECTION_IDS)}
                        onToggleSection={() => {}}
                        allExpanded={true}
                      />
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

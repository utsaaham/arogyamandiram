'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  MealIdeasLogView,
  AILoggerLogView,
  GenericJsonLogView,
  totalTokens,
  totalTokensAILogger,
  SECTION_IDS,
  type MealIdeasDebugLog,
  type AILoggerDebugLog,
} from '@/components/debug/DebuggerPanel';
import { getPageLabel, getAgentLabel, getAgentDescription } from '@/lib/debugLogsConfig';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

type SectionId = (typeof SECTION_IDS)[number];

/** Static tree: page -> agents */
const DEBUG_TREE: { page: string; agents: string[] }[] = [
  { page: 'food', agents: ['meal-ideas', 'ai-logger'] },
  { page: 'insights', agents: ['yesterday', 'weekly', 'monthly', 'yearly'] },
  { page: 'workout', agents: ['ai-logger', 'workout-planner'] },
];

function getLogTimestamp(log: Record<string, unknown>): string {
  const meta = log.metadata as { timestamp?: string } | undefined;
  const req = log.userRequest as { requestedAt?: string } | undefined;
  return req?.requestedAt ?? meta?.timestamp ?? '';
}

function requestTypeLabel(log: Record<string, unknown>, page: string, agent: string): string {
  if (page === 'food' && agent === 'meal-ideas') {
    const types = (log.userRequest as { selectedMealTypes?: string[] })?.selectedMealTypes;
    if (!types?.length) return '—';
    return types.join(', ');
  }
  if (page === 'food' && agent === 'ai-logger') {
    const text = (log.userRequest as { text?: string })?.text ?? '';
    return text.length > 40 ? `${text.slice(0, 40)}…` : text || '—';
  }
  if (page === 'workout' && agent === 'ai-logger') {
    const text = (log.userRequest as { text?: string })?.text ?? '';
    return text.length > 40 ? `${text.slice(0, 40)}…` : text || '—';
  }
  return getAgentLabel(agent);
}

function getLogTokens(log: Record<string, unknown>, page: string, agent: string): number {
  if (page === 'food' && agent === 'meal-ideas') {
    return totalTokens(log as unknown as MealIdeasDebugLog);
  }
  if ((page === 'food' || page === 'workout') && agent === 'ai-logger') {
    return totalTokensAILogger(log as unknown as AILoggerDebugLog);
  }
  const meta = log.metadata as { usage?: { prompt_tokens?: number; completion_tokens?: number } } | undefined;
  const u = meta?.usage ?? {};
  return (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
}

function groupLogsByDay(logs: Record<string, unknown>[]): Map<string, Record<string, unknown>[]> {
  const map = new Map<string, Record<string, unknown>[]>();
  for (const log of logs) {
    const iso = getLogTimestamp(log);
    const dateStr = iso.slice(0, 10);
    if (!dateStr) continue;
    const list = map.get(dateStr) ?? [];
    list.push(log);
    map.set(dateStr, list);
  }
  return map;
}

function formatRequestTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function formatLastRun(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function LogViewRenderer({
  log,
  page,
  agent,
  openSections,
  onToggleSection,
  allExpanded,
}: {
  log: Record<string, unknown>;
  page: string;
  agent: string;
  openSections: Set<SectionId>;
  onToggleSection: (id: SectionId, isCurrentlyOpen: boolean) => void;
  allExpanded: boolean;
}) {
  if (page === 'food' && agent === 'meal-ideas') {
    return (
      <MealIdeasLogView
        log={log as unknown as MealIdeasDebugLog}
        openSections={openSections}
        onToggleSection={onToggleSection}
        allExpanded={allExpanded}
      />
    );
  }
  if ((page === 'food' || page === 'workout') && agent === 'ai-logger') {
    return (
      <AILoggerLogView
        log={log as unknown as AILoggerDebugLog}
        openSections={openSections}
        onToggleSection={onToggleSection}
        allExpanded={allExpanded}
      />
    );
  }
  return (
    <GenericJsonLogView
      log={log}
      openSections={openSections}
      onToggleSection={onToggleSection}
      allExpanded={allExpanded}
    />
  );
}

export default function DebugPage() {
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set(['food']));
  const [selectedAgent, setSelectedAgent] = useState<{ page: string; agent: string } | null>(null);
  const [agentLogs, setAgentLogs] = useState<Record<string, unknown>[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLogKey, setSelectedLogKey] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(SECTION_IDS));
  const [allExpanded, setAllExpanded] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const fetchLogsForAgent = useCallback(async (page: string, agent: string) => {
    if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') return;
    setLogsLoading(true);
    try {
      const res = await fetch(
        `/api/debug-logs?page=${encodeURIComponent(page)}&agent=${encodeURIComponent(agent)}`,
        { credentials: 'include' }
      );
      const data = await res.json().catch(() => ({}));
      const list = Array.isArray(data?.logs) ? data.logs : [];
      setAgentLogs(list);
    } catch {
      setAgentLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAgent) {
      fetchLogsForAgent(selectedAgent.page, selectedAgent.agent);
      setSelectedLogKey(null);
      setExpandedDates(new Set());
    } else {
      setAgentLogs([]);
      setSelectedLogKey(null);
    }
  }, [selectedAgent, fetchLogsForAgent]);

  const toggleDate = useCallback((dateStr: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  }, []);

  const logsByDay = useMemo(() => groupLogsByDay(agentLogs), [agentLogs]);
  const sortedDays = useMemo(
    () => Array.from(logsByDay.keys()).sort((a, b) => (b > a ? 1 : -1)),
    [logsByDay]
  );

  const sortedDaysKey = sortedDays.join(',');
  const sortedDaysRef = useRef<string[]>([]);
  sortedDaysRef.current = sortedDays;
  useEffect(() => {
    const days = sortedDaysRef.current;
    if (days.length > 0) {
      setExpandedDates(new Set(days));
    }
  }, [sortedDaysKey]);

  const getLogKey = useCallback((dateStr: string, index: number, log: Record<string, unknown>) => {
    const iso = getLogTimestamp(log);
    return `${dateStr}-${index}-${iso}`;
  }, []);

  const selectedLog = useMemo(() => {
    if (!selectedLogKey || !selectedAgent) return null;
    for (const dateStr of sortedDays) {
      const dayLogs = logsByDay.get(dateStr) ?? [];
      for (let i = 0; i < dayLogs.length; i++) {
        if (getLogKey(dateStr, i, dayLogs[i]) === selectedLogKey) return dayLogs[i];
      }
    }
    return null;
  }, [selectedLogKey, selectedAgent, sortedDays, logsByDay, getLogKey]);

  const toggleSection = useCallback((id: SectionId, isCurrentlyOpen: boolean) => {
    setAllExpanded(false);
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (isCurrentlyOpen) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const togglePage = useCallback((page: string) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(page)) next.delete(page);
      else next.add(page);
      return next;
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'c' || e.key === 'C') {
        setAllExpanded(false);
        setOpenSections(new Set());
      } else if (e.key === 'e' || e.key === 'E') {
        setAllExpanded(true);
        setOpenSections(new Set(SECTION_IDS));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isDebugMode = process.env.NEXT_PUBLIC_DEBUG_MODE === 'true';

  if (!isDebugMode) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-6 text-center">
        <p className="text-sm text-zinc-500">
          Debug panel is only available when NEXT_PUBLIC_DEBUG_MODE is true.
        </p>
      </div>
    );
  }

  const selectedPageLabel = selectedAgent ? getPageLabel(selectedAgent.page) : '';
  const selectedAgentLabel = selectedAgent ? getAgentLabel(selectedAgent.agent) : '';
  const lastRun =
    agentLogs.length > 0 ? getLogTimestamp(agentLogs[0]) : '';

  return (
    <div className="flex h-[calc(100vh-8rem)] max-h-[calc(100vh-8rem)] flex-col overflow-hidden bg-[#0a0a0a]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#1e1e1e] px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            AI Request Inspector
          </h1>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Logs stored in .debug-logs/
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">
            <kbd className="rounded border border-[#1e1e1e] bg-white/5 px-1.5 py-0.5 font-mono">C</kbd> collapse ·{' '}
            <kbd className="rounded border border-[#1e1e1e] bg-white/5 px-1.5 py-0.5 font-mono">E</kbd> expand
          </p>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[11rem_11rem_1fr] gap-px bg-[#1e1e1e]">
        {/* Bar 1 — Pages */}
        <aside
          className="flex flex-col overflow-hidden rounded-l-lg border border-[#1e1e1e] border-r-0 bg-[#0a0a0a]"
          aria-label="Pages"
        >
          <div className="shrink-0 border-b border-[#1e1e1e] px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Pages using AI
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-0.5 px-2 pb-4">
              {DEBUG_TREE.map((t) => {
                const isPageOpen = expandedPages.has(t.page);
                return (
                  <div key={t.page}>
                    <button
                      type="button"
                      onClick={() => togglePage(t.page)}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium text-zinc-300 hover:bg-white/[0.04]"
                    >
                      {isPageOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                      )}
                      {getPageLabel(t.page)}
                      <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
                        {t.agents.length}
                      </span>
                    </button>
                    {isPageOpen && (
                      <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-[#1e1e1e] pl-2">
                        {t.agents.map((ag) => {
                          const isSelected =
                            selectedAgent?.page === t.page && selectedAgent?.agent === ag;
                          return (
                            <li key={ag}>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedAgent(isSelected ? null : { page: t.page, agent: ag })
                                }
                                className={cn(
                                  'flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                                  isSelected
                                    ? 'bg-white/10 text-zinc-100'
                                    : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300'
                                )}
                              >
                                <span className="font-medium">• {getAgentLabel(ag)}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Bar 2 + 3: agent header, log list, log view */}
        <div className="col-span-2 flex min-h-0 flex-col overflow-hidden rounded-r-lg border border-[#1e1e1e] border-l-0 bg-[#0a0a0a]">
          {selectedAgent && (
            <div className="shrink-0 border-b border-[#1e1e1e] bg-white/[0.02] px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-zinc-300">{selectedPageLabel}</span>
                <span className="text-zinc-600">›</span>
                <span className="text-sm font-semibold text-zinc-100">{selectedAgentLabel}</span>
                {agentLogs.length > 0 && (
                  <>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
                      {agentLogs.length} total logs
                    </span>
                    {lastRun && (
                      <span className="text-[10px] text-zinc-500">
                        last run: {formatLastRun(lastRun)}
                      </span>
                    )}
                  </>
                )}
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                {getAgentDescription(selectedAgent.page, selectedAgent.agent)}
              </p>
            </div>
          )}

          {!selectedAgent ? (
            <div className="flex flex-1 flex-col items-center justify-center border border-dashed border-[#1e1e1e] bg-white/[0.02] text-center">
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Select an agent
              </p>
              <p className="mt-1 max-w-xs text-[11px] text-zinc-600">
                Choose a page and agent from the left to view request logs.
              </p>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-[11rem_1fr] gap-px bg-[#1e1e1e]">
              {/* Bar 2 — Logs by date (same color as Bar 1) */}
              <div className="flex flex-col overflow-hidden border border-[#1e1e1e] border-r-0 bg-[#0a0a0a]">
                <div className="shrink-0 border-b border-[#1e1e1e] px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                    Logs by date
                  </span>
                </div>
                <div
                  className={cn(
                    'min-h-0 flex-1 overflow-y-auto',
                    '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                  )}
                >
                  {logsLoading ? (
                    <div className="px-3 py-6 text-center text-[11px] text-zinc-500">Loading…</div>
                  ) : sortedDays.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[11px] text-zinc-500">
                      {`No logs yet · Run ${selectedAgentLabel} to generate logs`}
                    </div>
                  ) : (
                    <div className="space-y-2 px-2 pb-4">
                      {sortedDays.map((dateStr) => {
                        const dayLogs = logsByDay.get(dateStr) ?? [];
                        const isDateOpen = expandedDates.has(dateStr);
                        return (
                          <div key={dateStr} className="space-y-1">
                            <button
                              type="button"
                              onClick={() => toggleDate(dateStr)}
                              className="sticky top-0 z-10 flex w-full items-center justify-between gap-2 border-b border-[#1e1e1e] bg-[#0a0a0a] py-1.5 px-1 text-left hover:bg-white/[0.04]"
                            >
                              {isDateOpen ? (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                              )}
                              <span className="text-sm font-medium text-zinc-400">
                                {formatDate(dateStr)}
                              </span>
                              <span className="ml-auto shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">
                                {dayLogs.length}
                              </span>
                            </button>
                            {isDateOpen && (
                            <ul className="space-y-0.5">
                              {dayLogs.map((log, i) => {
                                const key = getLogKey(dateStr, i, log);
                                const isSelected = selectedLogKey === key;
                                const iso = getLogTimestamp(log);
                                const tokens = getLogTokens(log, selectedAgent.page, selectedAgent.agent);
                                return (
                                  <li key={key}>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedLogKey(key)}
                                      className={cn(
                                        'flex w-full flex-col items-start gap-1 rounded-md px-2.5 py-2 text-left transition-colors',
                                        isSelected
                                          ? 'bg-white/10 text-zinc-100'
                                          : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300'
                                      )}
                                    >
                                      <span className="flex w-full items-center justify-between gap-2">
                                        <span className="font-mono text-xs">
                                          {formatRequestTime(iso)}
                                        </span>
                                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-400">
                                          Success
                                        </span>
                                      </span>
                                      <span className="w-full truncate text-[11px] text-zinc-500">
                                        {requestTypeLabel(log, selectedAgent.page, selectedAgent.agent)}
                                      </span>
                                      <span className="font-mono text-[10px] text-zinc-600">
                                        {tokens} tokens
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bar 3 — Log view */}
              <main className="flex min-w-0 flex-1 flex-col overflow-hidden border border-[#1e1e1e] border-l-0 bg-[#0a0a0a]">
                <div
                  className={cn(
                    'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4',
                    '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
                  )}
                >
                  {selectedLog && selectedAgent ? (
                    <LogViewRenderer
                      log={selectedLog}
                      page={selectedAgent.page}
                      agent={selectedAgent.agent}
                      openSections={openSections}
                      onToggleSection={toggleSection}
                      allExpanded={allExpanded}
                    />
                  ) : (
                    <div className="flex min-h-[24rem] flex-col items-center justify-center text-center">
                      <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                        Select a log
                      </p>
                      <p className="mt-1 max-w-xs text-[11px] text-zinc-600">
                        Choose an entry from the list to inspect the pipeline.
                      </p>
                    </div>
                  )}
                </div>
              </main>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  MealIdeasLogView,
  AILoggerLogView,
  totalTokens,
  totalTokensAILogger,
  SECTION_IDS,
  type MealIdeasDebugLog,
  type AILoggerDebugLog,
} from '@/components/debug/DebuggerPanel';
import { getAgentDescription } from '@/lib/debugLogsConfig';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

type SectionId = (typeof SECTION_IDS)[number];

type TreePage = { page: string; pageLabel: string; agents: { agent: string; agentLabel: string; count: number; lastActive: string }[] };
type Tree = TreePage[];

type DebugLog = MealIdeasDebugLog | AILoggerDebugLog;

function isMealIdeasLog(log: DebugLog): log is MealIdeasDebugLog {
  return 'step1Prompt' in log;
}

function getLogTimestamp(log: DebugLog): string {
  return log.userRequest?.requestedAt ?? (log as { metadata?: { timestamp?: string } }).metadata?.timestamp ?? '';
}

/** Group logs by calendar day (YYYY-MM-DD). */
function groupLogsByDay(logs: DebugLog[]): Map<string, DebugLog[]> {
  const map = new Map<string, DebugLog[]>();
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

function requestTypeLabel(log: DebugLog): string {
  if (isMealIdeasLog(log)) {
    const types = log.userRequest?.selectedMealTypes;
    if (!types?.length) return '—';
    return types.join(', ');
  }
  const text = (log as AILoggerDebugLog).userRequest?.text ?? '';
  return text.length > 40 ? `${text.slice(0, 40)}…` : text || '—';
}

function getLogTokens(log: DebugLog): number {
  return isMealIdeasLog(log) ? totalTokens(log) : totalTokensAILogger(log as AILoggerDebugLog);
}

export default function DebugPage() {
  const [tree, setTree] = useState<Tree>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set(['food']));
  const [selectedAgent, setSelectedAgent] = useState<{ page: string; agent: string } | null>(null);
  const [agentLogs, setAgentLogs] = useState<DebugLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLogKey, setSelectedLogKey] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(SECTION_IDS));
  const [allExpanded, setAllExpanded] = useState(true);

  const fetchTree = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') return;
    setTreeLoading(true);
    try {
      const res = await fetch('/api/debug-logs', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      setTree(Array.isArray(data?.tree) ? data.tree : []);
    } catch {
      setTree([]);
    } finally {
      setTreeLoading(false);
    }
  }, []);

  const fetchLogsForAgent = useCallback(async (page: string, agent: string) => {
    if (process.env.NEXT_PUBLIC_DEBUG_MODE !== 'true') return;
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/debug-logs?page=${encodeURIComponent(page)}&agent=${encodeURIComponent(agent)}`, {
        credentials: 'include',
      });
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
    fetchTree();
  }, [fetchTree]);

  useEffect(() => {
    if (selectedAgent) {
      fetchLogsForAgent(selectedAgent.page, selectedAgent.agent);
      setSelectedLogKey(null);
    } else {
      setAgentLogs([]);
      setSelectedLogKey(null);
    }
  }, [selectedAgent, fetchLogsForAgent]);

  const logsByDay = useMemo(() => groupLogsByDay(agentLogs), [agentLogs]);
  const sortedDays = useMemo(
    () => Array.from(logsByDay.keys()).sort((a, b) => (b > a ? 1 : -1)),
    [logsByDay]
  );

  const getLogKey = useCallback((dateStr: string, index: number, log: DebugLog) => {
    const iso = getLogTimestamp(log);
    return `${dateStr}-${index}-${iso}`;
  }, []);

  const selectedLog = useMemo(() => {
    if (!selectedLogKey) return null;
    for (const dateStr of sortedDays) {
      const dayLogs = logsByDay.get(dateStr) ?? [];
      for (let i = 0; i < dayLogs.length; i++) {
        if (getLogKey(dateStr, i, dayLogs[i]) === selectedLogKey) return dayLogs[i];
      }
    }
    return null;
  }, [selectedLogKey, sortedDays, logsByDay, getLogKey]);

  const toggleSection = useCallback((id: SectionId, isCurrentlyOpen: boolean) => {
    setAllExpanded(false);
    if (isCurrentlyOpen) {
      setOpenSections(new Set(SECTION_IDS.filter((x) => x !== id)));
    } else {
      setOpenSections((prev) => new Set(Array.from(prev).concat(id)));
    }
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

  const selectedPageLabel = selectedAgent ? tree.find((t) => t.page === selectedAgent.page)?.pageLabel ?? selectedAgent.page : '';
  const selectedAgentLabel = selectedAgent
    ? tree.find((t) => t.page === selectedAgent.page)?.agents.find((a) => a.agent === selectedAgent.agent)?.agentLabel ?? selectedAgent.agent
    : '';
  const selectedAgentMeta = selectedAgent
    ? tree.find((t) => t.page === selectedAgent.page)?.agents.find((a) => a.agent === selectedAgent.agent)
    : null;
  const lastRun = agentLogs.length > 0
    ? (agentLogs[0].metadata?.timestamp ?? agentLogs[0].userRequest?.requestedAt ?? '')
    : '';

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col bg-[#0a0a0a]">
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
          <button
            type="button"
            onClick={fetchTree}
            disabled={treeLoading}
            className="rounded border border-[#1e1e1e] bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-400 hover:bg-white/10 hover:text-zinc-300 disabled:opacity-50"
          >
            {treeLoading ? 'Loading…' : 'Refresh'}
          </button>
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">
            <kbd className="rounded border border-[#1e1e1e] bg-white/5 px-1.5 py-0.5 font-mono">C</kbd> collapse ·{' '}
            <kbd className="rounded border border-[#1e1e1e] bg-white/5 px-1.5 py-0.5 font-mono">E</kbd> expand
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left panel — Pages / Agents tree */}
        <aside
          className="flex w-72 shrink-0 flex-col border-r border-[#1e1e1e] bg-[#0a0a0a]"
          aria-label="Pages and agents"
        >
          <div className="shrink-0 px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Pages using AI
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {treeLoading ? (
              <div className="px-3 py-6 text-center text-[11px] text-zinc-500">Loading…</div>
            ) : tree.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-zinc-500">
                No log sources yet. Run an AI feature (e.g. Meal Ideas) to create logs.
              </div>
            ) : (
              <div className="space-y-0.5 px-2 pb-4">
                {tree.map((t) => {
                  const isPageOpen = expandedPages.has(t.page);
                  const agentCount = t.agents.length;
                  return (
                    <div key={t.page}>
                      <button
                        type="button"
                        onClick={() => togglePage(t.page)}
                        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[11px] font-medium text-zinc-300 hover:bg-white/[0.04]"
                      >
                        {isPageOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        )}
                        {t.pageLabel}
                        <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-zinc-500">
                          {agentCount}
                        </span>
                      </button>
                      {isPageOpen && (
                        <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-[#1e1e1e] pl-2">
                          {t.agents.map((ag) => {
                            const isSelected =
                              selectedAgent?.page === t.page && selectedAgent?.agent === ag.agent;
                            const lastActiveLabel = ag.lastActive ? formatLastRun(ag.lastActive) : '—';
                            return (
                              <li key={ag.agent}>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedAgent(
                                      isSelected ? null : { page: t.page, agent: ag.agent }
                                    )
                                  }
                                  className={cn(
                                    'flex w-full flex-col items-start gap-0.5 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors',
                                    isSelected
                                      ? 'bg-white/10 text-zinc-100'
                                      : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-300'
                                  )}
                                >
                                  <span className="font-medium">• {ag.agentLabel}</span>
                                  <span className="text-[10px] text-zinc-500">
                                    {ag.count} logs · last {lastActiveLabel !== '—' ? lastActiveLabel : 'never'}
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
        </aside>

        {/* Right: agent header (when selected) + log list or pipeline */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {selectedAgent && (
            <div className="shrink-0 border-b border-[#1e1e1e] bg-white/[0.02] px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-zinc-300">{selectedPageLabel}</span>
                <span className="text-zinc-600">›</span>
                <span className="text-sm font-semibold text-zinc-100">{selectedAgentLabel}</span>
                {selectedAgentMeta && (
                  <>
                    <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-zinc-400">
                      {selectedAgentMeta.count} total logs
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
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-[#1e1e1e] bg-white/[0.02] text-center">
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Select an agent
              </p>
              <p className="mt-1 max-w-xs text-[11px] text-zinc-600">
                Choose a page and agent from the left to view request logs and the pipeline.
              </p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              {/* Log list for this agent */}
              <div className="flex w-64 shrink-0 flex-col border-r border-[#1e1e1e]">
                <div className="shrink-0 px-3 py-2">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
                    Logs by date
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {logsLoading ? (
                    <div className="px-3 py-6 text-center text-[11px] text-zinc-500">
                      Loading logs…
                    </div>
                  ) : sortedDays.length === 0 ? (
                    <div className="px-3 py-6 text-center text-[11px] text-zinc-500">
                      {`No logs yet · Run the ${selectedAgentLabel} feature to generate logs`}
                    </div>
                  ) : (
                    <div className="space-y-4 px-2 pb-4">
                      {sortedDays.map((dateStr) => {
                        const dayLogs = logsByDay.get(dateStr) ?? [];
                        return (
                          <div key={dateStr} className="space-y-1">
                            <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[#1e1e1e] bg-[#0a0a0a] py-1.5 px-1">
                              <span className="text-[11px] font-medium text-zinc-400">
                                {formatDate(dateStr)}
                              </span>
                              <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">
                                {dayLogs.length}
                              </span>
                            </div>
                            <ul className="space-y-0.5">
                              {dayLogs.map((log, i) => {
                                const key = getLogKey(dateStr, i, log);
                                const isSelected = selectedLogKey === key;
                                const iso = getLogTimestamp(log);
                                const tokens = getLogTokens(log);
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
                                        <span className="font-mono text-[11px]">
                                          {formatRequestTime(iso)}
                                        </span>
                                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-emerald-400">
                                          Success
                                        </span>
                                      </span>
                                      <span className="w-full truncate text-[11px] text-zinc-500">
                                        {requestTypeLabel(log)}
                                      </span>
                                      <span className="font-mono text-[10px] text-zinc-600">
                                        {tokens} tokens
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <main className="min-w-0 flex-1 overflow-auto p-4">
                {selectedLog ? (
                  selectedAgent.agent === 'ai-logger' ? (
                    <AILoggerLogView
                      log={selectedLog as AILoggerDebugLog}
                      openSections={openSections}
                      onToggleSection={toggleSection}
                      allExpanded={allExpanded}
                    />
                  ) : (
                    <MealIdeasLogView
                      log={selectedLog as MealIdeasDebugLog}
                      openSections={openSections}
                      onToggleSection={toggleSection}
                      allExpanded={allExpanded}
                    />
                  )
                ) : (
                  <div className="flex h-full min-h-[24rem] flex-col items-center justify-center rounded-lg border border-dashed border-[#1e1e1e] bg-white/[0.02] text-center">
                    <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                      Select a log
                    </p>
                    <p className="mt-1 max-w-xs text-[11px] text-zinc-600">
                      Choose an entry from the list to inspect the full pipeline.
                    </p>
                  </div>
                )}
              </main>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

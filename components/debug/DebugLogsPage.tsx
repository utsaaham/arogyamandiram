'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { SECTION_IDS } from '@/components/debug/DebuggerPanel';
import { getAgentDescription } from '@/lib/debugLogsConfig';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';

type SectionId = (typeof SECTION_IDS)[number];

export interface DebugLogsPageProps<TLog> {
  page: string;
  agent: string;
  pageLabel: string;
  agentLabel: string;
  getLogTimestamp: (log: TLog) => string;
  requestTypeLabel: (log: TLog) => string;
  getLogTokens: (log: TLog) => number;
  LogView: React.ComponentType<{
    log: TLog;
    openSections: Set<SectionId>;
    onToggleSection: (id: SectionId, isCurrentlyOpen: boolean) => void;
    allExpanded: boolean;
  }>;
}

function groupLogsByDay<T>(logs: T[], getTimestamp: (log: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const log of logs) {
    const iso = getTimestamp(log);
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

export default function DebugLogsPage<TLog>({
  page,
  agent,
  pageLabel,
  agentLabel,
  getLogTimestamp,
  requestTypeLabel,
  getLogTokens,
  LogView,
}: DebugLogsPageProps<TLog>) {
  const [agentLogs, setAgentLogs] = useState<TLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [selectedLogKey, setSelectedLogKey] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Set<SectionId>>(new Set(SECTION_IDS));
  const [allExpanded, setAllExpanded] = useState(true);

  const fetchLogs = useCallback(async () => {
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
  }, [page, agent]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const logsByDay = useMemo(
    () => groupLogsByDay(agentLogs, getLogTimestamp),
    [agentLogs, getLogTimestamp]
  );
  const sortedDays = useMemo(
    () => Array.from(logsByDay.keys()).sort((a, b) => (b > a ? 1 : -1)),
    [logsByDay]
  );

  const getLogKey = useCallback(
    (dateStr: string, index: number, log: TLog) => {
      const iso = getLogTimestamp(log);
      return `${dateStr}-${index}-${iso}`;
    },
    [getLogTimestamp]
  );

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
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (isCurrentlyOpen) next.delete(id);
      else next.add(id);
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

  const lastRun =
    agentLogs.length > 0
      ? getLogTimestamp(agentLogs[0])
      : '';

  return (
    <div className="flex h-full min-h-[calc(100vh-8rem)] flex-col bg-[#0a0a0a]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#1e1e1e] px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
            {pageLabel} › {agentLabel}
          </h1>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {getAgentDescription(page, agent)} · Logs in .debug-logs/{page}/{agent}/
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="text-[10px] text-zinc-500">
              last run: {formatLastRun(lastRun)}
            </span>
          )}
          <p className="text-[10px] uppercase tracking-widest text-zinc-600">
            <kbd className="rounded border border-[#1e1e1e] bg-white/5 px-1.5 py-0.5 font-mono">C</kbd> collapse ·{' '}
            <kbd className="rounded border border-[#1e1e1e] bg-white/5 px-1.5 py-0.5 font-mono">E</kbd> expand
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-40 shrink-0 flex-col border-r border-[#1e1e1e] bg-[#0a0a0a]">
          <div className="shrink-0 px-3 py-2">
            <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-600">
              Logs by date
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {logsLoading ? (
              <div className="px-3 py-6 text-center text-[11px] text-zinc-500">Loading…</div>
            ) : sortedDays.length === 0 ? (
              <div className="px-3 py-6 text-center text-[11px] text-zinc-500">
                {`No logs yet · Run ${agentLabel} to generate logs`}
              </div>
            ) : (
              <div className="space-y-4 px-2 pb-4">
                {sortedDays.map((dateStr) => {
                  const dayLogs = logsByDay.get(dateStr) ?? [];
                  return (
                    <div key={dateStr} className="space-y-1">
                      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-[#1e1e1e] bg-[#0a0a0a] py-1.5 px-1">
                        <span className="text-sm font-medium text-zinc-400">
                          {formatDate(dateStr)}
                        </span>
                        <span className="ml-auto shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-zinc-500">
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
                                  <span className="font-mono text-xs">
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
        </aside>

        <main className="min-w-0 flex-1 overflow-auto p-4">
          {selectedLog ? (
            <LogView
              log={selectedLog}
              openSections={openSections}
              onToggleSection={toggleSection}
              allExpanded={allExpanded}
            />
          ) : (
            <div className="flex h-full min-h-[24rem] flex-col items-center justify-center rounded-lg border border-dashed border-[#1e1e1e] bg-white/[0.02] text-center">
              <p className="text-[11px] font-medium uppercase tracking-widest text-zinc-500">
                Select a log
              </p>
              <p className="mt-1 max-w-xs text-[11px] text-zinc-600">
                Choose an entry from the list to inspect the pipeline.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

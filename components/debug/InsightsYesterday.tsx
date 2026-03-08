'use client';

import DebugLogsPage from './DebugLogsPage';
import { GenericJsonLogView } from './DebuggerPanel';
import { getPageLabel, getAgentLabel } from '@/lib/debugLogsConfig';

function getLogTimestamp(log: Record<string, unknown>): string {
  const meta = log.metadata as { timestamp?: string } | undefined;
  const req = log.userRequest as { requestedAt?: string } | undefined;
  return req?.requestedAt ?? meta?.timestamp ?? '';
}

function requestTypeLabel(_log: Record<string, unknown>): string {
  return "Yesterday's insights";
}

function getLogTokens(log: Record<string, unknown>): number {
  const meta = log.metadata as { usage?: { prompt_tokens?: number; completion_tokens?: number } } | undefined;
  const u = meta?.usage ?? {};
  return (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
}

export default function InsightsYesterdayPage() {
  return (
    <DebugLogsPage<Record<string, unknown>>
      page="insights"
      agent="yesterday"
      pageLabel={getPageLabel('insights')}
      agentLabel={getAgentLabel('yesterday')}
      getLogTimestamp={getLogTimestamp}
      requestTypeLabel={requestTypeLabel}
      getLogTokens={getLogTokens}
      LogView={GenericJsonLogView}
    />
  );
}

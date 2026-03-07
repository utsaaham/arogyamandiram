'use client';

import DebugLogsPage from './DebugLogsPage';
import { AILoggerLogView, totalTokensAILogger, type AILoggerDebugLog } from './DebuggerPanel';
import { getPageLabel } from '@/lib/debugLogsConfig';

function getLogTimestamp(log: AILoggerDebugLog): string {
  return log.userRequest?.requestedAt ?? log.metadata?.timestamp ?? '';
}

function requestTypeLabel(log: AILoggerDebugLog): string {
  const text = log.userRequest?.text ?? '';
  return text.length > 40 ? `${text.slice(0, 40)}…` : text || '—';
}

export default function WorkoutAILoggerPage() {
  return (
    <DebugLogsPage<AILoggerDebugLog>
      page="workout"
      agent="ai-logger"
      pageLabel={getPageLabel('workout')}
      agentLabel="AI Logger"
      getLogTimestamp={getLogTimestamp}
      requestTypeLabel={requestTypeLabel}
      getLogTokens={totalTokensAILogger}
      LogView={AILoggerLogView}
    />
  );
}

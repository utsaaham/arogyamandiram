'use client';

import DebugLogsPage from './DebugLogsPage';
import { MealIdeasLogView, totalTokens, type MealIdeasDebugLog } from './DebuggerPanel';
import { getPageLabel, getAgentLabel } from '@/lib/debugLogsConfig';

function getLogTimestamp(log: MealIdeasDebugLog): string {
  return log.userRequest?.requestedAt ?? (log as { metadata?: { timestamp?: string } }).metadata?.timestamp ?? '';
}

function requestTypeLabel(log: MealIdeasDebugLog): string {
  const types = log.userRequest?.selectedMealTypes;
  if (!types?.length) return '—';
  return types.join(', ');
}

export default function FoodMealIdeasPage() {
  return (
    <DebugLogsPage<MealIdeasDebugLog>
      page="food"
      agent="meal-ideas"
      pageLabel={getPageLabel('food')}
      agentLabel={getAgentLabel('meal-ideas')}
      getLogTimestamp={getLogTimestamp}
      requestTypeLabel={requestTypeLabel}
      getLogTokens={totalTokens}
      LogView={MealIdeasLogView}
    />
  );
}

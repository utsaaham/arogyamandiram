/**
 * Display names and descriptions for debug log pages/agents.
 * Used by the AI Request Inspector sidebar and agent header.
 */

export const PAGE_LABELS: Record<string, string> = {
  food: 'Food',
  workout: 'Workout',
  insights: 'Insights',
  targets: 'Targets',
  sleep: 'Sleep',
};

export const AGENT_LABELS: Record<string, string> = {
  'meal-ideas': 'Meal Ideas',
  'ai-insights': 'AI Insights',
  'workout-planner': 'Workout Planner',
  'ai-logger': 'AI Logger',
  'health-plan': 'AI Health Plan',
  'sleep-coach': 'Sleep Coach',
  'yesterday': "Yesterday's insights",
  'weekly': 'Weekly insights',
  'monthly': 'Monthly insights',
  'yearly': 'Yearly insights',
};

export const AGENT_DESCRIPTIONS: Record<string, string> = {
  'meal-ideas': 'Suggests meals based on your history and preferences.',
  'ai-insights': 'Generates personalized health insights from your data.',
  'workout-planner': 'Plans workouts tailored to your goals.',
  'ai-logger': 'Logs food entries via natural language.',
  'health-plan': 'Generates personalized targets from your profile.',
  'sleep-coach': 'Provides sleep tips and analysis.',
  'yesterday': "Yesterday's AI insights.",
  'weekly': 'Weekly AI insights.',
  'monthly': 'Monthly AI insights.',
  'yearly': 'Yearly AI insights.',
};

export function getPageLabel(slug: string): string {
  return PAGE_LABELS[slug] ?? slug;
}

export function getAgentLabel(slug: string): string {
  return AGENT_LABELS[slug] ?? slug;
}

export function getAgentDescription(pageSlug: string, agentSlug: string): string {
  return AGENT_DESCRIPTIONS[agentSlug] ?? `AI agent: ${getPageLabel(pageSlug)} › ${getAgentLabel(agentSlug)}`;
}

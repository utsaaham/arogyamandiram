/**
 * Display names and descriptions for debug log pages/agents.
 * Used by the Request Inspector sidebar and agent header.
 */

export const PAGE_LABELS: Record<string, string> = {
  food: 'Food',
  workout: 'Workout',
  insights: 'Insights',
  targets: 'Targets',
  sleep: 'Sleep',
  'ai-assistant': 'AI Assistant',
  email: 'Email',
  settings: 'Settings',
  orchestrator: 'Orchestrator',
  'today-plan': "Today's Plan",
};

export const AGENT_LABELS: Record<string, string> = {
  'meal-ideas': 'Meal Ideas',
  'todays-plan': "Today's Plan",
  'workout-planner': 'Workout Planner',
  'ai-logger': 'AI Logger',
  'food-logger': 'Food Logger',
  'health-plan': 'AI Health Plan',
  'sleep-coach': 'Sleep Coach',
  'yesterday': "Yesterday's insights",
  'weekly': 'Weekly insights',
  'monthly': 'Monthly insights',
  'yearly': 'Yearly insights',
  'today-plan': "Today's Plan",
  'orchestrator': 'AI Commands',
  'overview': 'Overview',
  'food': 'Food Plan',
  'workout': 'Workout Plan',
  'water': 'Water',
  'weight': 'Weight',
  'sleep': 'Sleep',
  'food-ai-logger': 'Food AI Logger',
  'workout-ai-logger': 'Workout AI Logger',
  'workout-plan': 'Workout Plan',
  'custom-food': 'Custom Food',
  'unknown': 'Unrecognized',
  'smtp': 'SMTP Sends',
  'imap': 'IMAP Polls',
  'todos-food-parser': 'Todos Food Parser',
};

export const AGENT_DESCRIPTIONS: Record<string, string> = {
  'meal-ideas': 'Generates meal suggestions based on your history and preferences.',
  'todays-plan': 'Generates personalized health insights from your data.',
  'workout-planner': 'Plans workouts tailored to your goals.',
  'ai-logger': 'Logs food entries via natural language.',
  'food-logger': 'Food entries logged via the orchestrator AI pipeline.',
  'health-plan': 'Generates personalized targets from your profile.',
  'sleep-coach': 'Provides sleep tips and analysis.',
  'orchestrator': 'Routes natural language commands to the correct health logging tool.',
  'yesterday': "Yesterday's AI insights.",
  'weekly': 'Weekly AI insights.',
  'monthly': 'Monthly AI insights.',
  'yearly': 'Yearly AI insights.',
  'today-plan': "Today's AI plan generation (overview, food, workout).",
  'overview': 'AI-generated top insight and weight prediction for today.',
  'food': 'AI-generated food plan with meal suggestions for today.',
  'workout': 'AI-generated workout plan with exercises for today.',
  'water': 'Water intake logged via the AI assistant.',
  'weight': 'Weight entries logged via the AI assistant.',
  'sleep': 'Sleep entries logged via the AI assistant.',
  'food-ai-logger': 'Food entries parsed and logged via the AI assistant.',
  'workout-ai-logger': 'Workout entries parsed and logged via the AI assistant.',
  'workout-plan': 'Workout plans generated on demand by the AI assistant.',
  'custom-food': 'Custom food entries created via the AI assistant.',
  'unknown': 'Commands the AI could not classify as a health action.',
  'smtp': 'Outbound reminder emails sent via SMTP, by userId and type.',
  'imap': 'Inbound email reply polls, replies found, and what was logged.',
  'todos-food-parser': 'Parses food todo templates in Settings into structured food items with nutrition.',
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

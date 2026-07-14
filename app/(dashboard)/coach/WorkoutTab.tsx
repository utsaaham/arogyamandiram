'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles, Loader2, Dumbbell, Lightbulb, CheckCircle2, Pencil,
  ChevronDown, ChevronUp, ExternalLink, Flame, Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { showToast } from '@/components/ui/Toast';
import api from '@/lib/apiClient';
import type { DailyPlanData, WorkoutEntry } from '@/types';
import { usePlanAutoRefresh } from '@/hooks/usePlanAutoRefresh';

type WorkoutExercise = NonNullable<DailyPlanData['workoutPlan']>['exercises'][number];
type WorkoutPlan = NonNullable<DailyPlanData['workoutPlan']>;

type WorkoutDraft = {
  comment: string;        // current text in the "You did" box
  savedComment: string;   // last successfully-logged text (used to compare on edit cancel)
  saving: boolean;
  saved: boolean;
  editing: boolean;
  workoutId: string | null;
  error: string | null;
};

const INTENSITY_BADGE: Record<string, string> = {
  low: 'bg-zinc-800 text-zinc-400',
  medium: 'bg-amber-500/10 text-amber-400',
  high: 'bg-rose-500/10 text-rose-400',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRepUpperBound(reps: string): number | null {
  const matches = reps.match(/\d+/g);
  if (!matches || matches.length === 0) return null;
  const nums = matches.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (nums.length === 0) return null;
  return Math.max(...nums);
}

/** Generate the prefilled "You did" text from the AI's target. */
function defaultDidText(ex: WorkoutExercise): string {
  const sets = Math.max(1, Number(ex.sets) || 1);
  const repsRaw = String(ex.reps || '').trim().toLowerCase();
  const minutes = Math.max(1, Number(ex.durationMinutes) || 5);

  if (!repsRaw || /^(continuous|steady|pace|steady pace)/.test(repsRaw)) {
    return `${minutes} minutes`;
  }
  if (/sec/.test(repsRaw)) {
    const n = parseRepUpperBound(repsRaw) ?? 30;
    return sets > 1 ? `${sets} sets × ${n} seconds` : `${n} seconds`;
  }
  if (/min/.test(repsRaw) && !/^\d+\s*reps?/.test(repsRaw)) {
    const n = parseRepUpperBound(repsRaw) ?? minutes;
    return `${n} minutes`;
  }
  const n = parseRepUpperBound(repsRaw) ?? 10;
  return `${sets} sets × ${n} reps`;
}

/** Render the AI target as a human-readable one-liner shown above the input. */
function formatAiTarget(ex: WorkoutExercise): string {
  const sets = Math.max(1, Number(ex.sets) || 1);
  const reps = String(ex.reps || '').trim();
  const minutes = ex.durationMinutes;
  const parts: string[] = [];
  if (reps && !/^(continuous|steady)/i.test(reps)) {
    const looksLikeNumber = /^\d+(\s*[-–to ]\s*\d+)?$/.test(reps);
    parts.push(looksLikeNumber ? `${sets} sets × ${reps} reps` : `${sets} × ${reps}`);
  } else if (reps) {
    parts.push(reps);
  }
  if (minutes) parts.push(`${minutes} min`);
  if (ex.intensity) parts.push(`${ex.intensity} intensity`);
  return parts.join(' · ');
}

/**
 * Parse "<sets> × <reps>" from a free-text comment.
 * "3 sets × 12 reps" → {sets:3, reps:12}; "3×12" → {sets:3, reps:12}; "12 reps" → {sets:fallbackSets, reps:12}.
 * If no rep-shaped number is present (e.g. comment is "8 minutes"), reps will be 0.
 */
function extractSetsAndReps(comment: string, fallbackSets: number): { sets: number; reps: number } {
  const setsRepsMatch = comment.match(/(\d+)\s*(?:sets?\s*)?[x×*]\s*(\d+)/i);
  if (setsRepsMatch) {
    const s = Number(setsRepsMatch[1]);
    const r = Number(setsRepsMatch[2]);
    if (Number.isFinite(s) && Number.isFinite(r) && s > 0 && r > 0) {
      return { sets: s, reps: r };
    }
  }
  // "12 reps" or "12 sec" — single integer that's clearly reps/seconds, not a duration
  const repsOnly = comment.match(/(\d+)\s*(?:reps?|sec|second)/i);
  if (repsOnly) {
    const n = Number(repsOnly[1]);
    if (Number.isFinite(n) && n > 0) return { sets: fallbackSets, reps: n };
  }
  return { sets: fallbackSets, reps: 0 };
}

/** Extract minutes from a free-text comment, e.g. "8 minutes" → 8. */
function extractMinutes(comment: string, fallback: number): number {
  const match = comment.match(/(\d+)\s*(?:min|minute)/i);
  if (match) {
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return fallback;
}

/** Render the planned target compactly for the notes string, e.g. "2 × 10-12". */
function plannedNotesText(ex: WorkoutExercise): string {
  const sets = Math.max(1, Number(ex.sets) || 1);
  const reps = String(ex.reps || '').trim();
  if (!reps) return `${sets} sets`;
  if (/^(continuous|steady)/i.test(reps)) {
    return ex.durationMinutes ? `${ex.durationMinutes} min` : reps;
  }
  return `${sets} × ${reps}`;
}

/** Pull just the "Executed: <text>" portion out of stored notes, falling back to the raw notes. */
function extractExecutedFromNotes(notes: string): string {
  const match = notes.match(/Executed:\s*([\s\S]+?)\s*$/);
  if (match && match[1]) return match[1].trim();
  return notes.trim();
}

function getExerciseDraftKey(exercise: WorkoutExercise, index: number): string {
  const name = String(exercise.name || '').trim().toLowerCase();
  return `${index}:${name}`;
}

function emptyDraft(comment: string): WorkoutDraft {
  return {
    comment,
    savedComment: '',
    saving: false,
    saved: false,
    editing: false,
    workoutId: null,
    error: null,
  };
}

// ─── WorkoutTab ───────────────────────────────────────────────────────────────

export default function WorkoutTab() {
  const [workoutPlan, setWorkoutPlan] = useState<WorkoutPlan | null>(null);
  const [loggedToday, setLoggedToday] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [workoutDrafts, setWorkoutDrafts] = useState<Record<string, WorkoutDraft>>({});
  const [workoutDifficulty, setWorkoutDifficulty] = useState<string | null>(null);
  const [skippedWorkoutReason, setSkippedWorkoutReason] = useState<string | null>(null);
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [feedbackSaved, setFeedbackSaved] = useState(false);
  const [rationaleOpen, setRationaleOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/daily-plan/workout', { credentials: 'include' });
      const json = await res.json() as {
        success: boolean;
        data?: {
          workoutPlan?: WorkoutPlan | null;
          feedback?: { workoutDifficulty?: string } | null;
          loggedToday?: WorkoutEntry[];
        };
      };
      if (json.success) {
        setWorkoutPlan(json.data?.workoutPlan ?? null);
        setLoggedToday(Array.isArray(json.data?.loggedToday) ? json.data!.loggedToday! : []);
        const fb = json.data?.feedback;
        if (fb?.workoutDifficulty) setWorkoutDifficulty(fb.workoutDifficulty);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  usePlanAutoRefresh(load);

  // Re-hydrate per-exercise draft state from the plan AND today's logged entries.
  // This fixes the bug where after a refresh, the "Logged" pill reverted to "+ Add"
  // even though the workout was already in DailyLog.
  useEffect(() => {
    const exercises = workoutPlan?.exercises ?? [];
    if (exercises.length === 0) { setWorkoutDrafts({}); return; }

    setWorkoutDrafts((prev) => {
      const next: Record<string, WorkoutDraft> = {};
      for (let i = 0; i < exercises.length; i += 1) {
        const ex = exercises[i];
        const key = getExerciseDraftKey(ex, i);
        const prefill = defaultDidText(ex);
        const matchName = String(ex.name || '').trim().toLowerCase();
        // Prefer planExerciseName match; fall back to fuzzy exercise-name match.
        const match = loggedToday.find((entry) => {
          const planName = String(entry.planExerciseName || '').trim().toLowerCase();
          if (planName && planName === matchName) return true;
          const exName = String(entry.exercise || '').trim().toLowerCase();
          return exName === matchName;
        });
        if (match) {
          const rawNotes = String(match.notes || '').trim();
          const savedComment = rawNotes ? extractExecutedFromNotes(rawNotes) : prefill;
          next[key] = {
            comment: savedComment,
            savedComment,
            saving: false,
            saved: true,
            editing: false,
            workoutId: match._id ?? null,
            error: null,
          };
        } else {
          // Preserve any in-progress edits the user had typed before reload.
          next[key] = prev[key] && !prev[key].saved
            ? { ...prev[key], comment: prev[key].comment || prefill }
            : emptyDraft(prefill);
        }
      }
      return next;
    });
  }, [workoutPlan?.exercises, loggedToday]);

  const handleGenerate = async () => {
    const hadPlan = (workoutPlan?.exercises?.length ?? 0) > 0;
    setGenerating(true);
    try {
      const res = await fetch('/api/ai/daily-plan/workout', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (json.success) {
        await load();
        showToast(hadPlan ? 'Workout plan regenerated!' : 'Workout plan generated!', 'success');
      } else {
        const msg = json.error ?? 'Failed to generate workout plan';
        showToast(msg.toLowerCase().includes('api key') ? 'Add your OpenAI key in Settings.' : msg, 'error');
      }
    } catch {
      showToast('Failed to generate workout plan', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const setDraft = (key: string, patch: Partial<WorkoutDraft>) => {
    setWorkoutDrafts((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleLog = async (exercise: WorkoutExercise, index: number) => {
    const key = getExerciseDraftKey(exercise, index);
    const draft = workoutDrafts[key];
    if (!draft || draft.saving) return;
    const comment = draft.comment.trim();
    if (!comment) {
      setDraft(key, { error: 'Add a short note about what you did.' });
      return;
    }

    const category = (['cardio', 'strength', 'flexibility', 'core', 'sports'].includes(exercise.category ?? ''))
      ? exercise.category! : 'other';
    const totalDuration = Math.max(1, Number(workoutPlan?.durationMinutes) || 1);
    const totalCalories = Math.max(1, Number(workoutPlan?.estimatedCalories) || 1);
    const plannedDuration = Math.max(1, Number(exercise.durationMinutes) || 5);
    // Caloric estimate scales the plan's total burn by this exercise's planned duration share.
    const estimatedCalories = Math.max(1, Math.round((totalCalories / totalDuration) * plannedDuration));
    const fallbackSets = Math.max(1, Number(exercise.sets) || 1);
    const { sets, reps } = extractSetsAndReps(comment, fallbackSets);
    const duration = extractMinutes(comment, plannedDuration);
    const notes = `Planned: ${plannedNotesText(exercise)} | Executed: ${comment}`;

    setDraft(key, { saving: true, error: null });
    try {
      const response = await api.addWorkout(today, {
        exercise: exercise.name,
        planExerciseName: exercise.name,
        category,
        duration,
        caloriesBurned: estimatedCalories,
        sets,
        ...(reps > 0 ? { reps } : {}),
        notes,
      });
      if (!response.success) {
        setDraft(key, { saving: false, error: response.error || 'Failed to log' });
        return;
      }
      // Re-fetch so we pick up the new entry's _id for future edits.
      await load();
      showToast(`${exercise.name} logged`, 'success');
    } catch (err) {
      setDraft(key, { saving: false, error: err instanceof Error ? err.message : 'Failed to log' });
    }
  };

  const handleEdit = (exercise: WorkoutExercise, index: number) => {
    const key = getExerciseDraftKey(exercise, index);
    setDraft(key, { editing: true, error: null });
  };

  const handleCancelEdit = (exercise: WorkoutExercise, index: number) => {
    const key = getExerciseDraftKey(exercise, index);
    const draft = workoutDrafts[key];
    if (!draft) return;
    setDraft(key, { editing: false, comment: draft.savedComment || draft.comment, error: null });
  };

  const handleSaveEdit = async (exercise: WorkoutExercise, index: number) => {
    const key = getExerciseDraftKey(exercise, index);
    const draft = workoutDrafts[key];
    if (!draft || !draft.workoutId) return;
    const comment = draft.comment.trim();
    if (!comment) {
      setDraft(key, { error: 'Add a short note about what you did.' });
      return;
    }

    const category = (['cardio', 'strength', 'flexibility', 'core', 'sports'].includes(exercise.category ?? ''))
      ? exercise.category! : 'other';
    const totalDuration = Math.max(1, Number(workoutPlan?.durationMinutes) || 1);
    const totalCalories = Math.max(1, Number(workoutPlan?.estimatedCalories) || 1);
    const plannedDuration = Math.max(1, Number(exercise.durationMinutes) || 5);
    const estimatedCalories = Math.max(1, Math.round((totalCalories / totalDuration) * plannedDuration));
    const fallbackSets = Math.max(1, Number(exercise.sets) || 1);
    const { sets, reps } = extractSetsAndReps(comment, fallbackSets);
    const duration = extractMinutes(comment, plannedDuration);
    const notes = `Planned: ${plannedNotesText(exercise)} | Executed: ${comment}`;

    setDraft(key, { saving: true, error: null });
    try {
      const response = await api.updateWorkout(today, draft.workoutId, {
        exercise: exercise.name,
        planExerciseName: exercise.name,
        category,
        duration,
        caloriesBurned: estimatedCalories,
        sets,
        ...(reps > 0 ? { reps } : {}),
        notes,
      });
      if (!response.success) {
        setDraft(key, { saving: false, error: response.error || 'Failed to update' });
        return;
      }
      await load();
      showToast(`${exercise.name} updated`, 'success');
    } catch (err) {
      setDraft(key, { saving: false, error: err instanceof Error ? err.message : 'Failed to update' });
    }
  };

  const handleSaveFeedback = async () => {
    setFeedbackSaving(true);
    try {
      const res = await api.submitPlanFeedback({
        date: today,
        ...(workoutDifficulty ? { workoutDifficulty } : {}),
        ...(skippedWorkoutReason ? { skippedWorkoutReason } : {}),
      });
      if (res.success) { setFeedbackSaved(true); showToast('Feedback saved! Your next plan will adapt.', 'success'); }
      else showToast(res.error || 'Failed to save feedback', 'error');
    } catch { showToast('Failed to save feedback', 'error'); }
    finally { setFeedbackSaving(false); }
  };

  const hasFeedbackChanges = workoutDifficulty !== null || skippedWorkoutReason !== null;
  const currentWorkoutPlan = workoutPlan;
  const hasWorkoutPlanContent = (currentWorkoutPlan?.exercises?.length ?? 0) > 0;

  if (loading) return null;

  if (!currentWorkoutPlan || !hasWorkoutPlanContent) {
    return (
      <div className="dashboard-unified-card rounded-2xl border p-5">
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Dumbbell className="h-12 w-12 text-zinc-600" />
          <p className="text-sm font-medium text-zinc-300">No workout plan generated yet</p>
          <p className="text-xs text-zinc-500">Plans auto-generate at midnight from your daily logs.</p>
          <button onClick={handleGenerate} disabled={generating}
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50">
            {generating ? <Loader2 className="h-4 w-4 animate-spin text-black" /> : <Sparkles className="h-4 w-4 text-black" />}
            {generating ? 'Generating…' : 'Generate Workout'}
          </button>
        </div>
      </div>
    );
  }

  // Progress: how many exercises are logged.
  const totalExercises = currentWorkoutPlan.exercises.length;
  const loggedExercises = currentWorkoutPlan.exercises.filter((ex, i) => {
    return workoutDrafts[getExerciseDraftKey(ex, i)]?.saved;
  }).length;

  const hasRationale = !!(
    currentWorkoutPlan.weeklyStrategyChosen ||
    currentWorkoutPlan.whyToday ||
    currentWorkoutPlan.reasoning
  );

  return (
    <div className="space-y-4">
      {/* Collapsible rationale */}
      {hasRationale && (
        <div className="rounded-xl border border-zinc-800 bg-emerald-500/[0.03]">
          <button
            type="button"
            onClick={() => setRationaleOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Lightbulb className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <p className="truncate text-xs text-emerald-200">
                <span className="font-semibold">Why this plan today</span>
                {currentWorkoutPlan.whyToday && (
                  <span className="ml-2 text-emerald-300/70">· {currentWorkoutPlan.whyToday}</span>
                )}
              </p>
            </div>
            {rationaleOpen
              ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-emerald-400/70" />
              : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-emerald-400/70" />}
          </button>
          {rationaleOpen && (
            <div className="space-y-2 border-t border-emerald-500/10 px-4 py-3">
              {currentWorkoutPlan.weeklyStrategyChosen && (
                <p className="text-xs text-sky-200">
                  <span className="font-semibold text-sky-300">This week: </span>
                  {currentWorkoutPlan.weeklyStrategyChosen}
                </p>
              )}
              {currentWorkoutPlan.whyToday && (
                <p className="text-xs text-emerald-200">
                  <span className="font-semibold text-emerald-300">Today: </span>
                  {currentWorkoutPlan.whyToday}
                </p>
              )}
              {currentWorkoutPlan.reasoning && (
                <p className="text-xs text-amber-200/90">{currentWorkoutPlan.reasoning}</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="dashboard-unified-card rounded-2xl border p-5 sm:p-6">
      {/* Header with progress */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-text-primary">Today&apos;s Workout</h2>
            {totalExercises > 0 && (
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                {loggedExercises}/{totalExercises} logged
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-semibold text-text-primary">{currentWorkoutPlan.name}</p>
          {currentWorkoutPlan.description && (
            <p className="mt-0.5 text-xs text-text-muted">{currentWorkoutPlan.description}</p>
          )}
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {generating ? 'Generating…' : 'Regenerate'}
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl bg-emerald-500/[0.045] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Progress</p>
          <p className="mt-1 text-lg font-bold text-emerald-400">{loggedExercises}/{totalExercises}</p>
          <p className="text-[10px] text-zinc-600">exercises logged</p>
        </div>
        <div className="rounded-xl bg-white/[0.025] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Duration</p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-bold text-cyan-400"><Clock className="h-4 w-4" />{currentWorkoutPlan.durationMinutes} min</p>
        </div>
        <div className="rounded-xl bg-white/[0.025] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Estimated burn</p>
          <p className="mt-1 flex items-center gap-1.5 text-lg font-bold text-orange-400"><Flame className="h-4 w-4" />{currentWorkoutPlan.estimatedCalories} kcal</p>
        </div>
        <div className="rounded-xl bg-white/[0.025] p-3">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Intensity</p>
          <p className="mt-1 text-lg font-bold capitalize text-amber-400">{currentWorkoutPlan.exercises.find((exercise) => exercise.intensity)?.intensity ?? 'Balanced'}</p>
        </div>
      </div>

      {/* Exercises — numbered gym-order checklist */}
      {totalExercises > 0 && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-zinc-300">Workout sequence</p>
          <p className="text-[10px] text-zinc-500">Complete in order</p>
        </div>
      )}
      <div className="space-y-2">
        {(() => {
          const firstUnloggedIdx = currentWorkoutPlan.exercises.findIndex(
            (ex, i) => !workoutDrafts[getExerciseDraftKey(ex, i)]?.saved
          );
          return currentWorkoutPlan.exercises.map((ex, i) => {
          const key = getExerciseDraftKey(ex, i);
          const draft = workoutDrafts[key];
          const aiTarget = formatAiTarget(ex);
          const showForm = !draft?.saved || draft?.editing;
          const isLogged = draft?.saved && !draft?.editing;
          const isNext = i === firstUnloggedIdx;
          return (
            <div
              key={i}
              className={cn(
                'rounded-2xl border bg-zinc-900/30 px-4 py-4 transition-colors',
                isNext ? 'border-emerald-500/50 bg-emerald-500/[0.025]' : 'border-zinc-800'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                        isLogged
                          ? 'bg-emerald-500 text-black'
                          : isNext
                            ? 'border border-emerald-400 text-emerald-300'
                            : 'border border-zinc-700 text-zinc-500'
                      )}
                    >
                      {isLogged ? <CheckCircle2 className="h-3.5 w-3.5" /> : (ex.order ?? i + 1)}
                    </span>
                    <p className="truncate text-sm font-medium text-text-primary">{ex.name}</p>
                    {isNext && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">Next</span>}
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent('how to perform ' + ex.name)}`}
                      target="_blank" rel="noopener noreferrer"
                      title="How to perform"
                      className="shrink-0 text-zinc-500 hover:text-emerald-400 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {aiTarget && (
                    <p className="mt-1 text-[11px] text-zinc-500">{aiTarget}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {ex.category && <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[9px] capitalize text-zinc-500">{ex.category}</span>}
                    {ex.muscleGroup && <span className="rounded-full bg-violet-500/[0.07] px-2 py-0.5 text-[9px] text-violet-300">{ex.muscleGroup}</span>}
                    {ex.slot && <span className="rounded-full bg-cyan-500/[0.07] px-2 py-0.5 text-[9px] capitalize text-cyan-300">{ex.slot}</span>}
                  </div>
                  {ex.steps && ex.steps.length > 0 && showForm && (
                    <ul className="mt-2 space-y-0.5 list-none pl-0">
                      {ex.steps.map((step, si) => (
                        <li key={si} className="flex items-start gap-1.5 text-[11px] text-text-muted leading-relaxed">
                          <span className="mt-0.5 shrink-0 text-emerald-500">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {ex.intensity && (
                  <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] capitalize font-medium whitespace-nowrap', INTENSITY_BADGE[ex.intensity] ?? INTENSITY_BADGE.medium)}>
                    {ex.intensity}
                  </span>
                )}
              </div>

              {/* You did — free-text comment */}
              {showForm ? (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="text"
                    value={draft?.comment ?? defaultDidText(ex)}
                    onChange={(e) => setDraft(key, { comment: e.target.value, error: null })}
                    placeholder="e.g. 2 sets × 12 reps"
                    className="flex-1 min-w-0 rounded-lg bg-black/40 px-3 py-1.5 text-xs text-text-primary placeholder:text-zinc-600 focus:outline-none"
                  />
                  {draft?.editing && (
                    <button type="button" onClick={() => handleCancelEdit(ex, i)}
                      className="shrink-0 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                      Cancel
                    </button>
                  )}
                  <button type="button"
                    onClick={() => (draft?.editing ? handleSaveEdit(ex, i) : handleLog(ex, i))}
                    disabled={draft?.saving}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">
                    {draft?.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    {draft?.saving ? 'Saving…' : draft?.editing ? 'Save' : 'Log'}
                  </button>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-emerald-300/90 truncate">
                    {draft?.savedComment || draft?.comment}
                  </p>
                  <button type="button" onClick={() => handleEdit(ex, i)}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                </div>
              )}
              {draft?.error && <p className="mt-2 text-xs text-rose-400">{draft.error}</p>}
            </div>
          );
          });
        })()}
      </div>

      </div>

      {/* Progression tip */}
      {currentWorkoutPlan.progressionTip && (
        <div className="mt-2">
          <div className="flex items-start gap-2 rounded-xl border border-zinc-800 bg-emerald-500/[0.03] px-3 py-2.5">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <p className="text-xs text-emerald-200">{currentWorkoutPlan.progressionTip}</p>
          </div>
        </div>
      )}

      {/* Feedback */}
      <div className="dashboard-unified-card rounded-2xl border p-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">How was today&apos;s workout?</p>
          <div className="flex flex-wrap gap-2">
            {(['too_easy', 'just_right', 'too_hard'] as const).map((d) => (
              <button key={d} type="button" onClick={() => { setWorkoutDifficulty(d); setFeedbackSaved(false); }}
                className={cn('rounded-full px-3 py-1.5 text-xs capitalize transition-all',
                  workoutDifficulty === d
                    ? 'bg-emerald-500/10 text-emerald-300'
                    : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06]')}>
                {d.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-text-muted">Did you skip it?</p>
          <div className="flex flex-wrap gap-2">
            {(['no_time', 'tired', 'injury', 'other'] as const).map((r) => (
              <button key={r} type="button" onClick={() => { setSkippedWorkoutReason(skippedWorkoutReason === r ? null : r); setFeedbackSaved(false); }}
                className={cn('rounded-full px-3 py-1.5 text-xs capitalize transition-all',
                  skippedWorkoutReason === r
                    ? 'bg-rose-500/10 text-rose-300'
                    : 'bg-white/[0.02] text-zinc-400 hover:bg-white/[0.06]')}>
                {r.replace('_', ' ')}
              </button>
            ))}
          </div>
          {hasFeedbackChanges && (
            <button onClick={handleSaveFeedback} disabled={feedbackSaving || feedbackSaved}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50">
              {feedbackSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : feedbackSaved ? <CheckCircle2 className="h-3 w-3" /> : null}
              {feedbackSaved ? 'Saved!' : 'Save feedback'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

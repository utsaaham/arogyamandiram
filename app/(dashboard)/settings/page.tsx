'use client';

import { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Bell, Key, Save, Settings, Target, User, Ruler, Activity, Flag, PersonStanding,
  Shield, Eye, EyeOff, CheckCircle2, Sparkles, Utensils,
  Loader2, RefreshCw, Flame,
  Mail, Plus, ListChecks, Pill, Zap, Trash2, Pencil, CheckSquare,
  Link2, RotateCcw, AlertCircle, SlidersHorizontal, Smile, Scissors,
} from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { CARE_CADENCES, cadenceInfo } from '@/lib/careCadence';
import { cn } from '@/lib/utils';
import { getTargetsForUser } from '@/lib/health';
import { GOAL_OPTIONS } from '@/lib/goals';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import Image from 'next/image';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TodoTemplate { id: string; title: string; note: string; time: string; category: string; enabled: boolean; frequency?: number; times?: string[]; cadence?: string; lastDone?: string | null; baseItems?: Record<string, unknown>[]; }

// ─── Constants ────────────────────────────────────────────────────────────────

type Tab = 'profile' | 'body' | 'targets' | 'customizations' | 'notifications' | 'todos' | 'health-data';

const NAV_ITEMS: { key: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  { key: 'profile',       label: 'Profile',        icon: User,          desc: 'Personal info & metrics' },
  { key: 'body',          label: 'Body',           icon: PersonStanding, desc: 'Composition & fitness' },
  { key: 'targets',       label: 'Targets',        icon: Target,        desc: 'Daily goals & macros' },
  { key: 'customizations', label: 'Customizations', icon: SlidersHorizontal, desc: 'Tracker-specific defaults' },
  { key: 'notifications', label: 'Notifications',  icon: Bell,          desc: 'Reminders, email & schedule' },
  { key: 'todos',         label: 'Checklist',      icon: CheckSquare,   desc: 'Todos and care' },
  { key: 'health-data',   label: 'Connectors',     icon: Link2,         desc: 'Device integrations' },
];

const MAX_CUSTOM_WATER_GLASS_ML = 5000;
const DEFAULT_WATER_QUICK_AMOUNTS = [100, 250, 500, 750] as const;

const activityLevels = [
  { value: 'sedentary',   label: 'Sedentary',   desc: 'Little or no exercise' },
  { value: 'light',       label: 'Light',        desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',     desc: '3–5 days/week' },
  { value: 'active',      label: 'Active',       desc: '6–7 days/week' },
  { value: 'very_active', label: 'Very Active',  desc: 'Intense daily exercise' },
];

const dietaryPreferenceOptions = [
  { value: 'no_preference', label: 'Anything', icon: '✨', desc: 'No restrictions' },
  { value: 'vegetarian', label: 'Vegetarian', icon: '🌱', desc: 'No meat or fish' },
  { value: 'non_vegetarian', label: 'Non-vegetarian', icon: '🍗', desc: 'Meat and fish' },
  { value: 'eggetarian', label: 'Eggetarian', icon: '🥚', desc: 'Vegetarian + eggs' },
  { value: 'vegan', label: 'Vegan', icon: '🥬', desc: 'Plant-based only' },
  { value: 'pescatarian', label: 'Pescatarian', icon: '🐟', desc: 'Vegetarian + seafood' },
  { value: 'flexitarian', label: 'Flexitarian', icon: '🌿', desc: 'Mostly plant-based' },
] as const;

type DietaryPreferenceValue = (typeof dietaryPreferenceOptions)[number]['value'];

const cuisineOptions = [
  'Indian', 'Italian', 'Mexican', 'Mediterranean', 'Chinese', 'Japanese',
  'Korean', 'Thai', 'Middle Eastern', 'American', 'French', 'African', 'Caribbean',
] as const;

const cookingSkillOptions = [
  { value: 'beginner', label: 'Beginner', desc: 'Simple steps and basic techniques' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Comfortable with everyday cooking' },
  { value: 'confident', label: 'Confident', desc: 'More techniques and involved recipes' },
] as const;

const bodyTypeOptions = [
  {
    value: 'ectomorph',
    label: 'Lean frame',
    image: '/images/body-types/ectomorph.png',
  },
  {
    value: 'mesomorph',
    label: 'Athletic frame',
    image: '/images/body-types/mesomorph.png',
  },
  {
    value: 'endomorph',
    label: 'Soft frame',
    image: '/images/body-types/endomorph.png',
  },
] as const;

const bodyFatGuides = [
  { label: 'Very lean', range: '10-14%', value: 12, clue: 'Muscle lines visible, very little belly fat.' },
  { label: 'Lean', range: '15-19%', value: 17, clue: 'Some definition, small belly softness.' },
  { label: 'Average', range: '20-24%', value: 22, clue: 'No clear abs, moderate belly/chest fat.' },
  { label: 'Higher', range: '25-30%', value: 27, clue: 'Visible belly fat, chest and waist look fuller.' },
] as const;

const physiqueGoalOptions = [
  { value: 'lean_toned',     label: 'Slim and fit',          clue: 'Skinny with just a little muscle. Like a runner.' },
  { value: 'lean_muscle',    label: 'Slim with muscle',      clue: 'Get muscle you can see, but stay slim.' },
  { value: 'athletic',       label: 'Sporty',                clue: 'Strong and fast. Good at running, jumping, playing.' },
  { value: 'muscular_bulk',  label: 'Big and strong',        clue: 'Make muscles as big as you can. A bit of extra fat is OK.' },
  { value: 'bodybuilder',    label: 'Huge muscles, zero fat', clue: 'Like a superhero or a bodybuilder on stage.' },
  { value: 'healthy_slim',   label: 'Just lose weight',      clue: 'Mainly drop fat. Looks come later.' },
  { value: 'powerlifter',    label: 'Lift the heaviest',     clue: 'Be as strong as possible. Looks don\'t matter.' },
] as const;

const workoutLocationOptions = [
  { value: 'full_gym',     label: 'Full gym',        clue: 'Machines, barbells, full dumbbell rack, cables.' },
  { value: 'home',         label: 'Home',            clue: 'Tell us what gear you have in the notes below.' },
  { value: 'outdoors',     label: 'Outdoors / park', clue: 'Bodyweight, bars/benches outside, running.' },
  { value: 'hotel_travel', label: 'Hotel / travel',  clue: 'Limited gear, often bodyweight only.' },
] as const;

// Map legacy WorkoutLocation values to the new shape so existing users keep
// their selection. Old preset is converted to plain-language notes the AI reads.
function migrateWorkoutLocation(raw: string | undefined): { location: string; notes: string } {
  if (raw === 'home_gym') return { location: 'home', notes: 'I have dumbbells, barbell, squat rack, and a bench.' };
  if (raw === 'home_dumbbells') return { location: 'home', notes: 'Dumbbells + bodyweight only. No barbell, no machines.' };
  if (raw === 'home_minimal') return { location: 'home', notes: 'Bodyweight only.' };
  return { location: raw || '', notes: '' };
}

const equipmentNotesPlaceholder: Record<string, string> = {
  full_gym:     'e.g. "No cable machine, no leg press. Use free weights instead."',
  home:         'e.g. "I have dumbbells up to 20kg, a pull-up bar, and resistance bands. No bench."',
  outdoors:     'e.g. "Park has parallel bars, monkey bars, and a 200m running track."',
  hotel_travel: 'e.g. "Just a mat and a couple of resistance bands."',
};

// ─── Fat area tag input ────────────────────────────────────────────────────────

function FatAreaInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function commit(raw: string) {
    const parts = raw.split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (parts.length === 0) return;
    onChange(Array.from(new Set([...value, ...parts])));
    setDraft('');
  }

  return (
    <div className="mt-4 space-y-3">
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit(draft);
          } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        placeholder="Type and press Enter (e.g. belly)"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((area, idx) => (
            <span
              key={`${area}-${idx}`}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 pl-2.5 pr-1 py-0.5 text-xs capitalize text-zinc-200"
            >
              {area}
              <button
                type="button"
                aria-label={`Remove ${area}`}
                onClick={() => onChange(value.filter((_, i) => i !== idx))}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-rose-400 transition-colors"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inner component (uses useSearchParams) ───────────────────────────────────

function SettingsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading, refetch } = useUser();

  const rawTab = searchParams.get('tab') as Tab | null;
  const validTabs: Tab[] = ['profile', 'body', 'targets', 'customizations', 'notifications', 'todos', 'health-data'];
  const [activeTab, setActiveTabState] = useState<Tab>(
    rawTab && validTabs.includes(rawTab) ? rawTab : 'profile'
  );

  const setActiveTab = (tab: Tab) => {
    setActiveTabState(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  };

  // ── Profile state ──────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('maintain');
  const [targetWeight, setTargetWeight] = useState('');
  const [bodyType, setBodyType] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [fatFocusAreas, setFatFocusAreas] = useState<string[]>([]);
  const [physiqueGoal, setPhysiqueGoal] = useState('');
  const [workoutLocation, setWorkoutLocation] = useState('');
  const [equipmentNotes, setEquipmentNotes] = useState('');
  const [dietaryPreference, setDietaryPreference] = useState<DietaryPreferenceValue>('no_preference');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [allergyDraft, setAllergyDraft] = useState('');
  const [favoriteCuisines, setFavoriteCuisines] = useState<string[]>([]);
  const [cuisineDraft, setCuisineDraft] = useState('');
  const [cookingSkill, setCookingSkill] = useState<'beginner' | 'intermediate' | 'confident'>('beginner');
  const [maxCookingMinutes, setMaxCookingMinutes] = useState('30');

  // ── Targets state ──────────────────────────────────────────────────────────
  const [targetsSaving, setTargetsSaving] = useState(false);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);
  const [recalculatingTargets, setRecalculatingTargets] = useState(false);
  const [dailyCalories, setDailyCalories] = useState('');
  const [dailyWater, setDailyWater] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [dailySteps, setDailySteps] = useState('');
  const [idealDistance, setIdealDistance] = useState('');

  // ── Customizations state ───────────────────────────────────────────────────
  const [customizationsSaving, setCustomizationsSaving] = useState(false);
  const [customWaterAmounts, setCustomWaterAmounts] = useState<string[]>(DEFAULT_WATER_QUICK_AMOUNTS.map(String));
  const [mascot, setMascot] = useState<'red-panda' | 'kiki'>('red-panda');

  // ── API Keys state ─────────────────────────────────────────────────────────
  const [apiKeysSaving, setApiKeysSaving] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiSaving, setAiSaving] = useState(false);
  const [emailRemindersEnabled, setEmailRemindersEnabled] = useState(true);
  const [emailRemindersSaving, setEmailRemindersSaving] = useState(false);
  const [openaiKey, setOpenaiKey] = useState('');
  const [fdcKey, setFdcKey] = useState('');
  const [showOpenai, setShowOpenai] = useState(false);
  const [showFdc, setShowFdc] = useState(false);

  // ── Preferences state ──────────────────────────────────────────────────────
  const [prefSaving, setPrefSaving] = useState(false);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [waterNotif, setWaterNotif] = useState(true);
  const [mealNotif, setMealNotif] = useState(true);
  const [weighInNotif, setWeighInNotif] = useState(true);
  const [workoutNotif, setWorkoutNotif] = useState(true);
  const [sleepNotif, setSleepNotif] = useState(true);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [recipientInput, setRecipientInput] = useState('');
  const [savingRecipients, setSavingRecipients] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [timezone, setTimezone] = useState('');
  const [waterReminderEnabled, setWaterReminderEnabled] = useState(true);
  const [waterStartTime, setWaterStartTime] = useState('06:00');
  const [waterEndTime, setWaterEndTime] = useState('21:00');
  const [waterFrequencyMinutes, setWaterFrequencyMinutes] = useState(60);
  const [breakfastTime, setBreakfastTime] = useState('');
  const [lunchTime, setLunchTime] = useState('');
  const [dinnerTime, setDinnerTime] = useState('');
  const [sleepTime, setSleepTime] = useState('');
  const [workoutTime, setWorkoutTime] = useState('');
  const [weighInTime, setWeighInTime] = useState('');
  const [lastSentAt, setLastSentAt] = useState<Record<string, string>>({});
  const [emailChecklist, setEmailChecklist] = useState({
    smtpSaved: false, smtpTestSent: false, imapSaved: false, imapTestSent: false,
    recipientListSaved: false, imapReplyVerifiedAt: '', lastUpdatedAt: '',
  });
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [imapUser, setImapUser] = useState('');
  const [imapPass, setImapPass] = useState('');
  const [showImapPass, setShowImapPass] = useState(false);
  const [savingImap, setSavingImap] = useState(false);
  const [imapConfigured, setImapConfigured] = useState(false);
  const imapPollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Connectors state ───────────────────────────────────────────────────────
  const [hdEndpoint, setHdEndpoint] = useState('');
  const [hdApiKey, setHdApiKey] = useState('');
  const [hdShowApiKey, setHdShowApiKey] = useState(false);
  const [hdHasApiKey, setHdHasApiKey] = useState(false);
  const [hdEnabled, setHdEnabled] = useState(false);
  const [hdInterval, setHdInterval] = useState(60);
  const [hdLastSyncAt, setHdLastSyncAt] = useState<string | null>(null);
  const [hdLastSyncSource, setHdLastSyncSource] = useState<'manual' | 'auto' | ''>('');
  const [hdLastStatus, setHdLastStatus] = useState('');
  const [hdLastError, setHdLastError] = useState('');
  const [hdSaving, setHdSaving] = useState(false);
  const [hdSyncing, setHdSyncing] = useState(false);
  const [hdLoaded, setHdLoaded] = useState(false);
  const imapPollingStartedAtRef = useRef<number | null>(null);
  const imapPollingInFlightRef = useRef(false);
  const hasShownImapVerifiedToastRef = useRef(false);

  // ── Populate all state from user ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Profile
    setUsername(user.username || '');
    const p = user.profile;
    if (p) {
      setName(p.name || '');
      if (p.dateOfBirth) {
        const d = String(p.dateOfBirth);
        setDateOfBirth(d.includes('T') ? d.split('T')[0] : d);
        setAge('');
      } else {
        setDateOfBirth('');
        setAge(p.age?.toString() || '');
      }
      setGender(p.gender || 'male');
      setHeight(p.height?.toString() || '');
      setWeight(p.weight?.toString() || '');
      setActivityLevel(p.activityLevel || 'moderate');
      setGoal(p.goal || 'maintain');
      setTargetWeight(p.targetWeight?.toString() || '');
      setBodyType((p as { bodyType?: string }).bodyType || '');
      setBodyFat((p as { bodyFat?: number }).bodyFat?.toString() || '');
      setFatFocusAreas((p as { fatFocusAreas?: string[] }).fatFocusAreas || []);
      setPhysiqueGoal((p as { physiqueGoal?: string }).physiqueGoal || '');
      const migrated = migrateWorkoutLocation((p as { workoutLocation?: string }).workoutLocation);
      setWorkoutLocation(migrated.location);
      const storedNotes = (p as { equipmentNotes?: string }).equipmentNotes;
      setEquipmentNotes(typeof storedNotes === 'string' && storedNotes.trim() ? storedNotes : migrated.notes);
    }

    // Targets
    if (user.targets) {
      const t = user.targets;
      setDailyCalories(t.dailyCalories?.toString() || '');
      setDailyWater(t.dailyWater?.toString() || '');
      setProtein(t.protein?.toString() || '');
      setCarbs(t.carbs?.toString() || '');
      setFat(t.fat?.toString() || '');
      setDailySteps((t as { dailySteps?: number }).dailySteps?.toString() || '8000');
      setIdealDistance((t as { idealDistance?: number }).idealDistance?.toString() || '5');
    }

    // Preferences
    if (user.settings) {
      const s = user.settings;
      setUnits(s.units || 'metric');
      setAiEnabled(s.aiEnabled ?? true);
      setEmailRemindersEnabled(s.emailRemindersEnabled ?? true);
      setWaterNotif(s.notifications?.water ?? true);
      setMealNotif(s.notifications?.meals ?? true);
      setWeighInNotif(s.notifications?.weighIn ?? true);
      setWorkoutNotif(s.notifications?.workout ?? true);
      setSleepNotif(s.notifications?.sleep ?? true);
      const saved = s.recipientEmails?.length ? s.recipientEmails : (s.ccEmails?.length ? s.ccEmails : []);
      setRecipientEmails(Array.from(new Set(saved.map((e: string) => e.trim().toLowerCase()))));
      const resolvedTimezone = s.reminderSchedule?.timezone || user.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      setTimezone(resolvedTimezone);
      const savedWater = s.reminderSchedule?.water;
      const rawWaterFrequency = savedWater?.frequencyMinutes ?? s.reminderSchedule?.waterFrequencyMinutes;
      const parsedWaterFrequency = Number(rawWaterFrequency);
      setWaterReminderEnabled(savedWater?.enabled ?? (s.reminderSchedule?.waterHourlyEnabled ?? true));
      setWaterStartTime(savedWater?.startTime || '06:00');
      setWaterEndTime(savedWater?.endTime || '21:00');
      setWaterFrequencyMinutes((previousFrequency) =>
        Number.isFinite(parsedWaterFrequency) && parsedWaterFrequency >= 15 && parsedWaterFrequency <= 240
          ? parsedWaterFrequency
          : previousFrequency
      );
      setBreakfastTime(s.reminderSchedule?.mealTimes?.breakfast || '');
      setLunchTime(s.reminderSchedule?.mealTimes?.lunch || '');
      setDinnerTime(s.reminderSchedule?.mealTimes?.dinner || '');
      setSleepTime(s.reminderSchedule?.sleepTime || '');
      setWorkoutTime(s.reminderSchedule?.workoutTime || '');
      setWeighInTime(s.reminderSchedule?.weighInTime || '');
      setMascot(s.customizations?.mascot === 'kiki' ? 'kiki' : 'red-panda');
      const savedQuickAmounts = s.customizations?.water?.quickAmountsMl;
      const normalizedQuickAmounts = Array.isArray(savedQuickAmounts) && savedQuickAmounts.length === 4
        ? savedQuickAmounts
        : DEFAULT_WATER_QUICK_AMOUNTS;
      setCustomWaterAmounts(normalizedQuickAmounts.map((value) => String(value)));
      const savedDietaryPreference = s.foodPreferences?.dietaryPreference;
      const normalizedDietaryPreference: DietaryPreferenceValue =
        dietaryPreferenceOptions.some((option) => option.value === savedDietaryPreference)
          ? (savedDietaryPreference as DietaryPreferenceValue)
          : 'no_preference';
      setDietaryPreference(normalizedDietaryPreference);
      setAllergies(Array.isArray(s.foodPreferences?.allergies) ? s.foodPreferences.allergies.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : []);
      setAllergyDraft('');
      setFavoriteCuisines(Array.isArray(s.foodPreferences?.favoriteCuisines) ? s.foodPreferences.favoriteCuisines.filter((v): v is string => typeof v === 'string' && v.trim().length > 0) : []);
      setCuisineDraft('');
      setCookingSkill(s.foodPreferences?.cookingSkill === 'intermediate' || s.foodPreferences?.cookingSkill === 'confident' ? s.foodPreferences.cookingSkill : 'beginner');
      setMaxCookingMinutes(String(s.foodPreferences?.maxCookingMinutes ?? 30));
      const lsa = s.reminderSchedule?.lastSentAt ?? {};
      setLastSentAt({
        water: String(lsa.water ?? ''), breakfast: String(lsa.breakfast ?? ''),
        lunch: String(lsa.lunch ?? ''), dinner: String(lsa.dinner ?? ''),
        sleep: String(lsa.sleep ?? ''), workout: String(lsa.workout ?? ''),
        weighIn: String(lsa.weighIn ?? ''),
      });
      setEmailChecklist({
        smtpSaved: s.emailSetupChecklist?.smtpSaved ?? false,
        smtpTestSent: s.emailSetupChecklist?.smtpTestSent ?? false,
        imapSaved: s.emailSetupChecklist?.imapSaved ?? false,
        imapTestSent: s.emailSetupChecklist?.imapTestSent ?? false,
        recipientListSaved: s.emailSetupChecklist?.recipientListSaved ?? false,
        imapReplyVerifiedAt: s.emailSetupChecklist?.imapReplyVerifiedAt || '',
        lastUpdatedAt: s.emailSetupChecklist?.lastUpdatedAt || '',
      });
      if (s.emailSettings?.smtp) setSmtpUser(s.emailSettings.smtp.user ?? '');
      if (s.emailSettings?.imap) setImapUser(s.emailSettings.imap.user ?? '');
    }
    if (user.hasSmtp) setSmtpConfigured(true);
    if (user.hasImap) setImapConfigured(true);
  }, [user]);

  useEffect(() => () => { stopImapVerificationPolling(); }, []);

  // ── Load health data config when tab opens ─────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'health-data' || hdLoaded) return;
    void (async () => {
      const res = await api.getHealthDataConfig();
      if (res.success && res.data) {
        setHdEndpoint(res.data.endpoint || '');
        setHdHasApiKey(res.data.hasApiKey ?? false);
        setHdEnabled(res.data.enabled ?? false);
        setHdInterval(res.data.syncIntervalMinutes ?? 60);
        setHdLastSyncAt(res.data.lastSyncAt ?? null);
        setHdLastSyncSource(res.data.lastSyncSource ?? '');
        setHdLastStatus(res.data.lastSyncStatus || '');
        setHdLastError(res.data.lastSyncError || '');
      }
      setHdLoaded(true);
    })();
  }, [activeTab, hdLoaded]);

  useEffect(() => {
    const shouldPoll = emailChecklist.imapTestSent && !emailChecklist.imapReplyVerifiedAt;
    if (shouldPoll) void startImapVerificationPolling(false, emailChecklist.lastUpdatedAt || undefined);
    else stopImapVerificationPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailChecklist.imapTestSent, emailChecklist.imapReplyVerifiedAt, emailChecklist.lastUpdatedAt]);

  // ── IMAP polling helpers ───────────────────────────────────────────────────
  const stopImapVerificationPolling = () => {
    if (imapPollingIntervalRef.current) { clearInterval(imapPollingIntervalRef.current); imapPollingIntervalRef.current = null; }
    imapPollingStartedAtRef.current = null;
    imapPollingInFlightRef.current = false;
  };

  const checkImapVerificationNow = async () => {
    if (imapPollingInFlightRef.current) return false;
    imapPollingInFlightRef.current = true;
    const res = await api.verifyImapTestReply();
    imapPollingInFlightRef.current = false;
    if (!res.success) return false;
    if (res.data?.verified) {
      const verifiedAt = res.data.verifiedAt || new Date().toISOString();
      setEmailChecklist((prev) => ({ ...prev, imapReplyVerifiedAt: verifiedAt, imapTestSent: true }));
      if (!hasShownImapVerifiedToastRef.current) {
        showToast('IMAP verification complete. Reply processing is working.', 'success');
        hasShownImapVerifiedToastRef.current = true;
      }
      stopImapVerificationPolling();
      refetch();
      return true;
    }
    return false;
  };

  const startImapVerificationPolling = async (forceRestart = false, startedAtIso?: string) => {
    if (imapPollingIntervalRef.current && !forceRestart) return;
    stopImapVerificationPolling();
    hasShownImapVerifiedToastRef.current = false;
    const ms = startedAtIso ? new Date(startedAtIso).getTime() : Date.now();
    imapPollingStartedAtRef.current = Number.isNaN(ms) ? Date.now() : ms;
    const found = await checkImapVerificationNow();
    if (found) return;
    imapPollingIntervalRef.current = setInterval(async () => {
      const f = await checkImapVerificationNow();
      if (f) return;
      if (Date.now() - (imapPollingStartedAtRef.current ?? Date.now()) >= 10 * 60 * 1000)
        stopImapVerificationPolling();
    }, 60_000);
  };

  // ── Profile save ───────────────────────────────────────────────────────────
  const saveProfile = async () => {
    setSaving(true);
    try {
      if (username.trim()) {
        const un = username.trim().toLowerCase().replace(/\s+/g, '_');
        if (un.length < 3) { showToast('Username must be at least 3 characters', 'error'); return; }
        if (!/^[a-z0-9_]+$/.test(un)) { showToast('Username can only contain letters, numbers, and underscores', 'error'); return; }
      }
      const profilePayload: Record<string, unknown> = {
        name, gender, height: parseFloat(height), weight: parseFloat(weight),
        activityLevel, goal, targetWeight: parseFloat(targetWeight),
        ...(bodyType ? { bodyType } : {}),
        ...(bodyFat && !isNaN(parseFloat(bodyFat)) ? { bodyFat: parseFloat(bodyFat) } : {}),
        fatFocusAreas,
        ...(physiqueGoal ? { physiqueGoal } : {}),
        ...(workoutLocation ? { workoutLocation } : {}),
        equipmentNotes: equipmentNotes.trim().slice(0, 500),
      };
      if (dateOfBirth) profilePayload.dateOfBirth = dateOfBirth;
      else if (age) profilePayload.age = parseInt(age, 10);
      const normalizedUsername = username.trim() ? username.trim().toLowerCase().replace(/\s+/g, '_') : undefined;
      const profileRes = await api.updateUser({ profile: profilePayload, ...(normalizedUsername && { username: normalizedUsername }) });
      if (!profileRes.success) {
        showToast(profileRes.error || 'Failed to save', 'error');
        return;
      }

      // Food preferences live on the Customizations tab now (see saveCustomizations).
      showToast('Profile updated', 'success');
      const updated = profileRes.data as { username?: string } | undefined;
      if (updated?.username) setUsername(updated.username);
      await refetch();
    } catch { showToast('Failed to save profile', 'error'); }
    finally { setSaving(false); }
  };

  // ── Targets save ───────────────────────────────────────────────────────────
  const saveTargets = async () => {
    setTargetsSaving(true);
    try {
      const res = await api.updateTargets({
        dailyCalories: parseInt(dailyCalories), dailyWater: parseInt(dailyWater),
        protein: parseInt(protein), carbs: parseInt(carbs), fat: parseInt(fat),
        dailySteps: parseInt(dailySteps) || 8000,
        idealDistance: parseFloat(idealDistance) || 5,
      });
      if (res.success) { showToast('Targets updated', 'success'); refetch(); }
      else showToast(res.error || 'Failed to save', 'error');
    } catch { showToast('Failed to save targets', 'error'); }
    finally { setTargetsSaving(false); }
  };

  const recalculateTargetsFromProfile = async () => {
    setRecalculatingTargets(true);
    try {
      const res = await api.recalculateTargets();
      if (res.success && res.data) {
        showToast('Targets recalculated from your profile', 'success');
        await refetch();
        const t = (res.data as { targets?: Record<string, number> })?.targets;
        if (t) {
          setDailyCalories(String(t.dailyCalories ?? ''));
          setDailyWater(String(t.dailyWater ?? ''));
          setProtein(String(t.protein ?? ''));
          setCarbs(String(t.carbs ?? ''));
          setFat(String(t.fat ?? ''));
          if (t.dailySteps) setDailySteps(String(t.dailySteps));
          if (t.idealDistance) setIdealDistance(String(t.idealDistance));
        }
      } else showToast(res.error || 'Failed to recalculate', 'error');
    } catch { showToast('Failed to recalculate targets', 'error'); }
    finally { setRecalculatingTargets(false); }
  };

  const regenerateHealthPlan = async () => {
    setRegeneratingPlan(true);
    try {
      const res = await api.generateHealthPlan();
      if (res.success && res.data) {
        showToast('Health plan updated', 'success');
        refetch();
        const data = res.data as { explanations?: Record<string, string> };
        if (data.explanations && Object.keys(data.explanations).length > 0) {
          const first = Object.entries(data.explanations)[0];
          showToast(first[1], 'info');
        }
      } else showToast(res.error || 'Failed to generate health plan', 'error');
    } catch { showToast('Failed to generate health plan', 'error'); }
    finally { setRegeneratingPlan(false); }
  };

  // ── Customizations save ────────────────────────────────────────────────────
  const saveCustomizations = async () => {
    const parsedAmounts = customWaterAmounts.map((value) => Number(value));
    const invalidAmount = parsedAmounts.some((value) =>
      !Number.isInteger(value) || value < 1 || value > MAX_CUSTOM_WATER_GLASS_ML
    );
    if (invalidAmount) {
      showToast(`Each water amount must be a whole number between 1 and ${MAX_CUSTOM_WATER_GLASS_ML} ml`, 'error');
      return;
    }

    // Fold any unsaved draft text in the allergies input into the chip list.
    const pendingDraft = allergyDraft.trim();
    const merged = pendingDraft
      ? [...allergies, ...pendingDraft.split(/[\n,]/).map((s) => s.trim()).filter(Boolean)]
      : allergies;
    const dedupedAllergies = Array.from(new Set(merged.map((s) => s.trim()).filter(Boolean)));
    const pendingCuisineDraft = cuisineDraft.trim();
    const mergedCuisines = pendingCuisineDraft
      ? [...favoriteCuisines, ...pendingCuisineDraft.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)]
      : favoriteCuisines;
    const dedupedCuisines = Array.from(new Set(mergedCuisines.map((s) => s.trim()).filter(Boolean)));
    const parsedMaxCookingMinutes = Number(maxCookingMinutes);
    if (!Number.isInteger(parsedMaxCookingMinutes) || parsedMaxCookingMinutes < 5 || parsedMaxCookingMinutes > 180) {
      showToast('Maximum cooking time must be a whole number between 5 and 180 minutes', 'error');
      return;
    }

    setCustomizationsSaving(true);
    try {
      const res = await api.updateSettings({
        units,
        customizations: {
          water: { quickAmountsMl: parsedAmounts },
          mascot,
        },
        foodPreferences: {
          dietaryPreference,
          allergies: dedupedAllergies,
          favoriteCuisines: dedupedCuisines,
          cookingSkill,
          maxCookingMinutes: parsedMaxCookingMinutes,
        },
      });
      if (res.success) {
        if (pendingDraft) setAllergyDraft('');
        if (pendingCuisineDraft) setCuisineDraft('');
        showToast('Customizations saved', 'success');
        await refetch();
      } else {
        showToast(res.error || 'Failed to save customizations', 'error');
      }
    } catch {
      showToast('Failed to save customizations', 'error');
    } finally {
      setCustomizationsSaving(false);
    }
  };

  const resetFoodPreferences = () => {
    setDietaryPreference('no_preference');
    setAllergies([]);
    setAllergyDraft('');
    setFavoriteCuisines([]);
    setCuisineDraft('');
    setCookingSkill('beginner');
    setMaxCookingMinutes('30');
  };

  // ── API Keys save ──────────────────────────────────────────────────────────
  const saveApiKeys = async () => {
    setApiKeysSaving(true);
    try {
      const keys: Record<string, string> = {};
      if (openaiKey) keys.openai = openaiKey;
      if (fdcKey) keys.fdcApiKey = fdcKey;
      if (Object.keys(keys).length === 0) { showToast('No keys to save', 'info'); return; }
      const res = await api.saveApiKeys(keys);
      if (res.success) {
        showToast('API keys saved securely', 'success');
        setOpenaiKey(''); setFdcKey(''); refetch();
      } else showToast(res.error || 'Failed to save keys', 'error');
    } catch { showToast('Failed to save API keys', 'error'); }
    finally { setApiKeysSaving(false); }
  };

  const toggleAiEnabled = async () => {
    const nextValue = !aiEnabled;
    setAiEnabled(nextValue);
    setAiSaving(true);
    try {
      const res = await api.updateSettings({ aiEnabled: nextValue });
      if (res.success) {
        showToast(nextValue ? 'AI features enabled' : 'AI features disabled across ArogyaMandiram', 'success');
        await refetch();
      } else {
        setAiEnabled(!nextValue);
        showToast(res.error || 'Failed to update AI setting', 'error');
      }
    } catch {
      setAiEnabled(!nextValue);
      showToast('Failed to update AI setting', 'error');
    } finally {
      setAiSaving(false);
    }
  };

  const toggleEmailReminders = async () => {
    const nextValue = !emailRemindersEnabled;
    setEmailRemindersEnabled(nextValue);
    setEmailRemindersSaving(true);
    try {
      const res = await api.updateSettings({ emailRemindersEnabled: nextValue });
      if (res.success) {
        showToast(nextValue ? 'Email reminders turned on' : 'All reminder emails stopped', 'success');
        await refetch();
      } else {
        setEmailRemindersEnabled(!nextValue);
        showToast(res.error || 'Failed to update email reminders', 'error');
      }
    } catch {
      setEmailRemindersEnabled(!nextValue);
      showToast('Failed to update email reminders', 'error');
    } finally {
      setEmailRemindersSaving(false);
    }
  };

  // ── Preferences save ───────────────────────────────────────────────────────
  const savePreferences = async () => {
    setPrefSaving(true);
    try {
      const toMinutes = (timeValue: string) => {
        const [h, m] = timeValue.split(':').map((v) => parseInt(v, 10));
        if (Number.isNaN(h) || Number.isNaN(m)) return null;
        return h * 60 + m;
      };
      const startMinutes = toMinutes(waterStartTime);
      const endMinutes = toMinutes(waterEndTime);
      if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
        showToast('Water reminder start time must be before end time', 'error');
        return;
      }

      const res = await api.updateSettings({
        units,
        notifications: { water: waterNotif, meals: mealNotif, weighIn: weighInNotif, workout: workoutNotif, sleep: sleepNotif },
        reminderSchedule: {
          timezone,
          // Keep legacy flat frequency key for backward compatibility during migration.
          waterFrequencyMinutes,
          water: {
            enabled: waterReminderEnabled,
            startTime: waterStartTime,
            endTime: waterEndTime,
            frequencyMinutes: waterFrequencyMinutes,
          },
          mealTimes: { breakfast: breakfastTime, lunch: lunchTime, dinner: dinnerTime },
          sleepTime,
          workoutTime,
          weighInTime,
        },
      });
      if (res.success) {
        const updatedReminderSchedule = (res.data as { settings?: { reminderSchedule?: Record<string, unknown> } } | undefined)?.settings?.reminderSchedule;
        const updatedWater = updatedReminderSchedule?.water as Record<string, unknown> | undefined;
        const updatedRawFrequency = updatedWater?.frequencyMinutes ?? updatedReminderSchedule?.waterFrequencyMinutes;
        const updatedParsedFrequency = Number(updatedRawFrequency);
        if (Number.isFinite(updatedParsedFrequency) && updatedParsedFrequency >= 15 && updatedParsedFrequency <= 240) {
          setWaterFrequencyMinutes(updatedParsedFrequency);
        }
        showToast('Preferences saved', 'success');
        refetch();
      }
      else showToast(res.error || 'Failed to save', 'error');
    } catch { showToast('Failed to save preferences', 'error'); }
    finally { setPrefSaving(false); }
  };

  // ── Connector save & sync ──────────────────────────────────────────────────
  const saveHealthDataConfig = async () => {
    if (!hdEndpoint.trim()) {
      showToast('Enter the connector endpoint URL first', 'error');
      return;
    }
    if (!hdApiKey.trim() && !hdHasApiKey) {
      showToast('Enter the connector API token first', 'error');
      return;
    }

    setHdSaving(true);
    try {
      const res = await api.saveHealthDataConfig({
        endpoint: hdEndpoint.trim(),
        ...(hdApiKey ? { apiKey: hdApiKey } : {}),
        enabled: hdEnabled,
        syncIntervalMinutes: hdInterval,
      });
      if (res.success) {
        showToast('Mobile app connector saved', 'success');
        setHdApiKey('');
        if (hdApiKey) setHdHasApiKey(true);
        setHdLoaded(false);
      } else {
        showToast(res.error || 'Failed to save', 'error');
      }
    } catch { showToast('Failed to save mobile app connector', 'error'); }
    finally { setHdSaving(false); }
  };

  const triggerHealthSync = async () => {
    if (!hdEndpoint.trim()) { showToast('Enter an endpoint URL first', 'error'); return; }
    setHdSyncing(true);
    const requestedAt = new Date().toISOString();
    try {
      const res = await api.triggerHealthDataSync({ source: 'manual' });
      if (res.success && res.data) {
        const { schema, rowCount, syncActions } = res.data;
        setHdLastSyncAt(new Date().toISOString());
        setHdLastSyncSource('manual');
        setHdLastStatus('ok');
        setHdLastError('');
        showToast(`Synced ${rowCount} row${rowCount !== 1 ? 's' : ''} successfully`, 'success');
        if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
          fetch('/api/debug-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              page: 'health-data',
              agent: 'sync',
              log: {
                userRequest: { endpoint: hdEndpoint, requestedAt },
                syncResult: { schema, rowCount, syncActions },
                metadata: {
                  timestamp: new Date().toISOString(),
                  status: 'success',
                },
              },
            }),
          }).catch(() => {});
        }
      } else {
        setHdLastSyncSource('manual');
        setHdLastStatus('error');
        setHdLastError(res.error || 'Unknown error');
        showToast(res.error || 'Sync failed', 'error');
        if (process.env.NEXT_PUBLIC_DEBUG_MODE === 'true') {
          fetch('/api/debug-logs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              page: 'health-data',
              agent: 'sync',
              log: {
                userRequest: { endpoint: hdEndpoint, requestedAt },
                syncResult: null,
                metadata: {
                  timestamp: new Date().toISOString(),
                  status: 'error',
                  error: res.error || 'Unknown error',
                },
              },
            }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Sync failed';
      setHdLastSyncSource('manual');
      setHdLastStatus('error');
      setHdLastError(msg);
      showToast(msg, 'error');
    }
    finally { setHdSyncing(false); }
  };

  function addRecipientEmail() {
    const email = recipientInput.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (recipientEmails.includes(email)) { setRecipientInput(''); return; }
    setRecipientEmails([...recipientEmails, email]);
    setRecipientInput('');
  }

  const saveRecipientEmails = async () => {
    setSavingRecipients(true);
    try {
      const res = await api.updateSettings({ recipientEmails });
      if (res.success) {
        showToast('Recipients saved', 'success');
        setEmailChecklist((prev) => ({ ...prev, recipientListSaved: true }));
        refetch();
      } else showToast(res.error || 'Failed to save', 'error');
    } catch { showToast('Failed to save recipients', 'error'); }
    finally { setSavingRecipients(false); }
  };

  const sendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const saveRes = await api.updateSettings({ recipientEmails });
      if (!saveRes.success) { showToast(saveRes.error || 'Failed to save recipients', 'error'); return; }
      const testRes = await api.sendEmailTest('smtp_test');
      if (testRes.success) {
        setEmailChecklist((prev) => ({ ...prev, smtpTestSent: true, recipientListSaved: true }));
        showToast('SMTP test email sent. Check all recipients.', 'success');
        refetch();
      } else showToast(testRes.error || 'Failed to send test email', 'error');
    } catch { showToast('Failed to send test email', 'error'); }
    finally { setSendingTestEmail(false); }
  };

  const saveSmtpSettings = async () => {
    setSavingSmtp(true);
    try {
      const smtp: Record<string, unknown> = { user: smtpUser };
      if (smtpPass) smtp.pass = smtpPass;
      const res = await api.saveEmailSettings({ smtp });
      if (res.success) {
        const smtpTestSent = Boolean((res.data as { emailTest?: { smtpTestSent?: boolean } })?.emailTest?.smtpTestSent);
        const testError = (res.data as { emailTest?: { error?: string } })?.emailTest?.error;
        setEmailChecklist((prev) => ({ ...prev, smtpSaved: true, smtpTestSent }));
        if (testError) showToast(testError, 'error');
        else showToast(res.message || 'SMTP settings saved and test email sent', 'success');
        setSmtpPass(''); setSmtpConfigured(true); refetch();
      } else showToast(res.error || 'Failed to save SMTP', 'error');
    } catch { showToast('Failed to save SMTP settings', 'error'); }
    finally { setSavingSmtp(false); }
  };

  const saveImapSettings = async () => {
    setSavingImap(true);
    try {
      const imap: Record<string, unknown> = { user: imapUser };
      if (imapPass) imap.pass = imapPass;
      const res = await api.saveEmailSettings({ imap });
      if (res.success) {
        const imapTestSent = Boolean((res.data as { emailTest?: { imapTestSent?: boolean } })?.emailTest?.imapTestSent);
        const testError = (res.data as { emailTest?: { error?: string } })?.emailTest?.error;
        setEmailChecklist((prev) => ({ ...prev, imapSaved: true, imapTestSent }));
        if (testError) showToast(testError, 'error');
        else showToast(res.message || 'IMAP settings saved and test email sent', 'success');
        setImapPass(''); setImapConfigured(true); refetch();
        if (imapTestSent) {
          const startedAt = new Date().toISOString();
          setEmailChecklist((prev) => ({ ...prev, lastUpdatedAt: startedAt }));
          await startImapVerificationPolling(true, startedAt);
        }
      } else showToast(res.error || 'Failed to save IMAP', 'error');
    } catch { showToast('Failed to save IMAP settings', 'error'); }
    finally { setSavingImap(false); }
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  function formatLastSent(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dStr = d.toLocaleDateString('en-CA');
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    if (dStr === todayStr) return `Today at ${time}`;
    if (dStr === yesterday.toLocaleDateString('en-CA')) return `Yesterday at ${time}`;
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${time}`;
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex gap-6">
        <div className="hidden w-52 shrink-0 lg:block">
          <CardSkeleton className="h-64" />
        </div>
        <div className="flex-1 space-y-4">
          <CardSkeleton className="h-48" />
          <CardSkeleton className="h-64" />
          <CardSkeleton className="h-48" />
        </div>
      </div>
    );
  }

  const formulaTargets = user ? getTargetsForUser(user) : null;
  const openAiActive = !!user?.hasOpenAiKey;
  const fdcActive = !!user?.hasFdcKey;
  const hasSmtp = smtpConfigured || (user?.hasSmtp ?? false);
  const hasImap = imapConfigured || (user?.hasImap ?? false);
  const connectorConfigured = Boolean(hdEndpoint.trim()) && hdHasApiKey;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6 lg:items-start lg:min-h-0">

      {/* ── Left nav - desktop ── */}
      <aside className="hidden lg:block lg:w-52 lg:shrink-0 lg:sticky lg:top-0 lg:self-start" style={{ maxHeight: 'calc(100vh - 10rem)' }}>
        <div className="glass-card rounded-2xl p-2 overflow-y-auto" style={{ maxHeight: 'inherit' }}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-all',
                activeTab === item.key
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
              )}
            >
              <item.icon className={cn('h-4 w-4 shrink-0', activeTab === item.key ? 'text-emerald-400' : 'text-zinc-500')} />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{item.label}</p>
                <p className="mt-0.5 truncate text-[10px] opacity-60">{item.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Top tab bar - mobile ── */}
      <div className="flex overflow-x-auto gap-2 pb-1 lg:hidden">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveTab(item.key)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === item.key
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : 'border-transparent bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div className="min-w-0 flex-1 min-h-0 space-y-4 pb-10">

        {/* ══════ PROFILE ══════ */}
        {activeTab === 'profile' && (
          <>
            {/* Personal */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base font-semibold text-text-primary">Personal</h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-text-muted">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. john_doe" minLength={3} maxLength={30}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                  <p className="mt-1 text-xs text-zinc-400">Letters, numbers, underscores only.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Date of birth</label>
                  <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="glass-input date-input mt-1 w-full rounded-xl px-3 py-2 text-left text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                  {dateOfBirth && (
                    <p className="mt-1 text-xs text-zinc-400">Age: {(() => {
                      const birth = new Date(dateOfBirth); const today = new Date();
                      let a = today.getFullYear() - birth.getFullYear();
                      const m = today.getMonth() - birth.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a -= 1;
                      return a;
                    })()} years</p>
                  )}
                </div>
                {!dateOfBirth && (
                  <div>
                    <label className="text-xs font-medium text-text-muted">Age (if no birth date)</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min={10} max={120} placeholder="25"
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-text-muted">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Body metrics */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-accent-cyan" />
                <h2 className="text-base font-semibold text-text-primary">Body metrics</h2>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                {[
                  { label: 'Height (cm)', value: height, set: setHeight },
                  { label: 'Current Weight (kg)', value: weight, set: setWeight, step: 0.1 },
                  { label: 'Target Weight (kg)', value: targetWeight, set: setTargetWeight, step: 0.1 },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-xs font-medium text-text-muted">{f.label}</label>
                    <input type="number" value={f.value} onChange={(e) => f.set(e.target.value)} step={f.step ?? 1}
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-accent-rose" />
                <h2 className="text-base font-semibold text-text-primary">Activity level</h2>
              </div>
              <p className="mt-1 text-xs text-text-muted">Auto-detected from your last completed week (Mon-Sun).</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {activityLevels.map((al) => (
                  <div key={al.value}
                    className={cn('rounded-2xl border px-3 py-3 text-left text-xs transition-all',
                      activityLevel === al.value ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400')}>
                    <p className={cn('font-semibold', activityLevel === al.value ? 'text-emerald-400' : 'text-zinc-200')}>{al.label}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">{al.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <button onClick={saveProfile} disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50">
                {saving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" /> : <Save className="h-4 w-4" />}
                Save Profile
              </button>
            </div>
          </>
        )}

        {/* ══════ BODY COMPOSITION ══════ */}
        {activeTab === 'body' && (
          <>
            {/* Goal - user-owned; drives calorie/macro targets and AI plans */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-accent-emerald" />
                  <h2 className="text-base font-semibold text-text-primary">Goal</h2>
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">Your call - Ciel adapts plans and targets to the goal you pick.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {GOAL_OPTIONS.map((g) => (
                  <button key={g.value} type="button" onClick={() => setGoal(g.value)}
                    className={cn('rounded-2xl border px-4 py-3 text-left text-xs transition-all',
                      goal === g.value ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700')}>
                    <p className={cn('font-semibold', goal === g.value ? 'text-emerald-400' : 'text-zinc-200')}>{g.label}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-400">{g.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Body Type */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <PersonStanding className="h-4 w-4 text-accent-cyan" />
                  <h2 className="text-base font-semibold text-text-primary">Body Shape</h2>
                </div>
                <button onClick={saveProfile} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">Choose visually.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {bodyTypeOptions.map((bt) => (
                  <button key={bt.value} type="button" onClick={() => setBodyType(bt.value)}
                    className={cn('overflow-hidden rounded-2xl border text-left text-xs transition-all',
                      bodyType === bt.value ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700')}>
                    <div className="p-2">
                      <Image
                        src={bt.image}
                        alt={bt.label}
                        width={1024}
                        height={683}
                        className="h-40 w-full rounded-lg bg-white object-contain"
                      />
                    </div>
                    <p className={cn('px-3 py-2 font-semibold text-sm', bodyType === bt.value ? 'text-emerald-400' : 'text-zinc-200')}>{bt.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Body Fat */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-text-primary">Body Fat %</h2>
                <button onClick={saveProfile} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">Not sure of exact %? Pick the closest visual range first, then fine-tune if needed.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {bodyFatGuides.map((guide) => {
                  const selected = Number(bodyFat) === guide.value;
                  return (
                    <button
                      key={guide.label}
                      type="button"
                      onClick={() => setBodyFat(String(guide.value))}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left text-xs transition-all',
                        selected
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className={cn('text-sm font-semibold', selected ? 'text-emerald-400' : 'text-zinc-200')}>{guide.label}</p>
                        <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">{guide.range}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">{guide.clue}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                <label className="text-xs font-medium text-text-muted">Exact body fat % (optional)</label>
                <input type="number" value={bodyFat} onChange={(e) => setBodyFat(e.target.value)}
                  placeholder="e.g. 18" min={1} max={60}
                  className="glass-input mt-1 w-40 rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
              </div>
            </div>

            {/* Fat focus areas */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-text-primary">Where do you carry more fat?</h2>
                <button onClick={saveProfile} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">Used to personalise your workout target zones.</p>
              <FatAreaInput value={fatFocusAreas} onChange={setFatFocusAreas} />
            </div>

            {/* Physique goal */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-text-primary">Body target</h2>
                <button onClick={saveProfile} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">Pick the body you want. We&apos;ll plan workouts that fit.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {physiqueGoalOptions.map((opt) => {
                  const selected = physiqueGoal === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPhysiqueGoal(selected ? '' : opt.value)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left text-xs transition-all',
                        selected
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                      )}
                    >
                      <p className={cn('text-sm font-semibold', selected ? 'text-emerald-400' : 'text-zinc-200')}>{opt.label}</p>
                      <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">{opt.clue}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workout location */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-semibold text-text-primary">Where do you work out?</h2>
                <button onClick={saveProfile} disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">Drives the equipment we assume you have when picking exercises.</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {workoutLocationOptions.map((opt) => {
                  const selected = workoutLocation === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setWorkoutLocation(selected ? '' : opt.value)}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-left text-xs transition-all',
                        selected
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                      )}
                    >
                      <p className={cn('text-sm font-semibold', selected ? 'text-emerald-400' : 'text-zinc-200')}>{opt.label}</p>
                      <p className="mt-1 text-[11px] text-zinc-400 leading-relaxed">{opt.clue}</p>
                    </button>
                  );
                })}
              </div>

              {workoutLocation && (
                <div className="mt-5 border-t border-zinc-800 pt-5">
                  <p className="text-sm font-semibold text-text-primary">Equipment notes</p>
                  <p className="mt-1 text-xs text-text-muted">Tell us what gear you&apos;ve got or what&apos;s missing. We&apos;ll skip exercises you can&apos;t actually do.</p>
                  <textarea
                    value={equipmentNotes}
                    onChange={(e) => setEquipmentNotes(e.target.value.slice(0, 500))}
                    placeholder={equipmentNotesPlaceholder[workoutLocation] ?? 'Anything we should know about your gear?'}
                    rows={3}
                    className="input-no-focus-ring mt-3 w-full resize-y rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600"
                  />
                  <p className="mt-1 text-right text-[10px] text-zinc-500">{equipmentNotes.length}/500</p>
                </div>
              )}
            </div>

            {/* Fitness Level */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-base font-semibold text-text-primary">Fitness Level</h2>
              <p className="mt-1 text-xs text-text-muted">Auto-detected from your last 14 days of workout logs.</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm capitalize text-zinc-300 font-medium">
                  {(user?.profile as { fitnessLevelDerived?: string } | undefined)?.fitnessLevelDerived ?? 'Not yet detected'}
                </span>
                <span className="text-xs text-zinc-500">Updates automatically</span>
              </div>
            </div>

          </>
        )}

        {/* ══════ TARGETS ══════ */}
        {activeTab === 'targets' && (
          <>
            {/* Daily targets */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-base font-semibold text-text-primary">Daily targets</h2>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={recalculateTargetsFromProfile} disabled={recalculatingTargets}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                    {recalculatingTargets ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Recalculate
                  </button>
                  {user?.hasOpenAiKey && (
                    <button type="button" onClick={regenerateHealthPlan} disabled={regeneratingPlan}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-accent-violet/40 bg-accent-violet/10 px-2.5 py-1 text-xs text-accent-violet hover:bg-accent-violet/20 transition-colors disabled:opacity-50">
                      {regeneratingPlan ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      Regenerate plan
                    </button>
                  )}
                  <button onClick={saveTargets} disabled={targetsSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                    {targetsSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save Targets
                  </button>
                </div>
              </div>
              <p className="mt-1 text-xs text-text-muted">These values are used across your dashboard and trackers.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Daily Calories (kcal)', value: dailyCalories, set: setDailyCalories },
                  { label: 'Daily Water (ml)', value: dailyWater, set: setDailyWater },
                  { label: 'Protein (g)', value: protein, set: setProtein },
                  { label: 'Carbs (g)', value: carbs, set: setCarbs },
                  { label: 'Fat (g)', value: fat, set: setFat },
                  { label: 'Daily Steps', value: dailySteps, set: setDailySteps },
                  { label: 'Distance / day (km)', value: idealDistance, set: setIdealDistance, step: '0.1' },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="text-xs font-medium text-text-muted">{f.label}</label>
                    <input type="number" step={f.step} value={f.value} onChange={(e) => f.set(e.target.value)}
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                  </div>
                ))}
              </div>

              {protein && carbs && fat && (
                <div className="mt-5 rounded-2xl bg-white/[0.02] p-4">
                  <p className="text-xs font-semibold text-text-primary">Macro split</p>
                  <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-white/[0.04]">
                    {(() => {
                      const total = (parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9;
                      const pPct = total > 0 ? (((parseInt(protein) || 0) * 4) / total) * 100 : 33;
                      const cPct = total > 0 ? (((parseInt(carbs) || 0) * 4) / total) * 100 : 33;
                      const fPct = total > 0 ? (((parseInt(fat) || 0) * 9) / total) * 100 : 34;
                      return (<>
                        <div className="bg-accent-violet" style={{ width: `${pPct}%` }} />
                        <div className="bg-accent-amber" style={{ width: `${cPct}%` }} />
                        <div className="bg-accent-rose" style={{ width: `${fPct}%` }} />
                      </>);
                    })()}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-text-muted">
                    <span className="text-accent-violet">Protein {Math.round((((parseInt(protein) || 0) * 4) / ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)) * 100 || 0)}%</span>
                    <span className="text-accent-amber">Carbs {Math.round((((parseInt(carbs) || 0) * 4) / ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)) * 100 || 0)}%</span>
                    <span className="text-accent-rose">Fat {Math.round((((parseInt(fat) || 0) * 9) / ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9)) * 100 || 0)}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* From your profile (formula-based) */}
            {formulaTargets && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent-amber" />
                  <h2 className="text-base font-semibold text-text-primary">From your profile (formula-based)</h2>
                </div>
                <p className="mt-1 text-xs text-text-muted">Reference values calculated from your current profile.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    { label: 'Ideal weight', value: `${formulaTargets.idealWeight} kg` },
                    { label: 'Workout (min/day)', value: String(formulaTargets.dailyWorkoutMinutes) },
                    { label: 'Calorie burn', value: `${formulaTargets.dailyCalorieBurn} kcal` },
                    { label: 'Sleep target', value: `${formulaTargets.sleepHours} h` },
                    { label: 'Daily steps', value: `${(formulaTargets.dailySteps ?? 8000).toLocaleString()}` },
                    { label: 'Distance / day', value: `${formulaTargets.idealDistance ?? 5} km` },
                  ].map((r) => (
                    <div key={r.label} className="rounded-xl bg-white/[0.03] p-3">
                      <span className="text-xs text-text-muted">{r.label}</span>
                      <p className="mt-1 font-semibold text-text-primary">{r.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>
        )}

        {/* ══════ CUSTOMIZATIONS ══════ */}
        {activeTab === 'customizations' && (
          <>
            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg',
                    aiEnabled ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-zinc-800 text-zinc-400'
                  )}>
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">Use AI here</h2>
                    <p className="mt-1 text-xs text-text-muted">
                      {aiEnabled
                        ? 'AI logging, Ciel plans, insights, and auto-generation can run.'
                        : 'Nothing AI-related will run anywhere in ArogyaMandiram.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aiEnabled}
                  onClick={toggleAiEnabled}
                  disabled={aiSaving}
                  className={cn(
                    'flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors disabled:opacity-60',
                    aiEnabled ? 'justify-end border-accent-emerald/50 bg-accent-emerald/80' : 'justify-start border-zinc-700 bg-zinc-800'
                  )}
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  <span className="sr-only">{aiEnabled ? 'Disable AI features' : 'Enable AI features'}</span>
                </button>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg',
                    emailRemindersEnabled ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-zinc-800 text-zinc-400'
                  )}>
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-text-primary">Email reminders</h2>
                    <p className="mt-1 text-xs text-text-muted">
                      {emailRemindersEnabled
                        ? 'Water, meal, workout, sleep and weigh-in reminder emails can be sent.'
                        : 'All reminder emails are stopped. Nothing will land in your inbox.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={emailRemindersEnabled}
                  onClick={toggleEmailReminders}
                  disabled={emailRemindersSaving}
                  className={cn(
                    'flex h-7 w-12 shrink-0 items-center rounded-full border p-0.5 transition-colors disabled:opacity-60',
                    emailRemindersEnabled ? 'justify-end border-accent-emerald/50 bg-accent-emerald/80' : 'justify-start border-zinc-700 bg-zinc-800'
                  )}
                >
                  <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  <span className="sr-only">{emailRemindersEnabled ? 'Stop all reminder emails' : 'Enable reminder emails'}</span>
                </button>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-accent-cyan" />
                  <h2 className="text-base font-semibold text-text-primary">Water tracker</h2>
                </div>
                <button onClick={saveCustomizations} disabled={customizationsSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {customizationsSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">Edit the four quick-add water buttons used on the Water page.</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {customWaterAmounts.map((amount, index) => (
                  <div key={index}>
                    <label className="text-xs font-medium text-text-muted">Quick add {index + 1} (ml)</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setCustomWaterAmounts((prev) => prev.map((item, itemIndex) => itemIndex === index ? e.target.value : item))}
                      min={1}
                      max={MAX_CUSTOM_WATER_GLASS_ML}
                      placeholder={`e.g. ${DEFAULT_WATER_QUICK_AMOUNTS[index]}`}
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Food preferences */}
            <div className="glass-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-emerald-400" />
                    <h2 className="text-base font-semibold text-text-primary">Food preferences</h2>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-text-muted">Help Ciel recommend meals and write recipes you&apos;ll actually enjoy.</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto">
                  <button type="button" onClick={resetFoodPreferences} disabled={customizationsSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-zinc-200 disabled:opacity-50">
                    <RotateCcw className="h-3 w-3" /> Reset
                  </button>
                  <button type="button" onClick={saveCustomizations} disabled={customizationsSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50">
                    {customizationsSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">What do you eat?</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                  {dietaryPreferenceOptions.map((option) => {
                    const selected = dietaryPreference === option.value;
                    return (
                      <button key={option.value} type="button" aria-pressed={selected} onClick={() => setDietaryPreference(option.value)}
                        className={cn(
                          'min-h-[70px] rounded-xl border p-2.5 text-left transition-colors',
                          selected
                            ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                            : 'border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                        )}>
                        <span className="text-base" aria-hidden="true">{option.icon}</span>
                        <span className="mt-0.5 block text-xs font-semibold">{option.label}</span>
                        <span className="mt-0.5 block text-[10px] leading-tight text-zinc-500">{option.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Allergies &amp; foods to avoid</label>
                <p className="mt-1 text-xs text-zinc-500">Ciel will leave these out of generated meal plans.</p>
                <input type="text" value={allergyDraft} onChange={(e) => setAllergyDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      const parts = allergyDraft.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
                      if (parts.length > 0) {
                        setAllergies((prev) => Array.from(new Set([...prev, ...parts])));
                        setAllergyDraft('');
                      }
                    } else if (e.key === 'Backspace' && allergyDraft === '' && allergies.length > 0) {
                      setAllergies((prev) => prev.slice(0, -1));
                    }
                  }}
                  placeholder="Type a food or allergy, then press Enter"
                  className="glass-input mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                {allergies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {allergies.map((tag, idx) => (
                      <span key={`${tag}-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 py-1 pl-2.5 pr-1 text-xs text-zinc-200">
                        {tag}
                        <button type="button" aria-label={`Remove ${tag}`} onClick={() => setAllergies((prev) => prev.filter((_, i) => i !== idx))}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-rose-400">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Cuisines you love</p>
                    <p className="mt-1 text-xs text-zinc-500">Ciel will rotate your favorites so meals stay interesting.</p>
                  </div>
                  <span className="text-[11px] text-emerald-400">{favoriteCuisines.length} selected</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {cuisineOptions.map((cuisine) => {
                    const selected = favoriteCuisines.includes(cuisine);
                    return (
                      <button key={cuisine} type="button" aria-pressed={selected}
                        onClick={() => setFavoriteCuisines((prev) => selected ? prev.filter((item) => item !== cuisine) : [...prev, cuisine])}
                        className={cn(
                          'rounded-full border px-3 py-1.5 text-xs transition-colors',
                          selected
                            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                            : 'border-zinc-700 bg-zinc-900/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                        )}>
                        {selected && <span className="mr-1">✓</span>}{cuisine}
                      </button>
                    );
                  })}
                </div>
                <input type="text" value={cuisineDraft} onChange={(e) => setCuisineDraft(e.target.value)}
                  placeholder="Add another cuisine, such as Ethiopian"
                  className="glass-input mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
                {favoriteCuisines.some((cuisine) => !cuisineOptions.includes(cuisine as (typeof cuisineOptions)[number])) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {favoriteCuisines.filter((cuisine) => !cuisineOptions.includes(cuisine as (typeof cuisineOptions)[number])).map((cuisine) => (
                      <span key={cuisine} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 py-1 pl-2.5 pr-1 text-xs text-zinc-200">
                        {cuisine}
                        <button type="button" aria-label={`Remove ${cuisine}`} onClick={() => setFavoriteCuisines((prev) => prev.filter((item) => item !== cuisine))}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-rose-400">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500">Your cooking style</p>
                <div className="mt-2 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-text-muted">Cooking experience</label>
                    <select value={cookingSkill} onChange={(e) => setCookingSkill(e.target.value as 'beginner' | 'intermediate' | 'confident')}
                      className="glass-input mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
                      {cookingSkillOptions.map((option) => <option key={option.value} value={option.value}>{option.label} - {option.desc}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-medium text-text-muted">Maximum time per dish</label>
                      <span className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">{maxCookingMinutes} min</span>
                    </div>
                    <input type="range" min={5} max={180} step={5} value={maxCookingMinutes}
                      onChange={(e) => setMaxCookingMinutes(e.target.value)} aria-label="Maximum cooking time per dish"
                      className="mt-3 h-2 w-full cursor-pointer accent-emerald-500" />
                    <div className="mt-1 flex justify-between text-[10px] text-zinc-600"><span>5 min</span><span>180 min</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Reminder schedule */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-accent-violet" />
                  <h2 className="text-base font-semibold text-text-primary">Reminder schedule</h2>
                </div>
                <button onClick={savePreferences} disabled={prefSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {prefSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save Schedule
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">Set the times for each reminder. Leave blank to disable.</p>

              {/* Timezone */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-text-muted">Timezone</label>
                  <button type="button"
                    onClick={() => setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone)}
                    className="text-[10px] text-accent-violet hover:underline">
                    Auto-detect
                  </button>
                </div>
                <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g. Asia/Kolkata"
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
              </div>

              {/* Times grid */}
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  { label: 'Breakfast',     value: breakfastTime, set: setBreakfastTime, key: 'breakfast' },
                  { label: 'Lunch',         value: lunchTime,     set: setLunchTime,     key: 'lunch' },
                  { label: 'Dinner',        value: dinnerTime,    set: setDinnerTime,    key: 'dinner' },
                  { label: 'Sleep',         value: sleepTime,     set: setSleepTime,     key: 'sleep' },
                  { label: 'Workout',       value: workoutTime,   set: setWorkoutTime,   key: 'workout' },
                  { label: 'Weigh-in',      value: weighInTime,   set: setWeighInTime,   key: 'weighIn' },
                ].map((t) => (
                  <div key={t.key}>
                    <label className="text-xs font-medium text-text-muted">{t.label}</label>
                    <input type="time" value={t.value} onChange={(e) => t.set(e.target.value)}
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                    <p className="mt-1 text-[10px] text-text-muted truncate">{formatLastSent(lastSentAt[t.key]) || '-'}</p>
                  </div>
                ))}
              </div>

              {/* Water reminders */}
              <div className="mt-5 border-t border-zinc-800/80 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-text-primary">Water reminders</p>
                  <button type="button" onClick={() => setWaterReminderEnabled(!waterReminderEnabled)}
                    className={cn('relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200', waterReminderEnabled ? 'bg-accent-violet' : 'bg-white/[0.1]')}
                    aria-pressed={waterReminderEnabled}>
                    <span className={cn('absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200', waterReminderEnabled && 'translate-x-5')} />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6">
                  <div className="lg:col-span-1">
                    <label className="text-xs font-medium text-text-muted">Start</label>
                    <input type="time" value={waterStartTime} onChange={(e) => setWaterStartTime(e.target.value)}
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="text-xs font-medium text-text-muted">End</label>
                    <input type="time" value={waterEndTime} onChange={(e) => setWaterEndTime(e.target.value)}
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                  </div>
                  <div className="lg:col-span-1">
                    <label className="text-xs font-medium text-text-muted">Frequency</label>
                    <select
                      value={waterFrequencyMinutes}
                      onChange={(e) => setWaterFrequencyMinutes(Number(e.target.value))}
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    >
                      {[15, 30, 45, 60, 90, 120].map((minutes) => (
                        <option key={minutes} value={minutes}>{minutes} min</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-text-muted">Pauses 30 min before meals, resumes 60 min after. Last sent: {formatLastSent(lastSentAt.water) || 'None'}.</p>
              </div>
            </div>

            {/* API keys */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-accent-cyan" />
                  <h2 className="text-base font-semibold text-text-primary">API keys</h2>
                </div>
                <button onClick={saveApiKeys} disabled={apiKeysSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {apiKeysSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save Keys
                </button>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-text-muted">
                <Shield className="h-3 w-3 text-accent-cyan shrink-0" /> AES-256 encrypted, never exposed to the browser.
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  {
                    label: 'OpenAI API Key', active: openAiActive, show: showOpenai,
                    toggleShow: () => setShowOpenai(!showOpenai), value: openaiKey,
                    set: setOpenaiKey, placeholder: openAiActive ? '••••••••••••••••' : 'sk-...',
                    hint: 'Needed for meal suggestions, workout plans, and insights.',
                  },
                  {
                    label: 'USDA FoodData Central API Key', active: fdcActive, show: showFdc,
                    toggleShow: () => setShowFdc(!showFdc), value: fdcKey,
                    set: setFdcKey, placeholder: fdcActive ? '••••••••••••••••' : 'Your FDC API key',
                    hint: 'Required for food search. Get a free key at fdc.nal.usda.gov/api-key-signup',
                  },
                ].map((k) => (
                  <div key={k.label}>
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-text-muted">{k.label}</label>
                      {k.active && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-accent-emerald/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-emerald">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      )}
                    </div>
                    <div className="relative mt-1">
                      <input type={k.show ? 'text' : 'password'} value={k.value}
                        onChange={(e) => k.set(e.target.value)} placeholder={k.placeholder}
                        className="glass-input w-full rounded-xl px-3 py-2 pr-10 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                      <button type="button" onClick={k.toggleShow}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                        {k.show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <div className="mt-1">
                      <p className="text-[11px] text-text-muted">{k.hint}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {aiEnabled && (
              <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Smile className="h-4 w-4 text-accent-violet" />
                    <h2 className="text-base font-semibold text-text-primary">Dashboard mascot</h2>
                  </div>
                  <button onClick={saveCustomizations} disabled={customizationsSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                    {customizationsSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </button>
                </div>
                <p className="mt-1 text-xs text-text-muted">Choose who greets you from the corner of your dashboard.</p>
                <div className="mt-4 grid grid-cols-2 gap-3 max-w-xs">
                  {([
                    { value: 'red-panda' as const, label: 'Red panda', src: '/red-panda.png' },
                    { value: 'kiki'      as const, label: 'Kiki',      src: '/kiki.png' },
                  ]).map((m) => (
                    <button key={m.value} type="button" onClick={() => setMascot(m.value)}
                      className={cn('rounded-2xl border p-3 flex flex-col items-center gap-2 transition-all',
                        mascot === m.value
                          ? 'border-accent-violet/40 bg-accent-violet/10'
                          : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05]')}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.src} alt={m.label} className="w-20 h-20 object-contain" />
                      <span className={cn('text-xs font-medium', mascot === m.value ? 'text-accent-violet' : 'text-text-muted')}>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Units */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Ruler className="h-4 w-4 text-accent-cyan" />
                  <h2 className="text-base font-semibold text-text-primary">Units</h2>
                </div>
                <button onClick={saveCustomizations} disabled={customizationsSaving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                  {customizationsSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Save
                </button>
              </div>
              <p className="mt-1 text-xs text-text-muted">How weight and height are displayed across the app.</p>
              <div className="mt-4 grid grid-cols-2 gap-2 max-w-xs">
                {(['metric', 'imperial'] as const).map((u) => (
                  <button key={u} type="button" onClick={() => setUnits(u)}
                    className={cn('rounded-2xl border px-4 py-3 text-left transition-all',
                      units === u ? 'border-accent-violet/30 bg-accent-violet/10 text-accent-violet'
                        : 'border-white/[0.06] bg-white/[0.03] text-text-muted hover:bg-white/[0.05]')}>
                    <p className="text-sm font-semibold capitalize">{u}</p>
                    <p className="mt-0.5 text-[11px] opacity-80">{u === 'metric' ? 'kg, cm' : 'lbs, in'}</p>
                  </button>
                ))}
              </div>
            </div>

          </>
        )}

        {/* ══════ NOTIFICATIONS ══════ */}
        {activeTab === 'notifications' && (
          <>

            {/* Recipients */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent-emerald" />
                <h2 className="text-base font-semibold text-text-primary">Recipients</h2>
              </div>
              <div className="flex items-center justify-between gap-3 mt-1">
                <p className="text-xs text-text-muted">Reminder and test emails go to this list.</p>
                <div className="flex shrink-0 items-center gap-2">
                  <button onClick={sendTestEmail} disabled={sendingTestEmail || savingRecipients}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                    {sendingTestEmail ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Send Test
                  </button>
                  <button onClick={saveRecipientEmails} disabled={savingRecipients || sendingTestEmail}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                    {savingRecipients ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <input type="email" value={recipientInput} onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addRecipientEmail();
                    } else if (e.key === 'Backspace' && recipientInput === '' && recipientEmails.length > 0) {
                      setRecipientEmails(recipientEmails.slice(0, -1));
                    }
                  }}
                  placeholder="Type and press Enter (e.g. you@example.com)"
                  className="glass-input w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                {recipientEmails.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {recipientEmails.map((email, idx) => (
                      <span key={`${email}-${idx}`} className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800/60 pl-2.5 pr-1 py-0.5 text-xs text-zinc-200">
                        {email}
                        <button type="button" aria-label={`Remove ${email}`}
                          onClick={() => setRecipientEmails(recipientEmails.filter((_, i) => i !== idx))}
                          className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-700 hover:text-rose-400 transition-colors">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* SMTP + IMAP */}
            {[
              {
                label: 'SMTP', desc: 'Sends reminders to your recipient list.', configured: hasSmtp,
                emailUser: smtpUser, setEmailUser: setSmtpUser, pass: smtpPass, setPass: setSmtpPass,
                showPass: showSmtpPass, toggleShow: () => setShowSmtpPass(!showSmtpPass),
                saving: savingSmtp, onSave: saveSmtpSettings,
              },
              {
                label: 'IMAP', desc: 'Reads your replies and auto-logs them.', configured: hasImap,
                emailUser: imapUser, setEmailUser: setImapUser, pass: imapPass, setPass: setImapPass,
                showPass: showImapPass, toggleShow: () => setShowImapPass(!showImapPass),
                saving: savingImap, onSave: saveImapSettings,
              },
            ].map((cfg) => (
              <div key={cfg.label} className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-accent-emerald" />
                    <h2 className="text-base font-semibold text-text-primary">{cfg.label}</h2>
                    {cfg.configured && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-accent-emerald/10 px-1.5 py-0.5 text-[10px] font-medium text-accent-emerald">
                        <CheckCircle2 className="h-3 w-3" /> Configured
                      </span>
                    )}
                  </div>
                  <button onClick={cfg.onSave} disabled={cfg.saving}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors disabled:opacity-50">
                    {cfg.saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save {cfg.label}
                  </button>
                </div>
                <p className="mt-1 text-xs text-text-muted">{cfg.desc}</p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-text-muted">Email</label>
                    <input type="email" value={cfg.emailUser} onChange={(e) => cfg.setEmailUser(e.target.value)} placeholder="you@gmail.com"
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-text-muted">Password</label>
                    <div className="relative mt-1">
                      <input type={cfg.showPass ? 'text' : 'password'} value={cfg.pass} onChange={(e) => cfg.setPass(e.target.value)}
                        placeholder={cfg.configured ? '•••••••• (leave blank to keep)' : 'App password'}
                        className="glass-input w-full rounded-xl px-3 py-2 pr-10 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                      <button type="button" onClick={cfg.toggleShow}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                        {cfg.showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Setup status */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-accent-emerald" />
                <h2 className="text-base font-semibold text-text-primary">Setup status</h2>
              </div>
              <p className="mt-1 text-xs text-text-muted">Steps completed for email delivery and reply ingestion.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {[
                  { label: 'Recipients', done: emailChecklist.recipientListSaved },
                  { label: 'SMTP',       done: emailChecklist.smtpSaved },
                  { label: 'SMTP test',  done: emailChecklist.smtpTestSent },
                  { label: 'IMAP',       done: emailChecklist.imapSaved },
                  { label: 'IMAP test',  done: emailChecklist.imapTestSent },
                  { label: 'IMAP reply', done: Boolean(emailChecklist.imapReplyVerifiedAt) },
                ].map((s) => (
                  <span key={s.label} className={cn('flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium border',
                    s.done ? 'bg-accent-emerald/10 border-accent-emerald/20 text-accent-emerald' : 'bg-white/[0.03] border-white/[0.06] text-text-muted')}>
                    <CheckCircle2 className={cn('h-3 w-3', s.done ? 'text-accent-emerald' : 'text-text-muted opacity-30')} />
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ══════ TODOS ══════ */}
        {activeTab === 'todos' && <TodosSettingsTab />}

        {/* ══════ CONNECTORS ══════ */}
        {activeTab === 'health-data' && (
          <>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Connectors</h2>
              <p className="mt-1 text-xs text-text-muted">
                Connect the ArogyaM mobile app to sync health snapshots into your account.
              </p>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-text-primary">ArogyaM Mobile App Connector</h2>
                    <span className={cn(
                      'inline-flex w-fit items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                      connectorConfigured
                        ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400'
                        : 'border-zinc-800 bg-zinc-900/70 text-zinc-500'
                    )}>
                      <span className={cn('h-1.5 w-1.5 rounded-full', connectorConfigured ? 'bg-emerald-400' : 'bg-zinc-500')} />
                      {connectorConfigured ? 'Enabled' : 'Not enabled'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    Use our iOS companion app to send Apple Health snapshots to ArogyaMandiram.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href="https://github.com/utsaaham/ArogyaM-iOS-v1/blob/main/HOW_TO_CONNECT.md"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center justify-center rounded-lg border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
                  >
                    How to connect
                  </a>
                  <button
                    type="button"
                    onClick={saveHealthDataConfig}
                    disabled={hdSaving}
                    className="inline-flex w-fit items-center justify-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {hdSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-text-muted">Connector endpoint URL</label>
                  <input
                    type="url"
                    value={hdEndpoint}
                    onChange={(e) => setHdEndpoint(e.target.value)}
                    placeholder="https://your-arogyamandiram.app/api/health-snapshots/your-username"
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-text-muted">
                    Connector API token
                    {hdHasApiKey && !hdApiKey && (
                      <span className="ml-2 text-emerald-400">● Saved</span>
                    )}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type={hdShowApiKey ? 'text' : 'password'}
                      value={hdApiKey}
                      onChange={(e) => setHdApiKey(e.target.value)}
                      placeholder={hdHasApiKey ? '••••••••  (leave blank to keep existing)' : 'Bearer token for the mobile app connector'}
                      className="glass-input w-full rounded-xl px-3 py-2 pr-10 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setHdShowApiKey((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {hdShowApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.75fr)]">
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/45 p-4">
                    <p className="text-sm font-semibold text-text-primary">Sync settings</p>
                    <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="w-full sm:max-w-xs">
                        <label className="text-xs font-medium text-text-muted">Auto-sync interval</label>
                        <select
                          value={hdInterval}
                          onChange={(e) => setHdInterval(Number(e.target.value))}
                          className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 outline-none"
                        >
                          <option value={15}>Every 15 minutes</option>
                          <option value={30}>Every 30 minutes</option>
                          <option value={60}>Every hour</option>
                          <option value={180}>Every 3 hours</option>
                          <option value={360}>Every 6 hours</option>
                          <option value={720}>Every 12 hours</option>
                          <option value={1440}>Once a day</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-muted">Auto-sync</span>
                        <button
                          type="button"
                          onClick={() => setHdEnabled((v) => !v)}
                          className={cn(
                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                            hdEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
                          )}
                        >
                          <span
                            className={cn(
                              'pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                              hdEnabled ? 'translate-x-4' : 'translate-x-0'
                            )}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={triggerHealthSync}
                        disabled={hdSyncing || !hdEndpoint.trim()}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-text-primary hover:bg-white/[0.06] disabled:opacity-50"
                      >
                        {hdSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Sync Now
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/45 p-4">
                    <p className="text-sm font-semibold text-text-primary">Last sync</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-zinc-500">Time</span>
                        <span className="text-right text-sm text-zinc-300">
                          {hdLastSyncAt ? new Date(hdLastSyncAt).toLocaleString() : 'Not synced yet'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-zinc-500">Type</span>
                        <span className="text-right text-sm text-zinc-300">
                          {hdLastSyncSource === 'auto'
                            ? 'Auto-sync'
                            : hdLastSyncSource === 'manual'
                              ? 'Manual'
                              : 'None'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-zinc-500">Status</span>
                        <div className="flex items-center gap-1.5">
                          {hdLastStatus === 'ok' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                          ) : hdLastStatus === 'error' ? (
                            <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                          ) : null}
                          <span className={cn(
                            'text-sm font-medium',
                            hdLastStatus === 'ok' ? 'text-emerald-400' : hdLastStatus === 'error' ? 'text-rose-400' : 'text-zinc-500'
                          )}>
                            {hdLastStatus === 'ok' ? 'Success' : hdLastStatus === 'error' ? 'Error' : 'Waiting'}
                          </span>
                        </div>
                      </div>
                      {hdLastStatus === 'error' && hdLastError && (
                        <p className="text-xs text-rose-400 bg-rose-500/10 rounded-lg px-3 py-2">{hdLastError}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

// ─── Todos Settings Tab Component ────────────────────────────────────────────

const TODO_CATEGORIES = [
  { value: 'food',       label: 'Food',       icon: Utensils,     color: 'text-sky-400',     bgColor: 'bg-sky-400/15',     barColor: 'bg-sky-500' },
  { value: 'supplement', label: 'Supplement', icon: Zap,          color: 'text-emerald-400', bgColor: 'bg-emerald-400/15', barColor: 'bg-emerald-500' },
  { value: 'medicine',   label: 'Medicine',   icon: Pill,         color: 'text-rose-400',    bgColor: 'bg-rose-400/15',    barColor: 'bg-rose-500' },
  { value: 'habit',      label: 'Habit',      icon: Flame,        color: 'text-amber-400',   bgColor: 'bg-amber-400/15',   barColor: 'bg-amber-500' },
  { value: 'care',       label: 'Care',       icon: Scissors,     color: 'text-fuchsia-300', bgColor: 'bg-fuchsia-400/15', barColor: 'bg-fuchsia-500' },
  { value: 'other',      label: 'Other',      icon: ListChecks,   color: 'text-zinc-400',    bgColor: 'bg-zinc-400/15',    barColor: 'bg-zinc-500' },
];

const todoInputCls = [
  'w-full rounded-lg px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600',
  'bg-zinc-950/80 border border-zinc-800/80',
  'transition-colors duration-150',
  'focus:border-zinc-600 focus:outline-none focus:ring-0',
  '[&:focus-visible]:outline-none',
].join(' ');

/**
 * Coerce a stored time string into the strict HH:mm a time input expects.
 * Older templates saved free text ("9 AM", "12:30 PM"); Safari's time input
 * is unforgiving about anything but HH:mm.
 */
function toTimeInputValue(raw: string): string {
  const m = (raw || '').trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp])?\.?[Mm]?\.?$/);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3]?.toLowerCase();
  if (ap === 'p' && h < 12) h += 12;
  if (ap === 'a' && h === 12) h = 0;
  if (h > 23 || min > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

type TodoFormValues = { title: string; note: string; time: string; category: string; frequency: number; times: string[]; cadence: string; lastDone: string };

function TodoForm({
  values, onChange, onSubmit, onCancel, saving, submitLabel, mode,
}: {
  values: TodoFormValues;
  onChange: (f: TodoFormValues) => void;
  onSubmit: () => void;
  onCancel: () => void;
  saving: boolean;
  submitLabel: string;
  mode: 'todos' | 'care';
}) {
  const showFrequency = values.category === 'supplement' || values.category === 'medicine';
  const isCare = mode === 'care';
  const categoryOptions = TODO_CATEGORIES.filter((c) => c.value !== 'care');
  return (
    <div className="mt-3 rounded-2xl border border-zinc-800/60 bg-zinc-900/50 p-5 space-y-4">
      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Title</label>
        <input
          type="text" value={values.title} maxLength={80}
          onChange={(e) => onChange({ ...values, title: e.target.value })}
          placeholder={isCare ? 'e.g. Haircut' : 'e.g. Vitamin D capsule'}
          className={todoInputCls}
          autoComplete="off"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
      </div>

      {/* Note */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Note <span className="normal-case font-normal text-zinc-600">(optional)</span>
        </label>
        <input
          type="text" value={values.note} maxLength={160}
          onChange={(e) => onChange({ ...values, note: e.target.value })}
          placeholder={isCare ? 'e.g. Book the usual salon' : 'e.g. Take with water after meal'}
          className={todoInputCls}
          autoComplete="off"
          style={{ outline: 'none', boxShadow: 'none' }}
        />
      </div>

      {/* Category (care items are always care, so no picker there) */}
      {!isCare && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Category</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {categoryOptions.map((c) => {
              const CatIcon = c.icon;
              const active = values.category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => onChange({ ...values, category: c.value, frequency: 1 })}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all',
                    active
                      ? `border-transparent ${c.bgColor} ${c.color}`
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  )}
                >
                  <CatIcon className={cn('h-4 w-4 shrink-0', active ? c.color : 'text-zinc-600')} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Reminder cadence for care items */}
      {isCare && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            When should we remind you?
          </label>
          <div className="flex flex-wrap gap-2">
            {CARE_CADENCES.map((opt) => {
              const active = values.cadence === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...values, cadence: opt.value })}
                  className={cn(
                    'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                    active
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-zinc-600">
            When it comes due, we&apos;ll bring it back to your Care list. Skip it too long and we&apos;ll give you a gentle poke.
          </p>
        </div>
      )}

      {/* When was it last done? Anchors the care cycle to a real date. */}
      {isCare && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            When did you last do this? <span className="normal-case font-normal text-zinc-600">(optional)</span>
          </label>
          <input
            type="date"
            value={values.lastDone}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => onChange({ ...values, lastDone: e.target.value })}
            className={todoInputCls}
            style={{ outline: 'none', boxShadow: 'none', colorScheme: 'dark' }}
          />
          <p className="text-[11px] text-zinc-600">
            {values.lastDone
              ? (() => {
                  const next = new Date(`${values.lastDone}T00:00:00`);
                  next.setDate(next.getDate() + cadenceInfo(values.cadence).days);
                  const label = next.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
                  return next.getTime() <= Date.now()
                    ? `That makes it due already - it'll show up in your Care list right away.`
                    : `Next one comes due around ${label}.`;
                })()
              : 'Tell us and the cycle starts from that day instead of today.'}
          </p>
        </div>
      )}

      {/* Time of day for daily items (single dose) */}
      {!isCare && values.frequency <= 1 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Around what time? <span className="normal-case font-normal text-zinc-600">(optional)</span>
          </label>
          <input
            type="time"
            value={toTimeInputValue(values.time)}
            onChange={(e) => onChange({ ...values, time: e.target.value, times: [e.target.value] })}
            className={todoInputCls}
            style={{ outline: 'none', boxShadow: 'none', colorScheme: 'dark' }}
          />
          <p className="text-[11px] text-zinc-600">
            If it&apos;s still unchecked past this time, your checklist will remind you.
          </p>
        </div>
      )}

      {/* Per-dose times when taken more than once a day */}
      {!isCare && values.frequency > 1 && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            When is each dose? <span className="normal-case font-normal text-zinc-600">(optional)</span>
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Array.from({ length: values.frequency }, (_, i) => (
              <div key={i} className="space-y-1">
                <span className="text-[10px] text-zinc-600">Dose {i + 1}</span>
                <input
                  type="time"
                  value={toTimeInputValue(values.times[i] ?? (i === 0 ? values.time : ''))}
                  onChange={(e) => {
                    const times = Array.from({ length: values.frequency }, (_, j) =>
                      j === i ? e.target.value : (values.times[j] ?? (j === 0 ? values.time : ''))
                    );
                    onChange({ ...values, times, time: times[0] || values.time });
                  }}
                  className={todoInputCls}
                  style={{ outline: 'none', boxShadow: 'none', colorScheme: 'dark' }}
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600">
            Each dose gets its own checkbox and its own reminder if you run late.
          </p>
        </div>
      )}

      {/* Frequency - only for supplement / medicine */}
      {showFrequency && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            How many times per day?
          </label>
          <div className="flex gap-2">
            {FREQUENCY_OPTIONS.map((opt) => {
              const active = values.frequency === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChange({ ...values, frequency: opt.value })}
                  className={cn(
                    'flex flex-col items-center rounded-lg border px-3 py-2 text-xs font-medium transition-all min-w-[52px]',
                    active
                      ? 'border-emerald-600 bg-emerald-500/10 text-emerald-300'
                      : 'border-zinc-800 bg-zinc-950/50 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'
                  )}
                >
                  <span className="text-sm font-bold">{opt.label}</span>
                  <span className="text-[10px] mt-0.5 leading-none">{opt.desc}</span>
                </button>
              );
            })}
          </div>
          {values.frequency > 1 && (
            <p className="text-[11px] text-zinc-600">
              You&apos;ll get {values.frequency} checkboxes on your daily to-dos, one per dose.
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={onSubmit} disabled={saving}
          className="glass-button-primary flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold disabled:opacity-50">
          {saving
            ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            : <CheckSquare className="h-3.5 w-3.5" />
          }
          {submitLabel}
        </button>
      </div>
    </div>
  );
}

const EMPTY_FORM: TodoFormValues = { title: '', note: '', time: '', category: 'other', frequency: 1, times: [], cadence: 'monthly', lastDone: '' };

const FREQUENCY_OPTIONS = [
  { value: 1, label: '1×', desc: 'Once' },
  { value: 2, label: '2×', desc: 'Twice' },
  { value: 3, label: '3×', desc: '3 times' },
  { value: 4, label: '4×', desc: '4 times' },
  { value: 5, label: '5×', desc: '5 times' },
];

function TodosSettingsTab() {
  const [templates, setTemplates] = useState<TodoTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [section, setSection] = useState<'todos' | 'care'>('todos');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<TodoFormValues>(EMPTY_FORM);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TodoFormValues>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getTodoTemplates();
      if (res.success && res.data) setTemplates((res.data.templates ?? []) as TodoTemplate[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleTemplates = templates.filter((t) =>
    section === 'care' ? t.category === 'care' : t.category !== 'care'
  );

  const switchSection = (next: 'todos' | 'care') => {
    setSection(next);
    setShowForm(false);
    setEditId(null);
    setForm(next === 'care' ? { ...EMPTY_FORM, category: 'care' } : EMPTY_FORM);
  };

  const handleAdd = async () => {
    if (!form.title.trim()) { showToast('Give it a title first', 'error'); return; }
    setAdding(true);
    try {
      const category = section === 'care' ? 'care' : form.category;
      let baseItems: Record<string, unknown>[] = [];
      if (category === 'food') {
        const foodText = [form.title, form.note].filter(Boolean).join(': ');
        const foodRes = await api.logFoodText(foodText, 'settings-todos');
        if (foodRes.success && foodRes.data?.items?.length) {
          baseItems = foodRes.data.items as Record<string, unknown>[];
          showToast(`Got it! ${baseItems.length} food item${baseItems.length !== 1 ? 's' : ''} parsed, nutrition saved.`, 'success');
        }
        // food parse failure is non-blocking; the template still saves
      }
      const res = await api.createTodoTemplate({ ...form, category, baseItems });
      if (res.success) {
        showToast(section === 'care' ? 'Care item added. We will keep an eye on it.' : 'To-do added. See you tomorrow morning!', 'success');
        setForm(section === 'care' ? { ...EMPTY_FORM, category: 'care' } : EMPTY_FORM);
        setShowForm(false);
        await load();
      } else {
        showToast(res.error || 'Could not add that. Try again?', 'error');
      }
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editId) return;
    if (!editForm.title.trim()) { showToast('Give it a title first', 'error'); return; }
    setSavingEdit(true);
    try {
      const original = templates.find((t) => t.id === editId);
      const payload: Parameters<typeof api.updateTodoTemplate>[0] = { id: editId, ...editForm };

      // Food items carry pre-parsed nutrition; if the description changed,
      // ask the food logger again so the numbers match the new meal.
      const descriptionChanged =
        original &&
        (original.title !== editForm.title.trim() || original.note !== editForm.note.trim());
      if (editForm.category === 'food' && descriptionChanged) {
        const foodText = [editForm.title, editForm.note].filter(Boolean).join(': ');
        const foodRes = await api.logFoodText(foodText, 'settings-todos');
        if (foodRes.success && foodRes.data?.items?.length) {
          payload.baseItems = foodRes.data.items as Record<string, unknown>[];
          showToast('Meal changed, so we recalculated the nutrition for you.', 'success');
        } else {
          showToast('Saved, but we could not re-read the nutrition. The old numbers stay for now.', 'info');
        }
      }

      const res = await api.updateTodoTemplate(payload);
      if (res.success) {
        showToast('Saved!', 'success');
        setEditId(null);
        await load();
      } else {
        showToast(res.error || 'That did not save. Try again?', 'error');
      }
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await api.deleteTodoTemplate(id);
    if (res.success) {
      showToast('Deleted', 'success');
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } else {
      showToast(res.error || 'Could not delete that. Try again?', 'error');
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, enabled } : t));
    await api.updateTodoTemplate({ id, enabled });
  };

  const isCareSection = section === 'care';

  return (
    <div className="glass-card rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-emerald-400" />
            <h2 className="text-base font-semibold text-text-primary">Checklist</h2>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {isCareSection
              ? 'Haircuts, dentist visits, that kind of thing. Set a rhythm and we will remember for you.'
              : 'Daily to-dos start fresh every morning. Add a time and we will nudge you if you run late.'}
          </p>
        </div>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors">
            <Plus className="h-3 w-3" />
            {isCareSection ? 'Add care item' : 'Add to-do'}
          </button>
        )}
      </div>

      {/* To-dos / Care switcher */}
      <div className="mt-4 flex gap-2">
        {([
          { key: 'todos', label: 'To-dos', icon: CheckSquare },
          { key: 'care', label: 'Care', icon: Scissors },
        ] as const).map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => switchSection(s.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors',
              section === s.key
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-zinc-900/60 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'
            )}
          >
            <s.icon className="h-3.5 w-3.5" />
            {s.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <TodoForm
          values={form}
          onChange={setForm}
          onSubmit={handleAdd}
          onCancel={() => { setShowForm(false); setForm(isCareSection ? { ...EMPTY_FORM, category: 'care' } : EMPTY_FORM); }}
          saving={adding}
          submitLabel="Add"
          mode={section}
        />
      )}

      {/* List */}
      <div className="mt-4 space-y-2">
        {loading ? (
          <div className="py-8 text-center">
            <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
          </div>
        ) : visibleTemplates.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800/60">
              {isCareSection ? <Scissors className="h-6 w-6 text-zinc-600" /> : <CheckSquare className="h-6 w-6 text-zinc-600" />}
            </div>
            <p className="mt-3 text-sm font-medium text-zinc-400">
              {isCareSection ? 'No care items yet' : 'No to-dos yet'}
            </p>
            <p className="mt-1 text-xs text-zinc-600">
              {isCareSection
                ? 'Add the things you always forget: haircut, dentist, filter change...'
                : 'Add supplements, medicines, habits, or food routines.'}
            </p>
          </div>
        ) : (
          visibleTemplates.map((t) => {
            const cfg = TODO_CATEGORIES.find((c) => c.value === t.category) ?? TODO_CATEGORIES[4];
            const CatIcon = cfg.icon;
            const isEditing = editId === t.id;
            return (
              <div key={t.id} className="overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30 transition-colors hover:border-zinc-700/80">
                {isEditing ? (
                  <div className="p-1">
                    <TodoForm
                      values={editForm}
                      onChange={setEditForm}
                      onSubmit={handleSaveEdit}
                      onCancel={() => setEditId(null)}
                      saving={savingEdit}
                      submitLabel="Save"
                      mode={t.category === 'care' ? 'care' : 'todos'}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-3.5 py-3">
                      {/* Icon */}
                      <div className={cn(
                        'shrink-0 h-9 w-9 rounded-lg flex items-center justify-center',
                        t.enabled ? cfg.bgColor : 'bg-zinc-800/60'
                      )}>
                        <CatIcon className={cn('h-4 w-4', t.enabled ? cfg.color : 'text-zinc-600')} />
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn(
                            'text-sm font-semibold',
                            t.enabled ? 'text-zinc-100' : 'text-zinc-500 line-through'
                          )}>
                            {t.title}
                          </span>
                          {(t.category === 'supplement' || t.category === 'medicine') && (t.frequency ?? 1) > 1 && (
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.bgColor, cfg.color)}>
                              {t.frequency}\u00d7 daily
                            </span>
                          )}
                          {t.category === 'care' && (
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', cfg.bgColor, cfg.color)}>
                              {cadenceInfo(t.cadence).label}
                            </span>
                          )}
                          {t.category !== 'care' && toTimeInputValue(t.time) && (
                            <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                              {toTimeInputValue(t.time)}
                            </span>
                          )}
                          {t.category === 'food' && Array.isArray(t.baseItems) && t.baseItems.length > 0 && (
                            <span className="rounded-full bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                              {t.baseItems.length} item{t.baseItems.length !== 1 ? 's' : ''} parsed
                            </span>
                          )}
                        </div>
                        {t.note && (
                          <p className="mt-0.5 text-xs text-zinc-500 truncate">{t.note}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 items-center gap-0.5">
                        <button type="button"
                          title={t.enabled ? 'Disable' : 'Enable'}
                          onClick={() => handleToggleEnabled(t.id, !t.enabled)}
                          className={cn(
                            'rounded-lg p-1.5 transition-colors',
                            t.enabled
                              ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                              : 'bg-zinc-800 text-zinc-600 hover:bg-zinc-700 hover:text-zinc-400'
                          )}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                        <button type="button"
                          title="Edit"
                          onClick={() => { setEditId(t.id); setEditForm({ title: t.title, note: t.note, time: toTimeInputValue(t.time), category: t.category, frequency: t.frequency ?? 1, times: (t.times ?? []).map(toTimeInputValue), cadence: t.cadence ?? 'monthly', lastDone: t.lastDone ?? '' }); }}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button"
                          title="Delete"
                          onClick={() => handleDelete(t.id)}
                          className="rounded-lg p-1.5 text-zinc-600 hover:bg-rose-500/10 hover:text-rose-400 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Page (wraps in Suspense for useSearchParams) ─────────────────────────────

export default function SettingsPage() {
  return (
    <div
      className="settings-page flex flex-col"
      style={{
        height: '100%',
        paddingTop: 'calc(var(--sat, env(safe-area-inset-top, 0px)) + 0.75rem)',
      }}
    >
      {/* Fixed header - never scrolls */}
      <div className="shrink-0 px-4 pb-3 sm:px-6 lg:px-6">
        <DashboardPageShell
          title="Settings"
          subtitle="Profile, targets, customizations, API keys, and preferences"
          icon={Settings}
          mobileVariant="minimal"
        />
      </div>

      {/* Scrollable content */}
      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 sm:px-6 lg:px-6 pb-[max(3.25rem,calc(var(--sab,env(safe-area-inset-bottom,0px))+2.5rem))] lg:pb-8">
        <Suspense fallback={
          <div className="flex gap-6">
            <div className="hidden w-52 shrink-0 lg:block"><CardSkeleton className="h-64" /></div>
            <div className="flex-1 space-y-4"><CardSkeleton className="h-48" /><CardSkeleton className="h-64" /></div>
          </div>
        }>
          <SettingsInner />
        </Suspense>
      </div>
    </div>
  );
}

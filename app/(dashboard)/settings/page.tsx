'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Key,
  Target,
  Bell,
  Save,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'api-keys' | 'targets' | 'notifications';

const settingsTabs: { key: SettingsTab; label: string; icon: typeof User }[] = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'api-keys', label: 'API Keys', icon: Key },
  { key: 'targets', label: 'Targets', icon: Target },
  { key: 'notifications', label: 'Preferences', icon: Bell },
];

const activityLevels = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { value: 'light', label: 'Light', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { value: 'active', label: 'Active', desc: '6-7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: 'Intense daily exercise' },
];

const goals = [
  { value: 'lose', label: 'Lose Weight', desc: 'Calorie deficit' },
  { value: 'maintain', label: 'Maintain', desc: 'Stay current' },
  { value: 'gain', label: 'Gain Weight', desc: 'Calorie surplus' },
];

export default function SettingsPage() {
  const { user, loading, refetch } = useUser();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [regeneratingPlan, setRegeneratingPlan] = useState(false);

  // Profile state (dateOfBirth is source of truth; age shown when no DOB for legacy)
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [goal, setGoal] = useState('maintain');
  const [targetWeight, setTargetWeight] = useState('');

  // API Keys state
  const [openaiKey, setOpenaiKey] = useState('');
  const [edamamAppId, setEdamamAppId] = useState('');
  const [edamamAppKey, setEdamamAppKey] = useState('');
  const [showOpenai, setShowOpenai] = useState(false);
  const [showEdamam, setShowEdamam] = useState(false);

  // Targets state
  const [dailyCalories, setDailyCalories] = useState('');
  const [dailyWater, setDailyWater] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  // Preferences state
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');
  const [waterNotif, setWaterNotif] = useState(true);
  const [mealNotif, setMealNotif] = useState(true);
  const [weighInNotif, setWeighInNotif] = useState(true);
  const [workoutNotif, setWorkoutNotif] = useState(true);

  // Populate from user data
  useEffect(() => {
    if (!user) return;
    const p = user.profile;
    const t = user.targets;
    const s = user.settings;

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
    }
    if (t) {
      setDailyCalories(t.dailyCalories?.toString() || '');
      setDailyWater(t.dailyWater?.toString() || '');
      setProtein(t.protein?.toString() || '');
      setCarbs(t.carbs?.toString() || '');
      setFat(t.fat?.toString() || '');
    }
    if (s) {
      setUnits(s.units || 'metric');
      setWaterNotif(s.notifications?.water ?? true);
      setMealNotif(s.notifications?.meals ?? true);
      setWeighInNotif(s.notifications?.weighIn ?? true);
      setWorkoutNotif(s.notifications?.workout ?? true);
    }
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name,
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        activityLevel,
        goal,
        targetWeight: parseFloat(targetWeight),
      };
      if (dateOfBirth) payload.dateOfBirth = dateOfBirth;
      else if (age) payload.age = parseInt(age, 10);
      const res = await api.updateProfile(payload);
      if (res.success) {
        showToast('Profile updated', 'success');
        refetch();
      } else {
        showToast(res.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveApiKeys = async () => {
    setSaving(true);
    try {
      const keys: Record<string, string> = {};
      if (openaiKey) keys.openai = openaiKey;
      if (edamamAppId) keys.edamamAppId = edamamAppId;
      if (edamamAppKey) keys.edamamAppKey = edamamAppKey;

      if (Object.keys(keys).length === 0) {
        showToast('No keys to save', 'info');
        setSaving(false);
        return;
      }

      const res = await api.saveApiKeys(keys);
      if (res.success) {
        showToast('API keys saved securely', 'success');
        setOpenaiKey('');
        setEdamamAppId('');
        setEdamamAppKey('');
        refetch();
      } else {
        showToast(res.error || 'Failed to save keys', 'error');
      }
    } catch {
      showToast('Failed to save API keys', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveTargets = async () => {
    setSaving(true);
    try {
      const res = await api.updateTargets({
        dailyCalories: parseInt(dailyCalories),
        dailyWater: parseInt(dailyWater),
        protein: parseInt(protein),
        carbs: parseInt(carbs),
        fat: parseInt(fat),
      });
      if (res.success) {
        showToast('Targets updated', 'success');
        refetch();
      } else {
        showToast(res.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save targets', 'error');
    } finally {
      setSaving(false);
    }
  };

  const regenerateHealthPlan = async () => {
    setRegeneratingPlan(true);
    try {
      const res = await api.generateHealthPlan();
      if (res.success && res.data) {
        const data = res.data as { user?: { targets?: Record<string, number> }; explanations?: Record<string, string> };
        showToast('AI health plan updated', 'success');
        refetch();
        if (data.explanations && Object.keys(data.explanations).length > 0) {
          const first = Object.entries(data.explanations)[0];
          showToast(first[1], 'info');
        }
      } else {
        showToast(res.error || 'Failed to generate health plan', 'error');
      }
    } catch {
      showToast('Failed to generate health plan', 'error');
    } finally {
      setRegeneratingPlan(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const res = await api.updateSettings({
        units,
        notifications: { water: waterNotif, meals: mealNotif, weighIn: weighInNotif, workout: workoutNotif },
      });
      if (res.success) {
        showToast('Preferences saved', 'success');
        refetch();
      } else {
        showToast(res.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save preferences', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (tab === 'profile') saveProfile();
    else if (tab === 'api-keys') saveApiKeys();
    else if (tab === 'targets') saveTargets();
    else if (tab === 'notifications') savePreferences();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <CardSkeleton className="h-64" />
          <CardSkeleton className="lg:col-span-3 h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Sidebar Tabs */}
        <div className="glass-card rounded-2xl p-3 lg:p-4">
          <nav className="flex gap-1 lg:flex-col">
            {settingsTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all',
                  tab === t.key
                    ? 'bg-accent-violet/10 text-accent-violet'
                    : 'text-text-muted hover:bg-white/[0.04] hover:text-text-primary'
                )}
              >
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="glass-card rounded-2xl p-6 lg:col-span-3">
          {/* Profile */}
          {tab === 'profile' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-text-primary">Profile Information</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-text-muted">Full Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Date of birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="glass-input date-input mt-1 w-full max-w-[220px] rounded-xl px-3 py-2 text-left text-sm"
                    max={new Date().toISOString().split('T')[0]}
                  />
                  {dateOfBirth && (
                    <p className="mt-1 text-xs text-text-muted">
                      Age: {(() => {
                        const birth = new Date(dateOfBirth);
                        const today = new Date();
                        let a = today.getFullYear() - birth.getFullYear();
                        const m = today.getMonth() - birth.getMonth();
                        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a -= 1;
                        return a;
                      })()} years (updated automatically)
                    </p>
                  )}
                </div>
                {!dateOfBirth && (
                  <div>
                    <label className="text-xs font-medium text-text-muted">Age (if no date of birth set)</label>
                    <input type="number" value={age} onChange={(e) => setAge(e.target.value)}
                      className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" min={10} max={120} placeholder="25" />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-text-muted">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Height (cm)</label>
                  <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Current Weight (kg)</label>
                  <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" step={0.1} />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Target Weight (kg)</label>
                  <input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" step={0.1} />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-muted">Activity Level</label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                  {activityLevels.map((al) => (
                    <button key={al.value} onClick={() => setActivityLevel(al.value)}
                      className={cn(
                        'rounded-xl px-3 py-2.5 text-left text-xs transition-all',
                        activityLevel === al.value
                          ? 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                          : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06]'
                      )}>
                      <p className="font-semibold">{al.label}</p>
                      <p className="mt-0.5 text-[10px] opacity-70">{al.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-muted">Goal</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {goals.map((g) => (
                    <button key={g.value} onClick={() => setGoal(g.value)}
                      className={cn(
                        'rounded-xl px-3 py-2.5 text-center text-xs transition-all',
                        goal === g.value
                          ? 'bg-accent-emerald/15 text-accent-emerald ring-1 ring-accent-emerald/30'
                          : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06]'
                      )}>
                      <p className="font-semibold">{g.label}</p>
                      <p className="mt-0.5 text-[10px] opacity-70">{g.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* API Keys */}
          {tab === 'api-keys' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-text-primary">API Keys</h2>

              <div className="flex items-start gap-2 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent-cyan" />
                <p className="text-xs text-text-secondary">
                  Keys are encrypted with AES-256 before storage. They are never sent to the browser — only boolean flags (has key / doesn&apos;t) are returned.
                </p>
              </div>

              {/* OpenAI */}
              <div className="rounded-xl border border-white/[0.06] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">OpenAI API Key</span>
                    {user?.hasOpenAiKey && (
                      <span className="flex items-center gap-1 rounded-md bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-text-muted">Required for AI-powered meal suggestions, workout plans, and insights.</p>
                <div className="relative mt-3">
                  <input
                    type={showOpenai ? 'text' : 'password'}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder={user?.hasOpenAiKey ? '••••••••••••••••' : 'sk-...'}
                    className="glass-input w-full rounded-xl px-3 py-2 pr-10 text-sm"
                  />
                  <button onClick={() => setShowOpenai(!showOpenai)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                    {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Edamam */}
              <div className="rounded-xl border border-white/[0.06] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary">Edamam API Key</span>
                    {user?.hasEdamamKey && (
                      <span className="flex items-center gap-1 rounded-md bg-accent-emerald/10 px-2 py-0.5 text-[10px] font-medium text-accent-emerald">
                        <CheckCircle2 className="h-3 w-3" /> Active
                      </span>
                    )}
                    <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] text-text-muted">Optional</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  Adds 900k+ international foods to search alongside the built-in Indian database.
                </p>
                <div className="mt-3 space-y-2">
                  <div className="relative">
                    <input type={showEdamam ? 'text' : 'password'} value={edamamAppId}
                      onChange={(e) => setEdamamAppId(e.target.value)}
                      placeholder="App ID" className="glass-input w-full rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div className="relative">
                    <input type={showEdamam ? 'text' : 'password'} value={edamamAppKey}
                      onChange={(e) => setEdamamAppKey(e.target.value)}
                      placeholder="App Key" className="glass-input w-full rounded-xl px-3 py-2 pr-10 text-sm" />
                    <button onClick={() => setShowEdamam(!showEdamam)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                      {showEdamam ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Targets */}
          {tab === 'targets' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-text-primary">Daily Targets</h2>
              <p className="text-xs text-text-muted">
                These were auto-calculated during onboarding. Adjust as needed, or regenerate with AI for personalized recommendations.
              </p>

              {user?.hasOpenAiKey && (
                <div className="flex flex-col gap-2 rounded-xl border border-accent-violet/20 bg-accent-violet/5 p-4">
                  <p className="text-sm font-medium text-text-primary">AI Health Plan</p>
                  <p className="text-xs text-text-muted">
                    Generate personalized targets (calories, water, macros, ideal weight, workout duration, sleep) based on your profile.
                  </p>
                  <button
                    type="button"
                    onClick={regenerateHealthPlan}
                    disabled={regeneratingPlan}
                    className="glass-button-primary mt-1 flex w-fit items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                  >
                    {regeneratingPlan ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Regenerate AI Health Plan
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-text-muted">Daily Calories (kcal)</label>
                  <input type="number" value={dailyCalories} onChange={(e) => setDailyCalories(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Daily Water (ml)</label>
                  <input type="number" value={dailyWater} onChange={(e) => setDailyWater(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Protein (g)</label>
                  <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Carbs (g)</label>
                  <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-text-muted">Fat (g)</label>
                  <input type="number" value={fat} onChange={(e) => setFat(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm" />
                </div>
              </div>

              {/* Macro split visualization */}
              {protein && carbs && fat && (
                <div className="rounded-xl bg-white/[0.03] p-4">
                  <p className="mb-2 text-xs font-medium text-text-muted">Macro Split</p>
                  <div className="flex h-3 overflow-hidden rounded-full">
                    {(() => {
                      const total = (parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9;
                      const pPct = total > 0 ? ((parseInt(protein) || 0) * 4 / total * 100) : 33;
                      const cPct = total > 0 ? ((parseInt(carbs) || 0) * 4 / total * 100) : 33;
                      const fPct = total > 0 ? ((parseInt(fat) || 0) * 9 / total * 100) : 34;
                      return (
                        <>
                          <div className="bg-accent-violet" style={{ width: `${pPct}%` }} />
                          <div className="bg-accent-amber" style={{ width: `${cPct}%` }} />
                          <div className="bg-accent-rose" style={{ width: `${fPct}%` }} />
                        </>
                      );
                    })()}
                  </div>
                  <div className="mt-2 flex justify-between text-[10px] text-text-muted">
                    <span className="text-accent-violet">Protein {Math.round((parseInt(protein) || 0) * 4 / ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9) * 100 || 0)}%</span>
                    <span className="text-accent-amber">Carbs {Math.round((parseInt(carbs) || 0) * 4 / ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9) * 100 || 0)}%</span>
                    <span className="text-accent-rose">Fat {Math.round((parseInt(fat) || 0) * 9 / ((parseInt(protein) || 0) * 4 + (parseInt(carbs) || 0) * 4 + (parseInt(fat) || 0) * 9) * 100 || 0)}%</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preferences */}
          {tab === 'notifications' && (
            <div className="space-y-5">
              <h2 className="text-base font-semibold text-text-primary">Preferences</h2>

              <div>
                <label className="text-xs font-medium text-text-muted">Units</label>
                <div className="mt-2 flex gap-2">
                  {(['metric', 'imperial'] as const).map((u) => (
                    <button key={u} onClick={() => setUnits(u)}
                      className={cn(
                        'rounded-xl px-4 py-2.5 text-sm font-medium capitalize transition-all',
                        units === u
                          ? 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                          : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06]'
                      )}>
                      {u} ({u === 'metric' ? 'kg, cm' : 'lbs, in'})
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-muted">Reminder Notifications</label>
                <div className="mt-2 space-y-2">
                  {[
                    { key: 'water', label: 'Water reminders', value: waterNotif, set: setWaterNotif },
                    { key: 'meals', label: 'Meal logging reminders', value: mealNotif, set: setMealNotif },
                    { key: 'weighIn', label: 'Daily weigh-in', value: weighInNotif, set: setWeighInNotif },
                    { key: 'workout', label: 'Workout reminders', value: workoutNotif, set: setWorkoutNotif },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3">
                      <span className="text-sm text-text-secondary">{item.label}</span>
                      <button
                        onClick={() => item.set(!item.value)}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors duration-200',
                          item.value ? 'bg-accent-violet' : 'bg-white/[0.1]'
                        )}
                      >
                        <span
                          className={cn(
                            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform duration-200',
                            item.value && 'translate-x-5'
                          )}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-6 flex justify-end border-t border-white/[0.06] pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="glass-button-primary flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

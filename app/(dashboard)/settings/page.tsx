'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Key, Save, Settings, Target, User, Ruler, Activity, Flag } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import DashboardPageShell from '@/components/layout/DashboardPageShell';

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

  useEffect(() => {
    if (!user) return;
    setUsername(user.username || '');
    if (!user.profile) return;
    const p = user.profile;
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
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      if (username.trim()) {
        const un = username.trim().toLowerCase().replace(/\s+/g, '_');
        if (un.length < 3) {
          showToast('Username must be at least 3 characters', 'error');
          setSaving(false);
          return;
        }
        if (!/^[a-z0-9_]+$/.test(un)) {
          showToast('Username can only contain letters, numbers, and underscores', 'error');
          setSaving(false);
          return;
        }
      }
      const profilePayload: Record<string, unknown> = {
        name,
        gender,
        height: parseFloat(height),
        weight: parseFloat(weight),
        activityLevel,
        goal,
        targetWeight: parseFloat(targetWeight),
      };
      if (dateOfBirth) profilePayload.dateOfBirth = dateOfBirth;
      else if (age) profilePayload.age = parseInt(age, 10);
      // Send username at top level so API persists it to MongoDB (not inside profile)
      const normalizedUsername = username.trim() ? username.trim().toLowerCase().replace(/\s+/g, '_') : undefined;
      const body: { profile: Record<string, unknown>; username?: string } = {
        profile: profilePayload,
        ...(normalizedUsername && { username: normalizedUsername }),
      };
      const res = await api.updateUser(body);
      if (res.success) {
        showToast('Profile updated', 'success');
        const updated = res.data as { username?: string } | undefined;
        if (updated?.username) setUsername(updated.username);
        await refetch();
      } else {
        showToast(res.error || 'Failed to save', 'error');
      }
    } catch {
      showToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
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
    <div className="animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop settings-page">
      <DashboardPageShell
        title="Settings"
        subtitle="Update your profile to keep targets accurate"
        icon={Settings}
        iconClassName="text-emerald-400"
        mobileVariant="card"
      />

      <div className="mobile-fade-up mobile-dash-px lg:px-0" style={{ animationDelay: '80ms' }}>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4 lg:items-stretch">
        {/* Left: quick links + why this matters — hidden on mobile; desktop only */}
        <div className="hidden lg:flex flex-col gap-6 lg:min-h-0">
          <div className="glass-card rounded-2xl p-6 shrink-0">
            <p className="text-sm font-semibold text-text-primary">Quick links</p>
            <div className="mt-4 space-y-2">
              {[
                { href: '/dashboard?tour=1', label: 'Platform tour', icon: Activity, iconClass: 'text-accent-emerald' },
                { href: '/targets', label: 'Targets', icon: Target, iconClass: 'text-accent-amber' },
                { href: '/preferences', label: 'Preferences', icon: Bell, iconClass: 'text-emerald-400' },
                { href: '/api-keys', label: 'API Keys', icon: Key, iconClass: 'text-accent-cyan' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm font-medium text-text-secondary transition-all hover:bg-white/[0.04] hover:text-text-primary"
                >
                  <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.04]', item.iconClass)}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="truncate">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex-1 min-h-0 flex flex-col">
            <p className="text-sm font-semibold text-text-primary">Why this matters</p>
            <p className="mt-2 text-xs leading-relaxed text-text-muted">
              Your profile drives targets and recommendations across the app. Keeping it up to date improves accuracy everywhere.
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-muted">
              <li>• <strong className="text-text-secondary">Calories</strong> — Daily intake and burn goals (BMR/TDEE)</li>
              <li>• <strong className="text-text-secondary">Water</strong> — Hydration target based on weight and activity</li>
              <li>• <strong className="text-text-secondary">Macros</strong> — Protein, carbs, and fat from your goal</li>
              <li>• <strong className="text-text-secondary">Sleep</strong> — Recommended hours by age</li>
              <li>• <strong className="text-text-secondary">Workout</strong> — Suggested duration and calorie burn</li>
              <li>• <strong className="text-text-secondary">Ideal weight</strong> — Reference from height and build</li>
            </ul>
          </div>
        </div>

        {/* Right: form sections (align with left till Goal card) */}
        <div className="flex h-full flex-col gap-3 lg:col-span-3 lg:min-h-0">
          {/* Personal */}
          <div className="glass-card rounded-2xl p-6 shrink-0">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-400" />
              <h2 className="text-base font-semibold text-text-primary">Personal</h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-text-muted">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. john_doe"
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  minLength={3}
                  maxLength={30}
                />
                <p className="mt-1 text-xs text-zinc-400">Letters, numbers, underscores only. Unique across the platform.</p>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Date of birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="glass-input date-input mt-1 w-full rounded-xl px-3 py-2 text-left text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  max={new Date().toISOString().split('T')[0]}
                />
                {dateOfBirth && (
                  <p className="mt-1 text-xs text-zinc-400">
                    Age:{' '}
                    {(() => {
                      const birth = new Date(dateOfBirth);
                      const today = new Date();
                      let a = today.getFullYear() - birth.getFullYear();
                      const m = today.getMonth() - birth.getMonth();
                      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a -= 1;
                      return a;
                    })()}{' '}
                    years (updated automatically)
                  </p>
                )}
              </div>
              {!dateOfBirth && (
                <div>
                  <label className="text-xs font-medium text-text-muted">Age (if no date of birth set)</label>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    min={10}
                    max={120}
                    placeholder="25"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-text-muted">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Body metrics */}
          <div className="glass-card rounded-2xl p-6 shrink-0">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4 text-accent-cyan" />
              <h2 className="text-base font-semibold text-text-primary">Body metrics</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-medium text-text-muted">Height (cm)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Current Weight (kg)</label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  step={0.1}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Target Weight (kg)</label>
                <input
                  type="number"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm bg-zinc-900 border border-zinc-800 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  step={0.1}
                />
              </div>
            </div>
          </div>

          {/* Activity */}
          <div className="glass-card rounded-2xl p-6 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-accent-rose" />
              <h2 className="text-base font-semibold text-text-primary">Activity level</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {activityLevels.map((al) => (
                <button
                  key={al.value}
                  type="button"
                  onClick={() => setActivityLevel(al.value)}
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-left text-xs transition-all',
                    activityLevel === al.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                  )}
                >
                  <p
                    className={cn(
                      'font-semibold',
                      activityLevel === al.value ? 'text-emerald-400' : 'text-zinc-200'
                    )}
                  >
                    {al.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">{al.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Goal */}
          <div className="glass-card flex flex-1 min-h-0 flex-col rounded-2xl p-6">
            <div className="flex items-center gap-2">
              <Flag className="h-4 w-4 text-accent-emerald" />
              <h2 className="text-base font-semibold text-text-primary">Goal</h2>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {goals.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={cn(
                    'rounded-2xl border px-4 py-3 text-left text-xs transition-all',
                    goal === g.value
                      ? 'border-emerald-500 bg-emerald-500/10 text-zinc-100'
                      : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                  )}
                >
                  <p
                    className={cn(
                      'font-semibold',
                      goal === g.value ? 'text-emerald-400' : 'text-zinc-200'
                    )}
                  >
                    {g.label}
                  </p>
                  <p className="mt-0.5 text-[10px] text-zinc-400">{g.desc}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={saveProfile}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

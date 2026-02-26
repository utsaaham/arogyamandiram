'use client';

import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { useUser } from '@/hooks/useUser';
import api from '@/lib/apiClient';
import { cn } from '@/lib/utils';

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
    if (!user?.profile) return;
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

      <div className="glass-card rounded-2xl p-6 max-w-3xl">
        <h2 className="text-base font-semibold text-text-primary mb-5">Profile Information</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-text-muted">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">Date of birth</label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="glass-input date-input mt-1 w-full rounded-xl px-3 py-2 text-left text-sm"
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
                className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
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
              className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">Height (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">Current Weight (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              step={0.1}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted">Target Weight (kg)</label>
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              className="glass-input mt-1 w-full rounded-xl px-3 py-2 text-sm"
              step={0.1}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text-muted">Activity Level</label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {activityLevels.map((al) => (
              <button
                key={al.value}
                onClick={() => setActivityLevel(al.value)}
                className={cn(
                  'rounded-xl px-3 py-2.5 text-left text-xs transition-all',
                  activityLevel === al.value
                    ? 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                    : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06]'
                )}
              >
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
              <button
                key={g.value}
                onClick={() => setGoal(g.value)}
                className={cn(
                  'rounded-xl px-3 py-2.5 text-center text-xs transition-all',
                  goal === g.value
                    ? 'bg-accent-emerald/15 text-accent-emerald ring-1 ring-accent-emerald/30'
                    : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06]'
                )}
              >
                <p className="font-semibold">{g.label}</p>
                <p className="mt-0.5 text-[10px] opacity-70">{g.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-white/[0.06] pt-4">
          <button
            onClick={saveProfile}
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
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/apiClient';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Ruler,
  Target,
  Sparkles,
  Check,
} from 'lucide-react';
import { showToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

const steps = [
  { icon: User, label: 'Personal', title: 'Tell us about yourself' },
  { icon: Ruler, label: 'Measurements', title: 'Your body measurements' },
  { icon: Target, label: 'Goals', title: 'Set your fitness goals' },
  { icon: Sparkles, label: 'Ready!', title: 'You\'re all set!' },
];

const activityLevels = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, no exercise', emoji: '🪑' },
  { value: 'light', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week', emoji: '🚶' },
  { value: 'moderate', label: 'Moderately Active', desc: 'Exercise 3-5 days/week', emoji: '🏃' },
  { value: 'active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week', emoji: '💪' },
  { value: 'very_active', label: 'Extra Active', desc: 'Athlete / physical job', emoji: '🏋️' },
];

const goalOptions = [
  { value: 'lose', label: 'Lose Weight', desc: 'We\'ll set a healthy calorie deficit', emoji: '📉', color: 'border-accent-cyan/30 bg-accent-cyan/5' },
  { value: 'maintain', label: 'Maintain Weight', desc: 'Stay at your current weight', emoji: '⚖️', color: 'border-accent-emerald/30 bg-accent-emerald/5' },
  { value: 'gain', label: 'Gain Weight', desc: 'We\'ll set a calorie surplus for muscle', emoji: '📈', color: 'border-accent-amber/30 bg-accent-amber/5' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Form data
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('');
  const [goal, setGoal] = useState('');

  // Prefill name and date of birth from profile (e.g. after register)
  useEffect(() => {
    api.getUser().then((res) => {
      if (res.success && res.data && (res.data as { profile?: { name?: string; dateOfBirth?: string } }).profile) {
        const p = (res.data as { profile: { name?: string; dateOfBirth?: string } }).profile;
        if (p.name) setName((n) => n || p.name || '');
        if (p.dateOfBirth) {
          const d = p.dateOfBirth;
          setDateOfBirth((prev) => prev || d);
        }
      }
    });
  }, []);

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim() && dateOfBirth && gender;
      case 1: return height && weight;
      case 2: return activityLevel && goal;
      case 3: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const res = await api.completeOnboarding({
        profile: {
          name: name.trim(),
          dateOfBirth,
          gender,
          height: parseFloat(height),
          weight: parseFloat(weight),
          targetWeight: parseFloat(targetWeight) || parseFloat(weight),
          activityLevel: activityLevel || 'moderate',
          goal: goal || 'maintain',
        },
      });

      if (res.success) {
        showToast('Welcome to Arogyamandiram!', 'success');
        router.push('/dashboard');
      } else {
        showToast(res.error || 'Something went wrong', 'error');
      }
    } catch {
      showToast('Failed to complete setup', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-violet to-accent-emerald text-lg font-bold">
            A
          </div>
          <h1 className="font-heading text-xl font-bold">
            Arogya<span className="text-accent-violet">mandiram</span>
          </h1>
          <p className="mt-1 text-sm text-text-muted">Let&apos;s set up your health profile</p>
        </div>

        {/* Step Indicators */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all',
                i < step ? 'bg-accent-emerald text-white'
                  : i === step ? 'bg-accent-violet text-white'
                  : 'bg-white/[0.06] text-text-muted'
              )}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  'h-0.5 w-8 rounded-full transition-all',
                  i < step ? 'bg-accent-emerald' : 'bg-white/[0.08]'
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="mb-1 text-lg font-semibold text-text-primary">{steps[step].title}</h2>
          <p className="mb-6 text-xs text-text-muted">Step {step + 1} of {steps.length}</p>

          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-medium text-text-muted">Your Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder="Enter your name" autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Date of birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  max={new Date().toISOString().split('T')[0]} />
                <p className="mt-1 text-[10px] text-text-muted">Age is calculated automatically</p>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Gender</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[
                    { value: 'male', label: 'Male', emoji: '👨' },
                    { value: 'female', label: 'Female', emoji: '👩' },
                    { value: 'other', label: 'Other', emoji: '🧑' },
                  ].map((g) => (
                    <button key={g.value} onClick={() => setGender(g.value)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl py-3 text-sm font-medium transition-all',
                        gender === g.value
                          ? 'bg-accent-violet/15 text-accent-violet ring-1 ring-accent-violet/30'
                          : 'bg-white/[0.04] text-text-muted hover:bg-white/[0.06]'
                      )}>
                      <span className="text-xl">{g.emoji}</span>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Measurements */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="text-xs font-medium text-text-muted">Height (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder="170" autoFocus />
                <p className="mt-1 text-[10px] text-text-muted">
                  {height ? `${(parseFloat(height) / 30.48).toFixed(0)}'${Math.round((parseFloat(height) / 2.54) % 12)}"` : ''}
                </p>
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Current Weight (kg)</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder="70" step={0.1} />
              </div>
              <div>
                <label className="text-xs font-medium text-text-muted">Target Weight (kg) — optional</label>
                <input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                  className="glass-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder={weight || '65'} step={0.1} />
              </div>
            </div>
          )}

          {/* Step 2: Goals */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="text-xs font-medium text-text-muted">Activity Level</label>
                <div className="mt-2 space-y-2">
                  {activityLevels.map((al) => (
                    <button key={al.value} onClick={() => setActivityLevel(al.value)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all',
                        activityLevel === al.value
                          ? 'bg-accent-violet/15 ring-1 ring-accent-violet/30'
                          : 'bg-white/[0.04] hover:bg-white/[0.06]'
                      )}>
                      <span className="text-xl">{al.emoji}</span>
                      <div>
                        <p className={cn('text-sm font-medium', activityLevel === al.value ? 'text-accent-violet' : 'text-text-primary')}>
                          {al.label}
                        </p>
                        <p className="text-[11px] text-text-muted">{al.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-text-muted">Goal</label>
                <div className="mt-2 space-y-2">
                  {goalOptions.map((g) => (
                    <button key={g.value} onClick={() => setGoal(g.value)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                        goal === g.value ? g.color : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                      )}>
                      <span className="text-xl">{g.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{g.label}</p>
                        <p className="text-[11px] text-text-muted">{g.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Summary */}
          {step === 3 && (
            <div className="animate-fade-in">
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-emerald/15">
                  <Sparkles className="h-8 w-8 text-accent-emerald" />
                </div>
                <p className="text-sm text-text-secondary">
                  We&apos;ll calculate your personalized daily targets based on your profile.
                </p>
              </div>

              <div className="space-y-2 rounded-xl bg-white/[0.03] p-4">
                {[
                  { label: 'Name', value: name },
                  {
                    label: 'Age',
                    value: dateOfBirth
                      ? `${(() => {
                          const birth = new Date(dateOfBirth);
                          const today = new Date();
                          let a = today.getFullYear() - birth.getFullYear();
                          const m = today.getMonth() - birth.getMonth();
                          if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) a -= 1;
                          return a;
                        })()} years`
                      : '—',
                  },
                  { label: 'Gender', value: gender },
                  { label: 'Height', value: `${height} cm` },
                  { label: 'Weight', value: `${weight} kg` },
                  { label: 'Target', value: targetWeight ? `${targetWeight} kg` : 'Same as current' },
                  { label: 'Activity', value: activityLevels.find((a) => a.value === activityLevel)?.label || activityLevel },
                  { label: 'Goal', value: goalOptions.find((g) => g.value === goal)?.label || goal },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">{item.label}</span>
                    <span className="font-medium capitalize text-text-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={handleBack}
                className="flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text-primary">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : <div />}

            {step < steps.length - 1 ? (
              <button onClick={handleNext} disabled={!canProceed()}
                className="glass-button-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-40">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleComplete} disabled={saving}
                className="glass-button-primary flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
                {saving ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Start Tracking
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Skip */}
        {step < 3 && (
          <div className="mt-4 text-center">
            <button onClick={() => setStep(3)}
              className="text-xs text-text-muted hover:text-text-secondary hover:underline">
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

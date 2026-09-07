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
  { value: 'lose_fat', label: 'Lose Fat', desc: 'Healthy calorie deficit, high protein to keep muscle', emoji: '📉' },
  { value: 'build_muscle', label: 'Build Muscle', desc: 'Calorie surplus focused on strength training', emoji: '💪' },
  { value: 'recomp', label: 'Recomposition', desc: 'Lose fat and build muscle at the same time', emoji: '🔄' },
  { value: 'improve_fitness', label: 'Improve Fitness', desc: 'Conditioning and performance at maintenance calories', emoji: '🏃' },
  { value: 'maintain', label: 'Maintain', desc: 'Hold your current weight and stay consistent', emoji: '⚖️' },
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
          const d = String(p.dateOfBirth);
          setDateOfBirth((prev) => prev || (d.includes('T') ? d.split('T')[0] : d));
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
        router.push('/home');
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
    <div className="auth-theme-page fixed inset-0 overflow-x-hidden overflow-y-auto">
      <div className="auth-viewport-min-height flex items-center justify-center px-4 py-6">
        <div className="mx-auto w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="auth-theme-wordmark text-[clamp(28px,7vw,40px)] leading-none">
            AROGYAMANDIRAM
          </h1>
          <p className="auth-theme-muted mt-2 text-[11px] font-semibold uppercase tracking-[0.18em]">Health &amp; Wellness</p>
          <p className="auth-theme-secondary mt-4 text-sm">Let&apos;s set up your health profile</p>
        </div>

        {/* Step Indicators */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all',
                i < step ? 'auth-theme-accent-surface'
                  : i === step ? 'auth-theme-accent-surface'
                  : 'auth-theme-muted bg-white/[0.06]'
              )}>
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={cn(
                  'h-0.5 w-8 rounded-full transition-all',
                  i < step ? 'auth-theme-accent-bar' : 'bg-white/[0.08]'
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="auth-theme-card rounded-2xl p-6">
          <h2 className="mb-1 text-lg font-semibold text-text-primary">{steps[step].title}</h2>
          <p className="auth-theme-muted mb-6 text-xs">Step {step + 1} of {steps.length}</p>

          {/* Scrollable step content so step 2 (fitness goals) is usable on small screens */}
          <div className={cn('min-h-0', step === 2 && 'max-h-[50vh] overflow-y-auto overscroll-contain sm:max-h-[55vh]')}>
          {/* Step 0: Personal Info */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <label className="auth-theme-secondary text-xs font-medium">Your Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="auth-theme-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder="Enter your name" autoFocus />
              </div>
              <div>
                <label className="auth-theme-secondary text-xs font-medium">Date of birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)}
                  className="auth-theme-input date-input mt-1 w-full rounded-xl px-3 py-2.5 text-left text-sm"
                  max={new Date().toISOString().split('T')[0]} />
                <p className="auth-theme-muted mt-1 text-[10px]">Age is calculated automatically</p>
              </div>
              <div>
                <label className="auth-theme-secondary text-xs font-medium">Gender</label>
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
                          ? 'auth-theme-choice-selected'
                          : 'auth-theme-choice'
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
                <label className="auth-theme-secondary text-xs font-medium">Height (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(e.target.value)}
                  className="auth-theme-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder="170" autoFocus />
                <p className="auth-theme-muted mt-1 text-[10px]">
                  {height ? `${(parseFloat(height) / 30.48).toFixed(0)}'${Math.round((parseFloat(height) / 2.54) % 12)}"` : ''}
                </p>
              </div>
              <div>
                <label className="auth-theme-secondary text-xs font-medium">Current Weight (kg)</label>
                <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                  className="auth-theme-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder="70" step={0.1} />
              </div>
              <div>
                <label className="auth-theme-secondary text-xs font-medium">Target Weight (kg) <span className="auth-theme-muted">(optional)</span></label>
                <input type="number" value={targetWeight} onChange={(e) => setTargetWeight(e.target.value)}
                  className="auth-theme-input mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  placeholder={weight || '65'} step={0.1} />
              </div>
            </div>
          )}

          {/* Step 2: Goals */}
          {step === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="auth-theme-secondary text-xs font-medium">Activity Level</label>
                <div className="mt-2 space-y-2">
                  {activityLevels.map((al) => (
                    <button key={al.value} onClick={() => setActivityLevel(al.value)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-all',
                        activityLevel === al.value
                          ? 'auth-theme-choice-selected'
                          : 'auth-theme-choice'
                      )}>
                      <span className="text-xl">{al.emoji}</span>
                      <div>
                        <p className={cn('text-sm font-medium', activityLevel === al.value ? 'auth-theme-accent-text' : 'text-text-primary')}>
                          {al.label}
                        </p>
                        <p className="auth-theme-muted text-[11px]">{al.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="auth-theme-secondary text-xs font-medium">Goal</label>
                <div className="mt-2 space-y-2">
                  {goalOptions.map((g) => (
                    <button key={g.value} onClick={() => setGoal(g.value)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                        goal === g.value ? 'auth-theme-choice-selected' : 'auth-theme-choice'
                      )}>
                      <span className="text-xl">{g.emoji}</span>
                      <div>
                        <p className="text-sm font-medium text-text-primary">{g.label}</p>
                        <p className="auth-theme-muted text-[11px]">{g.desc}</p>
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
                <p className="auth-theme-secondary text-sm">
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
                      : '-',
                  },
                  { label: 'Gender', value: gender },
                  { label: 'Height', value: `${height} cm` },
                  { label: 'Weight', value: `${weight} kg` },
                  { label: 'Target', value: targetWeight ? `${targetWeight} kg` : 'Same as current' },
                  { label: 'Activity', value: activityLevels.find((a) => a.value === activityLevel)?.label || activityLevel },
                  { label: 'Goal', value: goalOptions.find((g) => g.value === goal)?.label || goal },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="auth-theme-muted">{item.label}</span>
                    <span className="font-medium capitalize text-text-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          </div>

          {/* Navigation Buttons */}
          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? (
              <button onClick={handleBack}
                className="auth-theme-muted flex items-center gap-1 text-sm font-medium hover:text-text-primary">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            ) : <div />}

            {step < steps.length - 1 ? (
              <button onClick={handleNext} disabled={!canProceed()}
                className="auth-theme-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-40">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={handleComplete} disabled={saving}
                className="auth-theme-primary flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold disabled:opacity-50">
                {saving ? (
                  <div className="auth-theme-spinner h-4 w-4 animate-spin rounded-full border-2" />
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
              className="auth-theme-muted text-xs hover:text-white hover:underline">
              Skip for now
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

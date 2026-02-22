'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !email || !password) {
      return showToast('Please fill in all fields', 'error');
    }
    if (!dateOfBirth) {
      return showToast('Please enter your date of birth', 'error');
    }
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age -= 1;
    if (age < 13) {
      return showToast('You must be at least 13 years old to register', 'error');
    }
    if (age > 120) {
      return showToast('Please enter a valid date of birth', 'error');
    }
    if (password.length < 8) {
      return showToast('Password must be at least 8 characters', 'error');
    }
    if (password !== confirmPassword) {
      return showToast('Passwords do not match', 'error');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, dateOfBirth, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Registration failed', 'error');
        return;
      }

      // Auto sign-in after registration
      const signInRes = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInRes?.error) {
        showToast('Account created but sign-in failed. Please sign in manually.', 'error');
        router.push('/login');
      } else {
        showToast('Welcome to Arogyamandiram!', 'success');
        router.push('/onboarding');
      }
    } catch {
      showToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-emerald/5 blur-[100px]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold">
            Join{' '}
            <span className="bg-gradient-to-r from-accent-violet to-accent-emerald bg-clip-text text-transparent">
              Arogyamandiram
            </span>
          </h1>
          <p className="mt-2 text-text-muted">Begin your wellness journey today</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card-elevated space-y-5 p-8">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="glass-input"
              autoComplete="name"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="glass-input"
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Date of birth
            </label>
            <input
              id="dateOfBirth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="glass-input"
              max={new Date().toISOString().split('T')[0]}
              required
            />
            <p className="mt-1 text-xs text-text-muted">Age is calculated automatically from this</p>
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                className="glass-input pr-10"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-text-secondary">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              className="glass-input"
              autoComplete="new-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="glass-button-primary w-full gap-2 py-3"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-violet hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

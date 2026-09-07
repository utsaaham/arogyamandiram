'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { AuthRecoveryShell } from '@/components/auth/AuthRecoveryShell';

const RESET_TOKEN_STORAGE_KEY = 'arogyamandiram-password-reset-token';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const resetToken = searchParams.get('token') || '';
    if (resetToken) {
      setToken(resetToken);
      window.sessionStorage.setItem(RESET_TOKEN_STORAGE_KEY, resetToken);
      window.history.replaceState(window.history.state, '', '/reset-password');
      return;
    }

    const storedToken = window.sessionStorage.getItem(RESET_TOKEN_STORAGE_KEY);
    if (storedToken) setToken(storedToken);
  }, [searchParams]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    if (!token) return setError('This reset link is missing or invalid. Request a new one.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json() as { error?: string };

      if (!response.ok) {
        setError(result.error || 'Unable to reset the password. Please request a new link.');
        return;
      }

      window.sessionStorage.removeItem(RESET_TOKEN_STORAGE_KEY);
      setToken('');
      setPassword('');
      setConfirmPassword('');
      setComplete(true);
    } catch {
      setError('Unable to reset the password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (complete) {
    return (
      <div className="text-center">
        <div className="auth-theme-accent-soft auth-theme-accent-text mx-auto flex h-11 w-11 items-center justify-center rounded-full">
          <LockKeyhole className="h-5 w-5" />
        </div>
        <p role="status" className="auth-theme-secondary mt-4 text-sm leading-6">
          Your password has been updated. Existing sessions will be revoked.
        </p>
        <Link
          href="/login"
          className="auth-theme-primary mt-5 flex min-h-11 w-full items-center justify-center rounded-lg px-5 text-sm font-semibold"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="new-password" className="auth-theme-secondary mb-1.5 block text-sm font-medium">
          New password
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            disabled={loading}
            className="auth-theme-input w-full rounded-lg px-3.5 pr-11 text-sm disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="auth-theme-muted absolute right-3 top-1/2 -translate-y-1/2 hover:text-white"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="auth-theme-muted mt-1 text-xs">Use at least 8 characters.</p>
      </div>

      <div>
        <label htmlFor="confirm-password" className="auth-theme-secondary mb-1.5 block text-sm font-medium">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          maxLength={72}
          required
          disabled={loading}
          className="auth-theme-input w-full rounded-lg px-3.5 text-sm disabled:opacity-60"
        />
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-accent-rose/20 bg-accent-rose/10 p-3 text-sm leading-5 text-accent-rose">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="auth-theme-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
        Update password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthRecoveryShell
      title="Choose a new password"
      description="Your reset link expires after 20 minutes and can only be used once."
    >
      <Suspense fallback={<div className="h-11 animate-pulse rounded-lg bg-white/[0.04]" />}>
        <ResetPasswordForm />
      </Suspense>
    </AuthRecoveryShell>
  );
}

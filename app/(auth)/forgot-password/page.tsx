'use client';

import { useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { AuthRecoveryShell } from '@/components/auth/AuthRecoveryShell';

const GENERIC_MESSAGE = 'If an account exists for that email, a password reset link has been sent.';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const result = await response.json() as { error?: string; message?: string };

      if (!response.ok) {
        setError(result.error || 'Unable to process the request. Please try again.');
        return;
      }

      setMessage(result.message || GENERIC_MESSAGE);
    } catch {
      setError('Unable to process the request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthRecoveryShell
      title="Reset your password"
      description="Enter your account email and we’ll send you a secure, one-time reset link."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="auth-theme-secondary mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
            disabled={loading}
            placeholder="you@example.com"
            className="auth-theme-input w-full rounded-lg px-3.5 text-sm disabled:opacity-60"
          />
        </div>

        {message && (
          <p role="status" aria-live="polite" className="rounded-lg border border-accent-emerald/20 bg-accent-emerald/10 p-3 text-sm leading-5 text-accent-emerald">
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-accent-rose/20 bg-accent-rose/10 p-3 text-sm leading-5 text-accent-rose">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || Boolean(message)}
          className="auth-theme-primary flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Send reset link
        </button>
      </form>
    </AuthRecoveryShell>
  );
}

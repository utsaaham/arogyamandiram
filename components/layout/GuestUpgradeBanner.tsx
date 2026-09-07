'use client';

import { useState } from 'react';

interface GuestUpgradeBannerProps {
  isGuest?: boolean;
}

export default function GuestUpgradeBanner({ isGuest }: GuestUpgradeBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('guestBannerDismissed') === '1';
  });
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationChallengeId, setVerificationChallengeId] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!isGuest || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem('guestBannerDismissed', '1');
    setDismissed(true);
  }

  function handleEmailChange(value: string) {
    setEmail(value);
    setVerificationCode('');
    setVerificationChallengeId('');
    setEmailVerified(false);
  }

  async function requestVerificationCode() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setError('Enter a valid email address first.');
      return;
    }
    setError('');
    setVerificationBusy(true);
    try {
      const res = await fetch('/api/auth/email-verification/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, purpose: 'guest-upgrade' }),
      });
      const json = await res.json() as { data?: { challengeId?: string }; error?: string };
      if (!res.ok || !json.data?.challengeId) {
        setError(json.error ?? 'Could not send a verification code.');
        return;
      }
      setEmail(normalizedEmail);
      setVerificationChallengeId(json.data.challengeId);
      setVerificationCode('');
      setEmailVerified(false);
    } catch {
      setError('Could not send a verification code. Please try again.');
    } finally {
      setVerificationBusy(false);
    }
  }

  async function verifyEmailCode() {
    if (!verificationChallengeId || !/^\d{6}$/.test(verificationCode)) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setError('');
    setVerificationBusy(true);
    try {
      const res = await fetch('/api/auth/email-verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: 'guest-upgrade',
          challengeId: verificationChallengeId,
          code: verificationCode,
        }),
      });
      const json = await res.json() as { data?: { verified?: boolean }; error?: string };
      if (!res.ok || !json.data?.verified) {
        setError(json.error ?? 'The verification code is incorrect.');
        return;
      }
      setEmailVerified(true);
    } catch {
      setError('Could not verify the code. Please try again.');
    } finally {
      setVerificationBusy(false);
    }
  }

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!emailVerified) {
      setError('Verify your email before saving the account.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/user/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const json = await res.json() as { success: boolean; error?: string };
      if (!json.success) {
        setError(json.error ?? 'Something went wrong');
      } else {
        setDone(true);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      setError('Network hiccup. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Banner */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[13px] text-text-secondary">
        <span className="min-w-0 flex-1">
          <strong className="text-text-primary">You&rsquo;re on a guest account.</strong>{' '}
          Add email &amp; password to access your data from any device.
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="whitespace-nowrap rounded-lg bg-accent-emerald px-3.5 py-1.5 text-xs font-semibold text-bg-primary transition-colors hover:bg-emerald-300"
        >
          Add account
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="px-1 text-lg leading-none text-text-muted transition-colors hover:text-text-primary"
        >
          ×
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="guest-upgrade-title"
            className="auth-theme-card max-h-[calc(100dvh-2rem)] w-full max-w-[380px] overflow-y-auto rounded-2xl p-7"
          >
            <h2 id="guest-upgrade-title" className="text-lg font-bold text-text-primary">
              Save your account
            </h2>
            <p className="mb-5 mt-1 text-[13px] text-text-muted">
              All your health data will be kept. You can then log in from any device.
            </p>

            {done ? (
              <p className="text-center font-semibold text-accent-emerald">
                Account saved! Reloading…
              </p>
            ) : (
              <form onSubmit={handleUpgrade} className="flex flex-col gap-3">
                <input
                  type="text"
                  placeholder="Username (e.g. john_doe)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={30}
                  className="auth-theme-input w-full rounded-xl px-3 py-2.5 text-sm"
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  required
                  className="auth-theme-input w-full rounded-xl px-3 py-2.5 text-sm"
                />
                <div className="flex gap-2">
                  {verificationChallengeId && !emailVerified && (
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-digit code"
                      aria-label="Email verification code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="auth-theme-input min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm"
                    />
                  )}
                  <button
                    type="button"
                    onClick={verificationChallengeId && !emailVerified ? verifyEmailCode : requestVerificationCode}
                    disabled={verificationBusy || emailVerified || (Boolean(verificationChallengeId) && verificationCode.length !== 6)}
                    className="shrink-0 rounded-xl border border-accent-emerald/35 bg-accent-emerald/10 px-3 py-2 text-xs font-semibold text-accent-emerald transition-colors hover:bg-accent-emerald/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verificationBusy ? 'Please wait…' : emailVerified ? 'Verified' : verificationChallengeId ? 'Verify' : 'Send code'}
                  </button>
                </div>
                {verificationChallengeId && !emailVerified && (
                  <button
                    type="button"
                    onClick={requestVerificationCode}
                    disabled={verificationBusy}
                    className="self-start text-xs text-text-muted hover:text-accent-emerald disabled:opacity-50"
                  >
                    Resend code
                  </button>
                )}
                {emailVerified && (
                  <p className="text-xs font-medium text-accent-emerald">Email verified</p>
                )}
                <input
                  type="password"
                  placeholder="Password (min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="auth-theme-input w-full rounded-xl px-3 py-2.5 text-sm"
                />
                {error && (
                  <p className="text-[13px] text-accent-rose" role="alert">{error}</p>
                )}
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-white/[0.07] hover:text-text-primary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="auth-theme-primary flex-[2] rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? 'Saving…' : 'Save account'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

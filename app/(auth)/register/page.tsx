'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';

export default function RegisterPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationChallengeId, setVerificationChallengeId] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session) router.replace('/home');
  }, [session, status, router]);

  function handleEmailChange(value: string) {
    setEmail(value);
    setVerificationCode('');
    setVerificationChallengeId('');
    setEmailVerified(false);
  }

  async function requestVerificationCode() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return showToast('Enter a valid email address first', 'error');
    }

    setVerificationBusy(true);
    try {
      const res = await fetch('/api/auth/email-verification/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, purpose: 'register' }),
      });
      const data = await res.json() as {
        success?: boolean;
        data?: { challengeId?: string };
        error?: string;
      };
      if (!res.ok || !data.data?.challengeId) {
        return showToast(data.error || 'Could not send verification code', 'error');
      }
      setEmail(normalizedEmail);
      setVerificationChallengeId(data.data.challengeId);
      setVerificationCode('');
      setEmailVerified(false);
      showToast('Verification code sent to your email', 'success');
    } catch {
      showToast('Could not send verification code. Please try again.', 'error');
    } finally {
      setVerificationBusy(false);
    }
  }

  async function verifyEmailCode() {
    if (!verificationChallengeId || !/^\d{6}$/.test(verificationCode)) {
      return showToast('Enter the 6-digit code', 'error');
    }

    setVerificationBusy(true);
    try {
      const res = await fetch('/api/auth/email-verification/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: 'register',
          challengeId: verificationChallengeId,
          code: verificationCode,
        }),
      });
      const data = await res.json() as {
        data?: { verified?: boolean };
        error?: string;
      };
      if (!res.ok || !data.data?.verified) {
        return showToast(data.error || 'The verification code is incorrect', 'error');
      }
      setEmailVerified(true);
      showToast('Email verified', 'success');
    } catch {
      showToast('Could not verify the code. Please try again.', 'error');
    } finally {
      setVerificationBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !username || !email || !password) {
      return showToast('Please fill in all fields', 'error');
    }
    const un = username.trim().toLowerCase();
    if (un.length < 3) {
      return showToast('Username must be at least 3 characters', 'error');
    }
    if (!/^[a-z0-9_]+$/.test(un)) {
      return showToast('Username can only contain letters, numbers, and underscores', 'error');
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
    if (!emailVerified) {
      return showToast('Verify your email before creating the account', 'error');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username: un,
          email: email.trim().toLowerCase(),
          dateOfBirth,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || 'Registration failed', 'error');
        return;
      }

      // Auto sign-in after registration
      const signInRes = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (!signInRes?.ok || signInRes.error) {
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

  if (status === 'loading') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: '#060806', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 'var(--sat, env(safe-area-inset-top, 0px))' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(30,221,139,0.15)', borderTopColor: '#1EDD8B', animation: 'auth-spin 0.8s linear infinite' }} />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes auth-spin { to { transform: rotate(360deg); } }
        @keyframes auth-gs { 0%,100% { background-position:0% 50%; } 50% { background-position:100% 50%; } }
        @keyframes auth-f1 { 0%,100% { transform:translate(0,0); } 25% { transform:translate(15px,-25px); } 50% { transform:translate(-10px,-40px); } 75% { transform:translate(20px,-15px); } }
        @keyframes auth-f2 { 0%,100% { transform:translate(0,0); } 33% { transform:translate(-20px,-30px); } 66% { transform:translate(15px,-20px); } }
        @keyframes auth-f3 { 0%,100% { transform:translate(0,0) scale(1); } 50% { transform:translate(10px,-35px) scale(1.2); } }
        .auth-input { width:100%; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:9px; padding:13px 14px; min-height:44px; font-size:14px; color:#F0EEEB; outline:none; transition:border-color 0.2s, background 0.2s; font-family:inherit; }
        .auth-input::placeholder { color:rgba(255,255,255,0.2); }
        .auth-input::-webkit-contacts-auto-fill-button,
        .auth-input::-webkit-credentials-auto-fill-button,
        .auth-input::-webkit-caps-lock-indicator {
          display:none!important;
          visibility:hidden!important;
          opacity:0!important;
          pointer-events:none!important;
          position:absolute!important;
          right:0!important;
        }
        .auth-input:focus { border-color:rgba(255,255,255,0.18); background:rgba(255,255,255,0.04); outline:none; }
        .auth-input::-webkit-contacts-auto-fill-button,
        .auth-input::-webkit-credentials-auto-fill-button { visibility:hidden; display:none!important; pointer-events:none; }
        .auth-input-pw { padding-right:42px; }
        .auth-btn { background:#1EDD8B; color:#060806; border:none; border-radius:9px; padding:13px 24px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.25s cubic-bezier(0.16,1,0.3,1); width:100%; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:4px; font-family:inherit; }
        .auth-btn:hover:not(:disabled) { background:#25F09A; transform:translateY(-2px); }
        .auth-btn:disabled { opacity:0.65; cursor:not-allowed; }
        .auth-link { color:#1EDD8B; text-decoration:none; }
        .auth-link:hover { text-decoration:underline; }
        .auth-hint { font-size:12px; color:#5C5A53; margin-top:4px; }
        @media(prefers-reduced-motion:reduce){
          *,*::before,*::after{animation-play-state:paused!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
        }
      `}</style>

      <main style={{ position: 'fixed', inset: 0, background: '#060806', overflowX: 'hidden', overflowY: 'auto', paddingTop: 'var(--sat, env(safe-area-inset-top, 0px))', paddingBottom: 'var(--sab, env(safe-area-inset-bottom, 0px))' }}>

        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 600, background: 'radial-gradient(ellipse, rgba(30,221,139,0.06) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Grid pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 70% 55% at 50% 35%, black 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 35%, black 20%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Floating particles */}
        <div style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: '#1EDD8B', opacity: 0.15, top: '15%', left: '12%', animation: 'auth-f1 12s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 2, height: 2, borderRadius: '50%', background: '#1EDD8B', opacity: 0.1, top: '75%', right: '15%', animation: 'auth-f2 16s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: '#1EDD8B', opacity: 0.07, top: '35%', left: '80%', animation: 'auth-f3 20s ease-in-out infinite', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontFamily: 'var(--font-outfit, Outfit, system-ui, sans-serif)', fontWeight: 800, fontSize: 'clamp(28px, 7vw, 44px)', letterSpacing: '-0.03em', lineHeight: 1.0, background: 'linear-gradient(135deg, #1EDD8B 0%, #0fa968 40%, #1EDD8B 80%, #7EFCBA 100%)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', animation: 'auth-gs 12s ease-in-out infinite' }}>
                AROGYAMANDIRAM
              </h1>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5C5A53', marginTop: 8 }}>
                Health &amp; Wellness
              </p>
              <p style={{ fontSize: 15, color: '#9B9990', marginTop: 20, lineHeight: 1.5 }}>
                Begin your wellness journey today.
              </p>
            </div>

            {/* Card */}
            <div style={{ background: '#0C0F0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px 28px 32px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div>
                  <label htmlFor="name" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#9B9990', marginBottom: 6 }}>
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="auth-input"
                    autoComplete="name"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="username" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#9B9990', marginBottom: 6 }}>
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. john_doe"
                    className="auth-input"
                    autoComplete="username"
                    aria-describedby="username-hint"
                    required
                    minLength={3}
                    maxLength={30}
                  />
                  <p id="username-hint" className="auth-hint">Letters, numbers, underscores only. Unique across the platform.</p>
                </div>

                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#9B9990', marginBottom: 6 }}>
                    Email
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => handleEmailChange(e.target.value)}
                      placeholder="you@example.com"
                      className="auth-input"
                      autoComplete="email"
                      required
                    />
                    <button
                      type="button"
                      onClick={requestVerificationCode}
                      disabled={verificationBusy || emailVerified}
                      style={{ minWidth: 92, border: '1px solid rgba(30,221,139,0.35)', borderRadius: 9, padding: '0 12px', background: 'rgba(30,221,139,0.08)', color: '#1EDD8B', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {verificationBusy && !verificationChallengeId ? 'Sending…' : verificationChallengeId ? 'Resend' : 'Send code'}
                    </button>
                  </div>
                  {verificationChallengeId && !emailVerified && (
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit code"
                        aria-label="Email verification code"
                        className="auth-input"
                        maxLength={6}
                      />
                      <button
                        type="button"
                        onClick={verifyEmailCode}
                        disabled={verificationBusy || verificationCode.length !== 6}
                        style={{ minWidth: 92, border: 'none', borderRadius: 9, padding: '0 12px', background: '#1EDD8B', color: '#060806', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {verificationBusy ? 'Checking…' : 'Verify'}
                      </button>
                    </div>
                  )}
                  {emailVerified && (
                    <p className="auth-hint" style={{ color: '#1EDD8B', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckCircle2 style={{ width: 13, height: 13 }} /> Email verified
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="dateOfBirth" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#9B9990', marginBottom: 6 }}>
                    Date of Birth
                  </label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="auth-input"
                    aria-describedby="dob-hint"
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                  <p id="dob-hint" className="auth-hint">Age is calculated automatically from this.</p>
                </div>

                <div>
                  <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#9B9990', marginBottom: 6 }}>
                    Password
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="auth-input auth-input-pw"
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                    >
                      {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#9B9990', marginBottom: 6 }}>
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="auth-input"
                    autoComplete="new-password"
                    required
                  />
                </div>

                <button type="submit" disabled={loading} className="auth-btn">
                  {loading
                    ? <Loader2 style={{ width: 16, height: 16, animation: 'auth-spin 0.8s linear infinite' }} />
                    : <UserPlus style={{ width: 16, height: 16 }} />
                  }
                  Create Account
                </button>

              </form>
            </div>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#5C5A53' }}>
              Already have an account?{' '}
              <Link href="/login" className="auth-link">Sign in</Link>
            </p>

          </div>
        </div>
      </main>
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { showToast } from '@/components/ui/Toast';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session) router.replace('/dashboard');
  }, [session, status, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return showToast('Please fill in all fields', 'error');

    setLoading(true);
    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        showToast(res.error, 'error');
      } else {
        showToast('Welcome back!', 'success');
        router.push('/dashboard');
        router.refresh();
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
        .auth-input { width:100%; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:9px; padding:11px 14px; font-size:14px; color:#F0EEEB; outline:none; transition:border-color 0.2s, background 0.2s; font-family:inherit; }
        .auth-input::placeholder { color:rgba(255,255,255,0.2); }
        .auth-input:focus { border-color:rgba(30,221,139,0.35); background:rgba(30,221,139,0.03); }
        .auth-input-pw { padding-right:42px; }
        .auth-btn { background:#1EDD8B; color:#060806; border:none; border-radius:9px; padding:13px 24px; font-size:14px; font-weight:600; cursor:pointer; transition:all 0.25s cubic-bezier(0.16,1,0.3,1); width:100%; display:flex; align-items:center; justify-content:center; gap:8px; margin-top:4px; font-family:inherit; }
        .auth-btn:hover:not(:disabled) { background:#25F09A; transform:translateY(-2px); box-shadow:0 6px 30px rgba(30,221,139,0.25); }
        .auth-btn:disabled { opacity:0.65; cursor:not-allowed; }
        .auth-link { color:#1EDD8B; text-decoration:none; }
        .auth-link:hover { text-decoration:underline; }
      `}</style>

      <main style={{ position: 'fixed', inset: 0, background: '#060806', overflowX: 'hidden', overflowY: 'auto', paddingTop: 'var(--sat, env(safe-area-inset-top, 0px))', paddingBottom: 'var(--sab, env(safe-area-inset-bottom, 0px))' }}>

        {/* Radial glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-55%)', width: 700, height: 500, background: 'radial-gradient(ellipse, rgba(30,221,139,0.07) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Grid pattern */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.018) 1px,transparent 1px)', backgroundSize: '72px 72px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 45%, black 20%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Floating particles */}
        <div style={{ position: 'absolute', width: 3, height: 3, borderRadius: '50%', background: '#1EDD8B', opacity: 0.15, top: '20%', left: '15%', animation: 'auth-f1 12s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 2, height: 2, borderRadius: '50%', background: '#1EDD8B', opacity: 0.1, top: '70%', right: '18%', animation: 'auth-f2 16s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 4, height: 4, borderRadius: '50%', background: '#1EDD8B', opacity: 0.07, top: '40%', left: '78%', animation: 'auth-f3 20s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 2, height: 2, borderRadius: '50%', background: '#1EDD8B', opacity: 0.12, top: '28%', right: '28%', animation: 'auth-f1 14s ease-in-out infinite reverse', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontFamily: 'var(--font-outfit, Outfit, system-ui, sans-serif)', fontWeight: 800, fontSize: 'clamp(28px, 7vw, 44px)', letterSpacing: '-0.03em', lineHeight: 1.0, background: 'linear-gradient(135deg, #1EDD8B 0%, #0fa968 40%, #1EDD8B 80%, #7EFCBA 100%)', backgroundSize: '200% 200%', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', animation: 'auth-gs 6s ease-in-out infinite' }}>
                AROGYAMANDIRAM
              </h1>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#5C5A53', marginTop: 8 }}>
                Health &amp; Wellness
              </p>
              <p style={{ fontSize: 15, color: '#9B9990', marginTop: 20, lineHeight: 1.5 }}>
                Welcome back. Continue your wellness journey.
              </p>
            </div>

            {/* Card */}
            <div style={{ background: '#0C0F0D', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '28px 28px 32px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#9B9990', marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="auth-input"
                    autoComplete="email"
                    required
                  />
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
                      placeholder="Enter your password"
                      className="auth-input auth-input-pw"
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 0 }}
                    >
                      {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="auth-btn">
                  {loading
                    ? <Loader2 style={{ width: 16, height: 16, animation: 'auth-spin 0.8s linear infinite' }} />
                    : <LogIn style={{ width: 16, height: 16 }} />
                  }
                  Sign In
                </button>
              </form>
            </div>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#5C5A53' }}>
              Don&apos;t have an account?{' '}
              <Link
                href="/register"
                onClick={(e) => {
                  if (e.button === 0 && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    router.push('/register');
                  }
                }}
                className="auth-link"
              >
                Create one
              </Link>
            </p>

          </div>
        </div>
      </main>
    </>
  );
}

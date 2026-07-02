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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!isGuest || dismissed) return null;

  function dismiss() {
    sessionStorage.setItem('guestBannerDismissed', '1');
    setDismissed(true);
  }

  async function handleUpgrade(e: React.FormEvent) {
    e.preventDefault();
    setError('');
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
      <div
        style={{
          background: 'var(--glass-bg, rgba(255,255,255,0.06))',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          fontSize: 13,
          color: 'var(--t2)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ color: 'var(--t1)' }}>You&rsquo;re on a guest account.</strong>{' '}
          Add email &amp; password to access your data from any device.
        </span>
        <button
          onClick={() => setOpen(true)}
          style={{
            background: 'var(--accent-violet, #7c3aed)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '5px 14px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Add account
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--t3)',
            cursor: 'pointer',
            fontSize: 18,
            lineHeight: 1,
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* Modal */}
      {open && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            style={{
              background: 'var(--bg-card, #1a1a2e)',
              border: '1px solid var(--border, rgba(255,255,255,0.1))',
              borderRadius: 12,
              padding: 28,
              width: '100%',
              maxWidth: 380,
            }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: 18, color: 'var(--t1)', fontWeight: 700 }}>
              Save your account
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--t3)' }}>
              All your health data will be kept. You can then log in from any device.
            </p>

            {done ? (
              <p style={{ color: 'var(--g, #22c55e)', fontWeight: 600, textAlign: 'center' }}>
                Account saved! Reloading…
              </p>
            ) : (
              <form onSubmit={handleUpgrade} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <input
                  type="text"
                  placeholder="Username (e.g. john_doe)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  maxLength={30}
                  style={inputStyle}
                />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
                <input
                  type="password"
                  placeholder="Password (min 8 chars)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  style={inputStyle}
                />
                {error && (
                  <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{error}</p>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    style={{ ...btnStyle, background: 'var(--glass-bg, rgba(255,255,255,0.06))', flex: 1 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ ...btnStyle, background: 'var(--accent-violet, #7c3aed)', color: '#fff', flex: 2 }}
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

const inputStyle: React.CSSProperties = {
  background: 'var(--glass-bg, rgba(255,255,255,0.04))',
  border: '1px solid var(--border, rgba(255,255,255,0.1))',
  borderRadius: 8,
  padding: '10px 12px',
  fontSize: 14,
  color: 'var(--t1)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};

const btnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '10px 16px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  color: 'var(--t1)',
};

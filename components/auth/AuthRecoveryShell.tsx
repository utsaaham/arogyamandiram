import Link from 'next/link';
import type { ReactNode } from 'react';

interface AuthRecoveryShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthRecoveryShell({ title, description, children }: AuthRecoveryShellProps) {
  return (
    <main className="auth-theme-page auth-viewport-min-height fixed inset-0 overflow-y-auto px-4 py-12">
      <div className="mx-auto flex min-h-full w-full max-w-[420px] flex-col justify-center">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="auth-theme-wordmark text-[clamp(28px,7vw,44px)] leading-none"
          >
            AROGYAMANDIRAM
          </Link>
          <p className="auth-theme-muted mt-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
            Health &amp; Wellness
          </p>
          <h1 className="mt-6 text-xl font-semibold text-text-primary">{title}</h1>
          <p className="auth-theme-secondary mt-2 text-sm leading-6">{description}</p>
        </div>

        <section className="auth-theme-card rounded-2xl p-7">
          {children}
        </section>

        <p className="auth-theme-muted mt-5 text-center text-sm">
          <Link href="/login" className="auth-theme-accent-text hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

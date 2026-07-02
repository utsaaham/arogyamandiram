import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, User } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Arogyamandiram: Open-source Health & Wellness',
  description:
    'Open-source health & wellness tracker. Food, water, workouts, sleep, weight, and smart insights, built by the community.',
};

const GITHUB_URL = 'https://github.com/utsaaham/arogyamandiram';
const CREATOR_URL = 'https://dkethan.github.io/portfolio/';

const TRUST_POINTS = ['Free forever', 'No ads', 'Open source'];

export default function SharePage() {
  return (
    <main className="relative flex min-h-screen-safe flex-col items-center justify-center overflow-hidden bg-bg-primary px-6 py-12 text-text-primary">
      {/* Ambient emerald glow */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[28%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-500/[0.08] blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center">
        {/* Wordmark */}
        <div className="flex flex-col items-center gap-3">
          <h1 className="text-[2.4rem] font-black leading-[0.95] tracking-tight text-emerald-400 sm:text-[3.25rem] lg:text-[3.75rem]">
            AROGYAMANDIRAM
          </h1>
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.28em] text-text-muted sm:text-[12px] sm:tracking-[0.34em]">
            Open Source · Health &amp; Wellness
          </p>
        </div>

        {/* CTAs */}
        <div className="flex w-full flex-col items-center gap-3 pt-1">
          <Link
            href="/"
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 py-3 text-[14px] font-bold text-bg-primary shadow-glow-emerald transition hover:bg-emerald-300 sm:px-8 sm:py-3.5 sm:text-[15px]"
          >
            Open the app
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.10] bg-transparent px-6 py-3 text-[14px] font-semibold text-text-primary transition hover:border-white/[0.18] hover:bg-white/[0.03] sm:px-8 sm:py-3.5 sm:text-[15px]"
          >
            <GithubGlyph className="h-4 w-4" />
            View on GitHub
          </a>
          <a
            href={CREATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/[0.10] bg-transparent px-6 py-3 text-[14px] font-semibold text-text-primary transition hover:border-white/[0.18] hover:bg-white/[0.03] sm:px-8 sm:py-3.5 sm:text-[15px]"
          >
            <User className="h-4 w-4" />
            Meet the creator
          </a>
        </div>

        {/* Trust trio */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2 text-[13px] text-text-secondary">
          {TRUST_POINTS.map((label) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
              {label}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}

function GithubGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297C5.37.297 0 5.67 0 12.297c0 5.302 3.438 9.8 8.205 11.387.6.111.82-.26.82-.577 0-.286-.011-1.231-.016-2.233-3.338.726-4.043-1.416-4.043-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.761-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.467-2.381 1.236-3.221-.124-.303-.535-1.527.117-3.176 0 0 1.008-.322 3.301 1.23a11.52 11.52 0 013.003-.404c1.019.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.653 1.649.243 2.873.12 3.176.77.84 1.232 1.911 1.232 3.221 0 4.61-2.807 5.624-5.479 5.921.43.371.823 1.102.823 2.222 0 1.606-.014 2.898-.014 3.293 0 .319.218.694.825.576C20.565 22.092 24 17.594 24 12.297 24 5.67 18.627.297 12 .297" />
    </svg>
  );
}

'use client';

import { ArrowUpRight, Code2 } from 'lucide-react';
import DashboardPageShell from '@/components/layout/DashboardPageShell';
import Link from 'next/link';

const GITHUB_REPO = 'https://github.com/utsaaham/arogyamandiram';

export default function ProjectPage() {
  return (
    <div className="project-page animate-fade-in flex flex-col max-lg:mobile-dash cards-stack-desktop">
      <DashboardPageShell
        title="Project"
        subtitle="Open‑source health & wellness project you can contribute to"
        icon={Code2}
        iconClassName="text-white"
        mobileVariant="card"
      />

      {/* Mobile-only: about + how to contribute + GitHub link card */}
      <div className="mobile-fade-up mobile-dash-px lg:hidden" style={{ animationDelay: '240ms' }}>
        <div className="grid grid-cols-1 gap-4">
          <div className="glass-card relative overflow-hidden rounded-2xl p-6">
            <div className="relative z-10">
              <h2 className="font-heading text-lg font-semibold text-text-primary">
                Arogyamandiram — Open source health & wellness
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                A holistic health and fitness platform to track water, calories, weight, workouts, and sleep in one place,
                with personalized guidance and smart insights.
              </p>
            </div>
          </div>

          <div className="glass-card relative overflow-hidden rounded-2xl p-6">
            <div className="relative z-10">
              <p className="text-sm font-semibold text-text-primary">How to contribute</p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
                <li>1) Open the repo on GitHub and check issues / discussions.</li>
                <li>2) Propose an improvement (UI polish, new tracker ideas, bug fixes).</li>
                <li>3) Submit a PR with screenshots and a clear test plan.</li>
              </ul>
            </div>
          </div>

          <div className="glass-card relative overflow-hidden rounded-2xl p-6">
            <div className="relative z-10">
              <p className="text-sm font-semibold text-text-primary">GitHub repository</p>
              <p className="mt-2 text-xs text-zinc-400">
                Explore the source code, open issues, and follow development on GitHub.
              </p>
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium bg-white text-black hover:bg-white/90 shadow-md"
              >
                <Code2 className="h-4 w-4" />
                Open on GitHub
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop-only: full content */}
      <div className="mobile-fade-up mobile-dash-px hidden lg:block lg:px-0" style={{ animationDelay: '240ms' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Intro – full width */}
          <div className="glass-card relative overflow-hidden rounded-2xl p-6 col-span-full">
            <div className="relative z-10">
              <h2 className="font-heading text-xl font-semibold text-text-primary">
                Arogyamandiram — Open source health & wellness
              </h2>
              <p className="mt-3 text-sm text-zinc-400 max-w-3xl">
                A holistic health and fitness platform to track water, calories, weight, workouts, and sleep in one place,
                with personalized guidance, smart insights, and an open-source foundation you can extend.
              </p>
            </div>
          </div>

          {/* How to contribute */}
          <div className="glass-card relative overflow-hidden rounded-2xl p-6 flex flex-col">
            <div className="relative z-10">
              <p className="text-sm font-semibold text-text-primary">How to contribute</p>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
                <li>1) Open the repo on GitHub and check issues / discussions.</li>
                <li>2) Propose an improvement (UI polish, new tracker ideas, bug fixes).</li>
                <li>3) Submit a PR with screenshots and a clear test plan.</li>
              </ul>
            </div>
          </div>

          {/* Quick pages */}
          <div className="glass-card relative overflow-hidden rounded-2xl p-6 flex flex-col">
            <div className="relative z-10">
              <p className="text-sm font-semibold text-text-primary">Quick pages</p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { href: '/dashboard', label: 'Dashboard' },
                  { href: '/ai-insights', label: 'Insights' },
                  { href: '/achievements', label: 'Achievements' },
                  { href: '/api-keys', label: 'API Keys' },
                  { href: '/targets', label: 'Targets' },
                  { href: '/settings', label: 'Settings' },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-center text-xs font-medium text-zinc-200 shadow-sm transition-colors hover:border-zinc-700 hover:bg-emerald-500/5 hover:text-zinc-50"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Repository */}
          <div className="glass-card relative overflow-hidden rounded-2xl p-6 flex flex-col">
            <div className="relative z-10 flex flex-1 flex-col justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">Repository</p>
                <p className="mt-2 text-xs text-zinc-400 break-all">
                  <a
                    href={GITHUB_REPO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-300 hover:text-zinc-100 hover:underline"
                  >
                    {GITHUB_REPO}
                  </a>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Star the repo, open issues for bugs or ideas, and submit pull requests. The codebase is Next.js with
                  TypeScript — clone, install, and run locally to contribute or customize for your own use.
                </p>
                <ul className="mt-3 space-y-1 text-xs text-zinc-400">
                  <li>
                    • <strong className="text-zinc-300">Issues</strong> — Report bugs or request features
                  </li>
                  <li>
                    • <strong className="text-zinc-300">Discussions</strong> — Ask questions and share ideas
                  </li>
                  <li>
                    • <strong className="text-zinc-300">Pull requests</strong> — Propose code changes
                  </li>
                </ul>
              </div>
              <div className="mt-4">
                <a
                  href={GITHUB_REPO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-medium text-black transition-colors hover:bg-emerald-400"
                >
                  <Code2 className="h-4 w-4" />
                  Open repository
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

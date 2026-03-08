'use client';

import { ArrowUpRight, Code2, Dumbbell, Droplets, Moon, Scale, Sparkles, Trophy, Utensils } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import StatCard from '@/components/ui/StatCard';
import Link from 'next/link';

const GITHUB_REPO = 'https://github.com/utsaaham/arogyamandiram';

export default function ProjectPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Project"
        subtitle="Arogyamandiram is open source — explore, contribute, and build together"
        icon={Code2}
        actions={(
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-button-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            <Code2 className="h-5 w-5" />
            GitHub
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      />

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard compact icon={Moon} label="" value="Sleep Track" subtitle="Quality and duration" iconColor="text-accent-violet" />
        <StatCard compact icon={Droplets} label="" value="Water Track" subtitle="Daily hydration" iconColor="text-accent-cyan" />
        <StatCard compact icon={Utensils} label="" value="Food Log" subtitle="Meals and macros" iconColor="text-accent-emerald" />
        <StatCard compact icon={Scale} label="" value="Weight Log" subtitle="Progress over time" iconColor="text-accent-amber" />
        <StatCard compact icon={Dumbbell} label="" value="Workout Log" subtitle="Sessions and burn" iconColor="text-accent-rose" />
        <StatCard compact icon={Trophy} label="" value="Badges Earn" subtitle="Streaks and rewards" iconColor="text-accent-amber" />
        <StatCard compact icon={Sparkles} label="" value="AI Assist" subtitle="Insights and plans" iconColor="text-accent-violet" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-stretch">
        {/* Left: about + contribute */}
        <div className="flex flex-col gap-6 lg:min-h-0">
          <div className="glass-card rounded-2xl p-6 shrink-0">
            <h2 className="font-heading text-lg font-semibold text-text-primary">
              Arogyamandiram — Open source health & wellness
            </h2>
            <p className="mt-2 text-sm text-text-muted">
              A holistic health and fitness platform to track water, calories, weight, workouts, and sleep in one place,
              with personalized guidance and smart insights.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 flex-1 min-h-0 flex flex-col">
            <p className="text-sm font-semibold text-text-primary">How to contribute</p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-text-muted">
              <li>1) Open the repo on GitHub and check issues / discussions.</li>
              <li>2) Propose an improvement (UI polish, new tracker ideas, bug fixes).</li>
              <li>3) Submit a PR with screenshots and a clear test plan.</li>
            </ul>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-button-secondary mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm"
            >
              View repository
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        {/* Right: links */}
        <div className="flex flex-col gap-6 lg:min-h-0">
          <div className="glass-card rounded-2xl p-6 shrink-0">
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
                  className="rounded-xl bg-white/[0.02] px-3 py-2 text-center text-xs font-medium text-text-secondary transition-all hover:bg-white/[0.04] hover:text-text-primary"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 flex-1 min-h-0 flex flex-col">
            <p className="text-sm font-semibold text-text-primary">Repository</p>
            <p className="mt-2 text-xs text-text-muted">
              <a
                href={GITHUB_REPO}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-violet hover:underline"
              >
                {GITHUB_REPO}
              </a>
            </p>
            <p className="mt-3 text-xs leading-relaxed text-text-muted">
              Star the repo, open issues for bugs or ideas, and submit pull requests. The codebase is Next.js with
              TypeScript — clone, install, and run locally to contribute or customize for your own use.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-text-muted">
              <li>• <strong className="text-text-secondary">Issues</strong> — Report bugs or request features</li>
              <li>• <strong className="text-text-secondary">Discussions</strong> — Ask questions and share ideas</li>
              <li>• <strong className="text-text-secondary">Pull requests</strong> — Propose code changes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

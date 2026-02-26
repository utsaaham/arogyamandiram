'use client';

import { ArrowUpRight, Code2 } from 'lucide-react';

const GITHUB_REPO = 'https://github.com/utsaaham/arogyamandiram';

export default function ProjectPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary">Project</h1>

      <div className="glass-card rounded-2xl p-6 max-w-2xl space-y-6">
        <div>
          <h2 className="font-heading text-lg font-semibold text-text-primary">
            Arogyamandiram — Open source health & wellness
          </h2>
          <p className="mt-2 text-sm text-text-muted">
            A holistic health and fitness platform to track water, calories, weight, workouts, and sleep in one place,
            with personalized guidance and smart insights.
          </p>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="text-sm text-text-secondary">
            This project is open source. You can view the code, report issues, or contribute on GitHub.
          </p>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-button-primary mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
          >
            <Code2 className="h-5 w-5" />
            View on GitHub
            <ArrowUpRight className="h-4 w-4" />
          </a>
        </div>

        <p className="text-xs text-text-muted">
          Repository:{' '}
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-violet hover:underline"
          >
            {GITHUB_REPO}
          </a>
        </p>
      </div>
    </div>
  );
}

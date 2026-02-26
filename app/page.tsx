'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Activity, Droplets, Scale, Utensils, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.replace('/dashboard');
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-violet border-t-transparent" />
      </div>
    );
  }

  const features = [
    { icon: Utensils, title: 'Food Tracking', desc: '150+ Indian foods with accurate nutrition data', color: 'text-accent-emerald' },
    { icon: Droplets, title: 'Water Intake', desc: 'Beautiful hydration tracking with reminders', color: 'text-accent-cyan' },
    { icon: Scale, title: 'Weight Journal', desc: 'Daily weigh-ins with trend visualizations', color: 'text-accent-amber' },
    { icon: Activity, title: 'Workouts', desc: 'Log exercises and track calories burned', color: 'text-accent-rose' },
    { icon: Sparkles, title: 'AI Insights', desc: 'Personalized meal and workout recommendations', color: 'text-accent-violet' },
  ];

  return (
    <div className="fixed inset-0 overflow-x-hidden overflow-y-auto">
      <main className="flex min-h-[100dvh] flex-col">
      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        {/* Gradient orbs */}
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-accent-violet/10 blur-[120px]" />
        <div className="pointer-events-none absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-accent-emerald/10 blur-[120px]" />

        <div className="relative z-10 max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-sm text-white/60">
            <Sparkles className="h-3.5 w-3.5 text-accent-violet" />
            AI-Powered Health Tracking
          </div>

          <h1 className="font-heading text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            <span className="text-text-primary">Arogya</span>
            <span className="bg-gradient-to-r from-accent-violet to-accent-emerald bg-clip-text text-transparent">
              mandiram
            </span>
          </h1>

          <p className="mt-6 text-lg text-text-secondary sm:text-xl">
            Your personal health sanctuary. Track nutrition, hydration, weight,
            and fitness with the wisdom of Indian cuisine and the power of AI.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="glass-button-primary group gap-2 px-8 py-3 text-base"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/login"
              className="glass-button-secondary px-8 py-3 text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-6 transition-all duration-300 hover:border-white/[0.08]">
              <f.icon className={`h-8 w-8 ${f.color}`} />
              <h3 className="mt-4 font-heading text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-text-muted">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-6 text-center text-sm text-text-muted">
        <p>Arogyamandiram &mdash; Wellness begins within.</p>
        <p className="mt-2">
          <a
            href="https://github.com/utsaaham/arogyamandiram"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent-violet hover:underline"
          >
            View on GitHub · Contribute
          </a>
        </p>
      </footer>
      </main>
    </div>
  );
}

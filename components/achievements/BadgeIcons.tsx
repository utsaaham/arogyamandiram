'use client';

import * as React from 'react';
import { Droplets, Dumbbell, Flame, Moon, Scale, Target, Trophy, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

type IconProps = {
  className?: string;
};

interface CardFrameProps {
  className?: string;
  gradientClass: string;
  children: React.ReactNode;
}

function CardFrame({ className, gradientClass, children }: CardFrameProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-b shadow-lg overflow-hidden',
        gradientClass,
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 mix-blend-screen" />
      <div className="relative flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

export function FoodIcon({ className }: IconProps) {
  return (
    <CardFrame className={className} gradientClass="from-emerald-400/25 to-emerald-900/80">
      <Utensils className="h-8 w-8 text-emerald-50 stroke-[1.8]" />
    </CardFrame>
  );
}

export function WaterIcon({ className }: IconProps) {
  return (
    <CardFrame className={className} gradientClass="from-sky-400/25 to-sky-900/80">
      <Droplets className="h-8 w-8 text-sky-50 stroke-[1.8]" />
    </CardFrame>
  );
}

export function WorkoutIcon({ className }: IconProps) {
  return (
    <CardFrame className={className} gradientClass="from-orange-400/25 to-orange-900/80">
      <Dumbbell className="h-8 w-8 text-orange-50 stroke-[1.8]" />
    </CardFrame>
  );
}

export function SleepIcon({ className }: IconProps) {
  return (
    <CardFrame className={className} gradientClass="from-indigo-400/25 to-slate-900/85">
      <Moon className="h-8 w-8 text-indigo-50 stroke-[1.8]" />
    </CardFrame>
  );
}

export function WeightIcon({ className }: IconProps) {
  return (
    <CardFrame className={className} gradientClass="from-zinc-300/20 to-zinc-900/85">
      <Scale className="h-8 w-8 text-zinc-50 stroke-[1.8]" />
    </CardFrame>
  );
}

export function StreakIcon({ className }: IconProps) {
  return (
    <CardFrame className={className} gradientClass="from-amber-400/25 to-rose-900/85">
      <Flame className="h-8 w-8 text-amber-50 stroke-[1.8]" />
    </CardFrame>
  );
}

export function MilestoneIcon({ className }: IconProps) {
  return (
    <CardFrame className={className} gradientClass="from-violet-400/25 to-violet-900/85">
      <Trophy className="h-8 w-8 text-violet-50 stroke-[1.8]" />
    </CardFrame>
  );
}

export function ChallengeIcon({ className }: IconProps) {
  return (
    <CardFrame className={className} gradientClass="from-fuchsia-400/25 to-fuchsia-900/85">
      <Target className="h-8 w-8 text-fuchsia-50 stroke-[1.8]" />
    </CardFrame>
  );
}


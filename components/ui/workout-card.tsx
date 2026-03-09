'use client';

import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

type WorkoutCardProps = HTMLAttributes<HTMLDivElement>;

export default function WorkoutCard({ className, ...props }: WorkoutCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-2xl bg-workout-bg text-text-primary shadow-[0_4px_20px_rgba(0,0,0,0.4)]',
        'overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}


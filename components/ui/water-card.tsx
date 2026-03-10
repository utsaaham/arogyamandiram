 'use client';

import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type WaterCardProps = HTMLAttributes<HTMLDivElement>;

export default function WaterCard({ className, ...props }: WaterCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-white/[0.04] bg-[#141B21] text-white',
        className,
      )}
      {...props}
    />
  );
}


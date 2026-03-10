'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', type = 'button', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black';

    const variantClass =
      variant === 'primary'
        ? // Premium deep red gradient for primary CTAs
          'bg-[linear-gradient(135deg,#FF4D4D,#B32D2D)] text-white shadow-[0_4px_18px_rgba(0,0,0,0.6)] hover:brightness-110 focus-visible:ring-workout-accent'
        : // Subtle bordered button that still fits the workout palette
          'border border-workout-border bg-[rgba(26,18,18,0.9)] text-neutral-200 hover:bg-[rgba(26,18,18,1)] focus-visible:ring-workout-accent';

    return (
      <button
        ref={ref}
        type={type}
        className={cn(base, variantClass, className)}
        {...props}
      />
    );
  },
);

Button.displayName = 'Button';


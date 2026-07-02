'use client';

import { cn } from '@/lib/utils';
import type { UserBadge } from '@/types';

interface BadgeCardProps {
  badge: UserBadge;
  locked?: boolean;
  onClick?: (badge: UserBadge) => void;
}

export function BadgeCard({ badge, locked, onClick }: BadgeCardProps) {
  const isLocked = locked ?? false;

  return (
    <button
      type="button"
      onClick={() => !isLocked && onClick?.(badge)}
      aria-label={isLocked ? 'Locked badge' : `${badge.name}: ${badge.description}`}
      className={cn(
        'block aspect-square w-full overflow-hidden rounded-full outline-none transition-transform duration-200',
        isLocked
          ? 'cursor-default'
          : 'cursor-pointer hover:scale-[1.03] focus-visible:scale-[1.03] focus-visible:ring-2 focus-visible:ring-amber-400/50'
      )}
    >
      {isLocked ? (
        <LockedMedallion />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/badges/${badge.id}.svg`}
          alt={badge.name}
          className="h-full w-full select-none"
          draggable={false}
        />
      )}
    </button>
  );
}

function LockedMedallion() {
  return (
    <svg viewBox="0 0 240 240" className="h-full w-full" aria-hidden="true">
      <circle cx="120" cy="120" r="112" fill="#20394A" />
      <circle
        cx="120"
        cy="120"
        r="106"
        fill="none"
        stroke="#F2E8D0"
        strokeOpacity={0.3}
        strokeWidth={2}
      />
      <circle
        cx="120"
        cy="120"
        r="80"
        fill="#F2E8D0"
        fillOpacity={0.06}
        stroke="#F2E8D0"
        strokeOpacity={0.25}
        strokeWidth={3}
      />
      <text
        x="120"
        y="148"
        textAnchor="middle"
        fontSize="72"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontWeight={700}
        fill="#F2E8D0"
        fillOpacity={0.35}
      >
        ?
      </text>
    </svg>
  );
}

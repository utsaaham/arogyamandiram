'use client';

import type { UserBadge, BadgeCategory } from '@/types';
import type { BadgeDefinition } from '@/lib/badgeDefinitions';
import { BadgeCard } from './BadgeCard';

interface BadgeGridProps {
  /** All badge definitions (source of truth for full collection). */
  allDefinitions: BadgeDefinition[];
  /** Badges the user has earned. */
  earnedBadges: UserBadge[];
  onBadgeClick?: (badge: UserBadge) => void;
}

const CATEGORY_ORDER: BadgeCategory[] = ['first', 'streak', 'milestone', 'challenge', 'other'];

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  first: 'First steps',
  streak: 'Streaks',
  milestone: 'Milestones',
  challenge: 'Challenges',
  other: 'Other',
};

/** Turn a definition into a UserBadge-shaped object for display (e.g. locked card). */
function definitionToBadge(def: BadgeDefinition): UserBadge {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    icon: def.icon,
    category: def.category,
    earnedAt: '',
  };
}

export function BadgeGrid({ allDefinitions, earnedBadges, onBadgeClick }: BadgeGridProps) {
  const earnedById = new Map<string, UserBadge>();
  for (const b of earnedBadges) {
    earnedById.set(b.id, b);
  }

  const byCategory = new Map<BadgeCategory, BadgeDefinition[]>();
  for (const def of allDefinitions) {
    const cat = def.category || 'other';
    const existing = byCategory.get(cat as BadgeCategory) ?? [];
    existing.push(def);
    byCategory.set(cat as BadgeCategory, existing);
  }

  return (
    <div className="space-y-6 overflow-visible">
      {CATEGORY_ORDER.filter((cat) => byCategory.has(cat)).map((cat) => {
        const definitions = byCategory.get(cat) ?? [];
        const earnedInCat = definitions.filter((d) => earnedById.has(d.id)).length;
        return (
          <section key={cat} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-text-primary">
                {CATEGORY_LABELS[cat]} ({earnedInCat}/{definitions.length})
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {definitions.map((def) => {
                const earned = earnedById.get(def.id);
                const badge = earned ?? definitionToBadge(def);
                const locked = !earned;
                return (
                  <BadgeCard
                    key={def.id}
                    badge={badge}
                    locked={locked}
                    onClick={locked ? undefined : onBadgeClick}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}

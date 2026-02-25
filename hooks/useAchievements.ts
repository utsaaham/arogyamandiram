import { useEffect, useState } from 'react';
import type { UserAchievements, UserBadge, ApiResponse } from '@/types';

interface AchievementsResponse {
  achievements: UserAchievements;
  newlyEarnedBadges: UserBadge[];
}

interface UseAchievementsResult {
  achievements: UserAchievements | null;
  newlyEarnedBadges: UserBadge[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAchievements(): UseAchievementsResult {
  const [achievements, setAchievements] = useState<UserAchievements | null>(null);
  const [newlyEarnedBadges, setNewlyEarnedBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/achievements', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      const json = (await res.json()) as ApiResponse<AchievementsResponse>;

      if (!res.ok || !json.success || !json.data) {
        const message = json.error || json.message || 'Failed to load achievements';
        setError(message);
        return;
      }

      setAchievements(json.data.achievements);
      setNewlyEarnedBadges(json.data.newlyEarnedBadges ?? []);
    } catch (err) {
      console.error('[useAchievements] Error fetching achievements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAchievements();
  }, []);

  return {
    achievements,
    newlyEarnedBadges,
    loading,
    error,
    refetch: fetchAchievements,
  };
}


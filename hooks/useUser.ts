'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/apiClient';
import type { SafeUser } from '@/types';

export function useUser() {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getUser();
      if (res.success && res.data) {
        setUser(res.data as SafeUser);
      } else {
        setError(res.error || 'Failed to fetch user');
      }
    } catch {
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { user, loading, error, refetch: fetchUser };
}

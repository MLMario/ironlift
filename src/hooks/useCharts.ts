/**
 * useCharts Hook
 *
 * Encapsulates chart config loading with cache-first strategy.
 * Loads chart configs from AsyncStorage cache first for instant display,
 * then fetches fresh data from Supabase in the background.
 *
 * Charts are returned as-is from the service (already sorted by order).
 */

import { useState, useEffect, useCallback } from 'react';
import type { UserChartData } from '@/types/services';
import { charts } from '@/services/charts';
import { getCachedCharts, setCachedCharts } from '@/lib/cache';

/**
 * Hook for loading and managing chart config data.
 *
 * Strategy:
 * 1. On mount, try cache first for instant display
 * 2. Fetch fresh data from Supabase
 * 3. Update cache with fresh data
 * 4. If network fails and no cache, show error
 *
 * @returns charts, loading state, error, and refresh function
 */
export function useCharts(): {
  charts: UserChartData[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [chartList, setChartList] = useState<UserChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCharts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let hasCachedData = false;

    // Step 1: Try cache first for instant display
    try {
      const cached = await getCachedCharts();
      if (cached) {
        setChartList(cached);
        setIsLoading(false);
        hasCachedData = true;
      }
    } catch {
      // Cache read failed silently -- continue to network
    }

    // Step 2: Fetch fresh data from Supabase
    try {
      const { data, error: fetchError } = await charts.getUserCharts();

      if (data) {
        setChartList(data);
        // Update cache with fresh data
        await setCachedCharts(data);
      } else if (fetchError && !hasCachedData) {
        // Network failed AND no cached data available
        setError('Failed to load charts.');
      }
    } catch {
      if (!hasCachedData) {
        setError('Failed to load charts.');
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadCharts();
  }, [loadCharts]);

  return {
    charts: chartList,
    isLoading,
    error,
    refresh: loadCharts,
  };
}

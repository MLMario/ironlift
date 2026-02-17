/**
 * useTemplates Hook
 *
 * Encapsulates template data loading with cache-first strategy.
 * Loads templates from AsyncStorage cache first for instant display,
 * then fetches fresh data from Supabase in the background.
 *
 * Templates are returned as-is from the service (already sorted by name).
 */

import { useState, useEffect, useCallback } from 'react';
import type { TemplateWithExercises } from '@/types/database';
import { templates } from '@/services/templates';
import { getCachedTemplates, setCachedTemplates } from '@/lib/cache';

function templatesChanged(prev: TemplateWithExercises[], next: TemplateWithExercises[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i], b = next[i];
    if (a.id !== b.id || a.name !== b.name ||
        a.exercises?.length !== b.exercises?.length) {
      return true;
    }
  }
  return false;
}

/**
 * Hook for loading and managing template data.
 *
 * Strategy:
 * 1. On mount, try cache first for instant display
 * 2. Fetch fresh data from Supabase
 * 3. Update cache with fresh data
 * 4. If network fails and no cache, show error
 *
 * @returns templates, loading state, error, and refresh function
 */
export function useTemplates(): {
  templates: TemplateWithExercises[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
} {
  const [templateList, setTemplateList] = useState<TemplateWithExercises[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let hasCachedData = false;

    // Step 1: Try cache first for instant display
    try {
      const cached = await getCachedTemplates();
      if (cached) {
        setTemplateList(prev => templatesChanged(prev, cached) ? cached : prev);
        setIsLoading(false);
        hasCachedData = true;
      }
    } catch {
      // Cache read failed silently -- continue to network
    }

    // Step 2: Fetch fresh data from Supabase
    try {
      const { data, error: fetchError } = await templates.getTemplates();

      if (data) {
        setTemplateList(prev => templatesChanged(prev, data) ? data : prev);
        // Update cache with fresh data
        await setCachedTemplates(data);
      } else if (fetchError && !hasCachedData) {
        // Network failed AND no cached data available
        setError('Failed to load templates. Please check your connection.');
      }
    } catch {
      if (!hasCachedData) {
        setError('Failed to load templates. Please check your connection.');
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    templates: templateList,
    isLoading,
    error,
    refresh: loadTemplates,
  };
}

/**
 * useChartData Hook
 *
 * Computes chart data for a single chart config using the existing
 * logging.getExerciseMetrics() function. Transforms the { labels, values }
 * result into ChartLineDataItem[] compatible with react-native-gifted-charts.
 *
 * Uses a cache-first pattern: shows cached data instantly, then silently
 * refreshes from the network in the background.
 */

import { useState, useEffect } from 'react';
import { logging } from '@/services/logging';
import {
  getCachedChartMetrics,
  setCachedChartMetrics,
  chartMetricsCacheKey,
} from '@/lib/cache';
import type { ChartData, UserChartData } from '@/types/services';

/**
 * Single data point for LineChart rendering.
 * Maps directly to react-native-gifted-charts lineDataItem shape.
 */
export interface ChartLineDataItem {
  value: number;
  label: string;
}

interface UseChartDataResult {
  data: ChartLineDataItem[];
  isLoading: boolean;
}

/**
 * Format a date string "YYYY-MM-DD" to "M/D" for chart x-axis labels.
 *
 * @param dateStr - ISO date string (e.g., "2026-01-15")
 * @returns Formatted label (e.g., "1/15")
 */
function formatDateLabel(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const month = parseInt(parts[1], 10);
  const day = parseInt(parts[2], 10);
  return `${month}/${day}`;
}

/**
 * Transform raw ChartData into ChartLineDataItem[] for rendering.
 *
 * @param metricsData - Raw { labels, values } from service or cache
 * @param xAxisMode - 'date' or 'session' to determine label formatting
 * @returns Array of { value, label } items for LineChart
 */
function transformToLineData(metricsData: ChartData, xAxisMode: string): ChartLineDataItem[] {
  return metricsData.labels.map((label, index) => ({
    value: metricsData.values[index],
    label:
      xAxisMode === 'date'
        ? formatDateLabel(label)
        : label.replace('Session ', ''),
  }));
}

/**
 * Hook that computes chart data for a single chart configuration.
 *
 * Calls logging.getExerciseMetrics() with the chart's exercise_id,
 * metric_type, and x_axis_mode, then transforms the result into
 * ChartLineDataItem[] for LineChart rendering.
 *
 * Uses cache-first pattern: returns cached data immediately if available,
 * then fetches fresh data from the network in the background.
 *
 * @param chart - User chart configuration with exercise_id, metric_type, x_axis_mode
 * @returns { data, isLoading } where data is an array of { value, label } items
 */
export function useChartData(chart: UserChartData): UseChartDataResult {
  const [data, setData] = useState<ChartLineDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setIsLoading(true);

      const cacheKey = chartMetricsCacheKey(
        chart.exercise_id,
        chart.metric_type,
        chart.x_axis_mode
      );

      // Cache-first: show cached data instantly
      let hasCachedData = false;
      const cached = await getCachedChartMetrics(cacheKey);
      if (!cancelled && cached) {
        setData(transformToLineData(cached, chart.x_axis_mode));
        setIsLoading(false);
        hasCachedData = true;
      }

      // Always fetch from network in the background
      const limit = chart.x_axis_mode === 'session' ? 52 : 365;
      const { data: metricsData } = await logging.getExerciseMetrics(
        chart.exercise_id,
        {
          metric: chart.metric_type,
          mode: chart.x_axis_mode,
          limit,
        }
      );

      if (cancelled) return;

      if (metricsData) {
        setData(transformToLineData(metricsData, chart.x_axis_mode));
        setCachedChartMetrics(cacheKey, metricsData);
      } else if (!hasCachedData) {
        setData([]);
      }

      setIsLoading(false);
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [chart]);

  return { data, isLoading };
}

/**
 * useChartData Hook
 *
 * Computes chart data for a single chart config using the existing
 * logging.getExerciseMetrics() function. Transforms the { labels, values }
 * result into ChartLineDataItem[] compatible with react-native-gifted-charts.
 */

import { useState, useEffect } from 'react';
import { logging } from '@/services/logging';
import type { UserChartData } from '@/types/services';

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
 * Hook that computes chart data for a single chart configuration.
 *
 * Calls logging.getExerciseMetrics() with the chart's exercise_id,
 * metric_type, and x_axis_mode, then transforms the result into
 * ChartLineDataItem[] for LineChart rendering.
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
        const items: ChartLineDataItem[] = metricsData.labels.map(
          (label, index) => ({
            value: metricsData.values[index],
            label:
              chart.x_axis_mode === 'date'
                ? formatDateLabel(label)
                : label.replace('Session ', ''),
          })
        );
        setData(items);
      } else {
        setData([]);
      }

      setIsLoading(false);
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [chart.id]);

  return { data, isLoading };
}

/**
 * ChartSection Component
 *
 * The charts section displayed on the dashboard below templates.
 * Renders a "Progress Charts" header with an "+ Add Chart" button,
 * a list of ChartCard components, and appropriate empty/loading states.
 *
 * Uses .map() instead of FlatList to avoid nested scrollable container
 * issues (this renders inside a parent ScrollView on the dashboard).
 *
 * Enforces the 25-chart maximum by conditionally showing the add button
 * or a "Maximum charts reached" label.
 */

import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { ChartCard } from '@/components/ChartCard';
import type { UserChartData } from '@/types/services';

interface ChartSectionProps {
  charts: UserChartData[];
  isLoading: boolean;
  onDelete: (chartId: string) => void;
  onAddChart: () => void;
  canAddChart: boolean;
}

export function ChartSection({
  charts,
  isLoading,
  onDelete,
  onAddChart,
  canAddChart,
}: ChartSectionProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      {/* Section header matching TemplateGrid pattern */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Progress Charts</Text>
        {canAddChart ? (
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
            ]}
            onPress={onAddChart}
          >
            <Text style={styles.addButtonText}>+ Add Chart</Text>
          </Pressable>
        ) : (
          <Text style={styles.maxReachedText}>Maximum charts reached</Text>
        )}
      </View>

      {/* Loading state */}
      {isLoading && charts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : charts.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No charts configured yet. Add a chart to track your progress on an
            exercise.
          </Text>
        </View>
      ) : (
        /* Chart list */
        <View style={styles.chartList}>
          {charts.map((chart) => (
            <ChartCard key={chart.id} chart={chart} onDelete={onDelete} />
          ))}
        </View>
      )}
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      marginTop: theme.spacing.lg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
    addButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    addButtonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    addButtonText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
    maxReachedText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
    },
    loadingContainer: {
      paddingVertical: theme.spacing.xl,
      alignItems: 'center',
    },
    emptyContainer: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: theme.typography.sizes.sm * theme.typography.lineHeights.base,
    },
    chartList: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
  });
}

/**
 * ChartCard Component
 *
 * Displays a single chart card with title, kebab menu, and LineChart rendering.
 * Uses react-native-gifted-charts LineChart with smooth curves, accent blue line,
 * gradient fill, and pointer-based tooltips.
 *
 * Handles three states:
 * - Loading: dim placeholder area
 * - Not enough data (<2 points): informational message
 * - Ready: full LineChart with all locked decision props
 */

import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { useChartData } from '@/hooks/useChartData';
import type { ChartLineDataItem } from '@/hooks/useChartData';
import { KebabMenu } from '@/components/KebabMenu';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { charts } from '@/services/charts';
import type { UserChartData } from '@/types/services';

interface ChartCardProps {
  chart: UserChartData;
  onDelete: (chartId: string) => void;
}

/**
 * Get the unit suffix for tooltip display based on metric type.
 *
 * @param metricType - The chart metric type
 * @returns Unit suffix string (e.g., " lbs", " sets")
 */
function getUnitSuffix(metricType: string): string {
  switch (metricType) {
    case 'max_volume_set':
      return ' lbs';
    case 'total_sets':
      return ' sets';
    default:
      return '';
  }
}

export function ChartCard({ chart, onDelete }: ChartCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { data, isLoading } = useChartData(chart);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const title = `${chart.exercises.name} \u2014 ${charts.getMetricDisplayName(chart.metric_type)}`;
  const unitSuffix = getUnitSuffix(chart.metric_type);

  const handleKebabDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(chart.id);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const renderChartArea = () => {
    if (isLoading) {
      return <View style={styles.placeholder} />;
    }

    if (data.length < 2) {
      return (
        <View style={styles.notEnoughData}>
          <Text style={styles.notEnoughDataText}>
            Not enough data to display chart
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.chartContainer}>
        <LineChart
          data={data}
          areaChart
          curved
          curvature={0.4}
          color="#4f9eff"
          startFillColor="rgba(79, 158, 255, 0.3)"
          endFillColor="rgba(79, 158, 255, 0.01)"
          startOpacity={0.3}
          endOpacity={0.01}
          dataPointsColor="#4f9eff"
          dataPointsRadius={4}
          height={180}
          spacing={40}
          initialSpacing={20}
          endSpacing={20}
          hideYAxisText
          xAxisLabelTextStyle={{
            color: theme.colors.textMuted,
            fontSize: 10,
          }}
          xAxisColor={theme.colors.border}
          yAxisColor="transparent"
          hideRules
          isAnimated={false}
          nestedScrollEnabled
          scrollToEnd
          pointerConfig={{
            pointerColor: '#4f9eff',
            radius: 6,
            activatePointersOnLongPress: false,
            persistPointer: true,
            showPointerStrip: true,
            pointerStripColor: theme.colors.border,
            pointerLabelComponent: (
              items: ChartLineDataItem[]
            ) => {
              const item = items[0];
              if (!item) return null;
              return (
                <View style={styles.tooltip}>
                  <Text style={styles.tooltipText}>
                    {Math.round(item.value)}
                    {unitSuffix}
                  </Text>
                </View>
              );
            },
          }}
        />
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>
        <KebabMenu onDelete={handleKebabDelete} />
      </View>

      {renderChartArea()}

      <ConfirmationModal
        visible={showDeleteConfirm}
        title="Delete Chart"
        message={`Delete "${chart.exercises.name}" chart?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    placeholder: {
      height: 180,
      backgroundColor: theme.colors.bgElevated,
      margin: theme.spacing.md,
      borderRadius: theme.radii.md,
    },
    notEnoughData: {
      height: 180,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    notEnoughDataText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
    chartContainer: {
      paddingBottom: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
    },
    tooltip: {
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderRadius: theme.radii.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    tooltipText: {
      color: '#ffffff',
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
    },
  });
}

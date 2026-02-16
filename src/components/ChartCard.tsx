/**
 * ChartCard Component
 *
 * Displays a single chart card with title, kebab menu, and LineChart rendering.
 * Uses react-native-gifted-charts LineChart with smooth curves, accent blue line,
 * gradient fill, and pointer-based tooltips.
 *
 * Handles two states:
 * - Loading: dim placeholder area
 * - Ready: full LineChart with all locked decision props
 */

import { ConfirmationModal } from "@/components/ConfirmationModal";
import { KebabMenu } from "@/components/KebabMenu";
import type { ChartLineDataItem } from "@/hooks/useChartData";
import { useChartData } from "@/hooks/useChartData";
import { charts } from "@/services/charts";
import type { Theme } from "@/theme";
import { useTheme } from "@/theme";
import type { UserChartData } from "@/types/services";
import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

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
    case "max_volume_set":
      return " lbs";
    case "total_sets":
      return " sets";
    default:
      return "";
  }
}

const INITIAL_SPACING = 10;
const MIN_LABEL_SPACING = 28;

/**
 * Thin labels for dense charts so they don't overlap.
 * Shows every Nth label based on available spacing per data point.
 * Always preserves first visible label and last label.
 */
function thinLabels(
  items: ChartLineDataItem[],
  containerWidth: number,
): ChartLineDataItem[] {
  if (items.length <= 1) return items;

  const availableWidth = containerWidth - INITIAL_SPACING;
  const spacingPerPoint = availableWidth / (items.length - 1);

  if (spacingPerPoint >= MIN_LABEL_SPACING) {
    return items;
  }

  const showEveryN = Math.ceil(MIN_LABEL_SPACING / spacingPerPoint);

  return items.map((item, index) => ({
    ...item,
    label:
      index % showEveryN === 0 || index === items.length - 1 ? item.label : "",
  }));
}

function formatYlabel(label: string): string {
  const value = Number(label);
  if (value > 1000) return `${(value / 1000).toFixed(1)}k`;
  if (value >= 100 && value < 1000) return `${value.toFixed(0)}`;
  if (value < 100) return `${value.toFixed(1)}`;
}

export function ChartCard({ chart, onDelete }: ChartCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { data, isLoading } = useChartData(chart);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const handleChartLayout = useCallback((event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setChartWidth(width);
  }, []);

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

    const thinnedData = thinLabels(data, chartWidth);
    const effectiveRadius = data.length > 50 ? 2 : data.length > 30 ? 3 : 4;

    return (
      <View style={styles.chartContainer} onLayout={handleChartLayout}>
        {chartWidth > 0 ? (
          <LineChart
            data={thinnedData}
            areaChart
            curved
            curvature={0.4}
            color="#4f9eff"
            startFillColor="rgba(79, 158, 255, 0.3)"
            endFillColor="rgba(79, 158, 255, 0.01)"
            startOpacity={0.3}
            endOpacity={0.01}
            dataPointsColor="#4f9eff"
            dataPointsRadius={effectiveRadius}
            height={180}
            adjustToWidth
            parentWidth={chartWidth - 15}
            disableScroll
            initialSpacing={INITIAL_SPACING}
            /* Y axis properties */
            yAxisLabelWidth={25}
            yAxisColor="transparent"
            hideYAxisText={false}
            formatYLabel={formatYlabel}
            yAxisTextStyle={{
              color: theme.colors.textSecondary,
              fontSize: 10,
            }}
            noOfSections={5}
            /*X Axis propertes */
            xAxisLabelTextStyle={{
              color: theme.colors.textMuted,
              fontSize: 10,
            }}
            xAxisColor={theme.colors.border}
            isAnimated={false}
            hideRules
            pointerConfig={{
              pointerColor: "#4f9eff",
              persistPointer: false,
              radius: 3,
              activatePointersOnLongPress: false,
              showPointerStrip: true,
              pointerStripColor: theme.colors.border,
              pointerLabelWidth: 80,
              autoAdjustPointerLabelPosition: true,
              pointerLabelComponent: (items: ChartLineDataItem[]) => {
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
        ) : (
          <View style={styles.placeholder} />
        )}
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
        messageAlign="center"
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
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.xs,
      paddingTop: theme.spacing.sm,
    },
    title: {
      flex: 1,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
    placeholder: {
      height: 180,
      backgroundColor: theme.colors.bgElevated,
      margin: theme.spacing.md,
      borderRadius: theme.radii.md,
    },
chartContainer: {
      paddingBottom: theme.spacing.sm,
      paddingTop: theme.spacing.xs,
    },
    tooltip: {
      backgroundColor: "rgba(0,0,0,0.8)",
      borderRadius: theme.radii.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      flexShrink: 0,
    },
    tooltipText: {
      color: "#ffffff",
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
    },
  });
}

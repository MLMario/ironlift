/**
 * SummaryStatsBar Component
 *
 * Horizontal row of three equal-width stat boxes showing
 * total workouts, total sets, and total volume.
 * Used as a sticky header in the Workout History screen.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/theme';
import { formatVolume } from '@/lib/formatters';

interface SummaryStatsBarProps {
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  isLoading?: boolean;
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: theme.colors.bgSurface,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
    },
    value: {
      color: theme.colors.accent,
      fontFamily: 'Menlo',
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
    },
    label: {
      color: theme.colors.textMuted,
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginTop: 2,
    },
  });
}

export function SummaryStatsBar({ totalWorkouts, totalSets, totalVolume }: SummaryStatsBarProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.statBox}>
        <Text style={styles.value}>{totalWorkouts}</Text>
        <Text style={styles.label}>Workouts</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.value}>{totalSets}</Text>
        <Text style={styles.label}>Sets</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.value}>{formatVolume(totalVolume)}</Text>
        <Text style={styles.label}>Volume</Text>
      </View>
    </View>
  );
}

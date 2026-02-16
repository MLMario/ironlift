/**
 * WorkoutHistoryCard Component
 *
 * Tappable card displaying a single workout entry in the history timeline.
 * Shows template name, exercise count, completed sets, and total volume badges.
 */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/theme';
import { formatVolume } from '@/lib/formatters';
import type { WorkoutHistoryItem } from '@/types/services';

interface WorkoutHistoryCardProps {
  workout: WorkoutHistoryItem;
  onPress: () => void;
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cardPressed: {
      backgroundColor: theme.colors.bgElevated,
    },
    title: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    badgeRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      flexWrap: 'wrap',
    },
    badge: {
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    badgeText: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textSecondary,
    },
  });
}

export function WorkoutHistoryCard({ workout, onPress }: WorkoutHistoryCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <Text style={styles.title}>
        {workout.template_name || 'Untitled Workout'}
      </Text>
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{workout.exercise_count} exercises</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{workout.completed_sets} sets</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{formatVolume(workout.total_volume)} vol</Text>
        </View>
      </View>
    </Pressable>
  );
}

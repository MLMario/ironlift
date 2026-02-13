/**
 * ExerciseListItem Component
 *
 * Single exercise row for the FlatList in the exercise picker modal.
 * Displays exercise name (bold) + category (muted) with an optional
 * green "CUSTOM" badge for user-created exercises. Supports disabled
 * state (dimmed, non-tappable) for already-added exercises.
 *
 * Exports ITEM_HEIGHT constant for FlatList getItemLayout optimization.
 */

import { Pressable, View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import type { Exercise } from '@/types/database';

/**
 * Fixed row height for FlatList getItemLayout optimization.
 * Enables smooth scrolling through ~1000 exercises.
 */
export const ITEM_HEIGHT = 60;

interface ExerciseListItemProps {
  exercise: Exercise;
  isDisabled: boolean;
  onPress: (exercise: Exercise) => void;
}

export function ExerciseListItem({
  exercise,
  isDisabled,
  onPress,
}: ExerciseListItemProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <Pressable
      onPress={() => onPress(exercise)}
      disabled={isDisabled}
      style={[styles.row, isDisabled && styles.rowDisabled]}
    >
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.category} numberOfLines={1}>
          {exercise.category}
        </Text>
      </View>
      {!exercise.is_system && (
        <Text style={styles.badge}>CUSTOM</Text>
      )}
    </Pressable>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      height: ITEM_HEIGHT,
    },
    rowDisabled: {
      opacity: 0.5,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 15,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
    category: {
      fontSize: theme.typography.sizes.xs,
      color: theme.colors.textMuted,
    },
    badge: {
      fontSize: 10,
      fontWeight: theme.typography.weights.semibold,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radii.full,
      backgroundColor: theme.colors.success,
      color: '#18181b',
      overflow: 'hidden',
    },
  });
}

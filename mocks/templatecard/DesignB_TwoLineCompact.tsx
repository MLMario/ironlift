/**
 * Design B: "Two-Line Compact"
 *
 * Layout: Two lines stacked — name on top, metadata + action on bottom.
 *
 *   [ Template Name                              ]
 *   [ 3 exercises                        [Start] ]
 *
 * - Card height: ~64px (two text lines + padding)
 * - Template name spans full width, truncated to 1 line
 * - Second row: exercise count left, small Start button right
 * - Swipe left reveals Edit | Delete (same as current)
 * - No exercise preview names, just the count
 *
 * Estimated height savings: ~45% vs current card
 */

import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import type { TemplateWithExercises } from '@/types/database';

const RIGHT_ACTIONS_WIDTH = 140;

interface Props {
  template: TemplateWithExercises;
  onEdit: (template: TemplateWithExercises) => void;
  onDelete: (template: TemplateWithExercises) => void;
  onStart: (template: TemplateWithExercises) => void;
}

export function TemplateCardB({ template, onEdit, onDelete, onStart }: Props) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const swipeableRef = useRef<SwipeableMethods | null>(null);
  const exerciseCount = template.exercises.length;

  function renderRightActions(
    _progress: SharedValue<number>,
    translation: SharedValue<number>
  ) {
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translation.value + RIGHT_ACTIONS_WIDTH }],
    }));

    return (
      <Animated.View style={[styles.rightActionsContainer, animatedStyle]}>
        <Pressable
          style={styles.editAction}
          onPress={() => {
            swipeableRef.current?.close();
            onEdit(template);
          }}
        >
          <Ionicons name="pencil" size={20} color={theme.colors.textPrimary} />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
        <Pressable
          style={styles.deleteAction}
          onPress={() => {
            swipeableRef.current?.close();
            onDelete(template);
          }}
        >
          <Ionicons name="trash" size={20} color={theme.colors.textPrimary} />
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      friction={2}
      overshootRight={false}
      containerStyle={styles.swipeableContainer}
    >
      <View style={styles.card}>
        {/* Row 1: Template name */}
        <Text style={styles.templateName} numberOfLines={1}>
          {template.name}
        </Text>

        {/* Row 2: exercise count + Start */}
        <View style={styles.bottomRow}>
          <Text style={styles.exerciseCount}>
            {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.startButton,
              pressed && styles.startButtonPressed,
            ]}
            onPress={() => onStart(template)}
          >
            <Text style={styles.startButtonText}>Start</Text>
          </Pressable>
        </View>
      </View>
    </ReanimatedSwipeable>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    swipeableContainer: {
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
    },
    card: {
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    templateName: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    exerciseCount: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
    },
    startButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 6,
      minHeight: 32,
      justifyContent: 'center',
      alignItems: 'center',
    },
    startButtonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    startButtonText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },

    // Swipe actions — identical to current
    rightActionsContainer: {
      flexDirection: 'row',
      width: RIGHT_ACTIONS_WIDTH,
    },
    editAction: {
      width: 70,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    deleteAction: {
      width: 70,
      backgroundColor: theme.colors.danger,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 4,
    },
    actionText: {
      fontSize: theme.typography.sizes.xs,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
  });
}

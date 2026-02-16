/**
 * Design A: "Inline Row"
 *
 * Layout: Single horizontal row — all content on one line.
 *
 *   [ Template Name          3 exercises    [Start] ]
 *                                            ^small pill button
 *
 * - Card height: ~52px (single row + padding)
 * - Template name left-aligned, truncated to 1 line
 * - Exercise count as muted text, right of name
 * - Compact "Start" pill button pinned right
 * - Swipe left reveals Edit | Delete (same as current)
 * - No exercise preview, no vertical stacking
 *
 * Estimated height savings: ~60% vs current card
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

export function TemplateCardA({ template, onEdit, onDelete, onStart }: Props) {
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
        {/* Left: name + count */}
        <View style={styles.info}>
          <Text style={styles.templateName} numberOfLines={1}>
            {template.name}
          </Text>
          <Text style={styles.exerciseCount}>
            {exerciseCount} {exerciseCount === 1 ? 'exercise' : 'exercises'}
          </Text>
        </View>

        {/* Right: compact Start pill */}
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
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingLeft: theme.spacing.md,
      paddingRight: theme.spacing.sm,
      minHeight: theme.layout.minTapTarget,
    },
    info: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
      marginRight: theme.spacing.sm,
    },
    templateName: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    exerciseCount: {
      fontSize: theme.typography.sizes.xs,
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

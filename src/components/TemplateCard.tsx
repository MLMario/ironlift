/**
 * TemplateCard Component
 *
 * A swipeable template card for the dashboard grid. Displays the template
 * name, exercise preview (first 2 exercises + "and N more"), and a Start
 * button. Swiping left reveals Edit and Delete action buttons.
 *
 * Uses ReanimatedSwipeable from react-native-gesture-handler for swipe
 * gestures with react-native-reanimated SharedValue animation.
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

/** Fixed minimum height for consistent grid alignment across 2 columns. */
export const CARD_MIN_HEIGHT = 180;

/** Total width of the right action buttons (Edit + Delete). */
const RIGHT_ACTIONS_WIDTH = 140;

interface TemplateCardProps {
  template: TemplateWithExercises;
  onEdit: (template: TemplateWithExercises) => void;
  onDelete: (template: TemplateWithExercises) => void;
  onStart: (template: TemplateWithExercises) => void;
}

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  onStart,
}: TemplateCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const exerciseCount = template.exercises.length;
  const previewExercises = template.exercises.slice(0, 2);
  const remaining = exerciseCount - 2;

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
        <View style={styles.cardBody}>
          <Text style={styles.templateName} numberOfLines={2}>
            {template.name}
          </Text>
          <View style={styles.exercisePreview}>
            {previewExercises.map((exercise) => (
              <Text
                key={exercise.exercise_id}
                style={styles.exerciseName}
                numberOfLines={1}
              >
                {exercise.name}
              </Text>
            ))}
            {remaining > 0 && (
              <Text style={styles.moreText}>
                ... and {remaining} more
              </Text>
            )}
            {exerciseCount === 0 && (
              <Text style={styles.moreText}>No exercises</Text>
            )}
          </View>
        </View>
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
      flex: 1,
      borderRadius: theme.radii.lg,
      overflow: 'hidden',
    },
    card: {
      flex: 1,
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.lg,
      minHeight: CARD_MIN_HEIGHT,
      justifyContent: 'space-between',
    },
    cardBody: {
      flex: 1,
      padding: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    templateName: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
    exercisePreview: {
      gap: 2,
    },
    exerciseName: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    },
    moreText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textMuted,
    },
    startButton: {
      backgroundColor: theme.colors.accent,
      minHeight: theme.layout.minTapTarget,
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomLeftRadius: theme.radii.lg,
      borderBottomRightRadius: theme.radii.lg,
    },
    startButtonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    startButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
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

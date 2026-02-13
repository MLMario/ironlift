/**
 * CategoryChips Component
 *
 * Horizontal scrollable category filter pills with single-select behavior.
 * Used in the exercise picker modal to filter exercises by muscle group.
 *
 * Exports two category constants:
 * - CATEGORIES: includes "All" for filter chips
 * - FORM_CATEGORIES: excludes "All" for the create exercise form dropdown
 *
 * No Cardio category -- per user decision (DB constraint excludes it).
 */

import { ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

/**
 * All categories including "All" filter option.
 * Used for category filter chips in the exercise picker.
 */
export const CATEGORIES = [
  'All',
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Arms',
  'Core',
  'Other',
] as const;

/**
 * Categories without "All" -- used for the create exercise form dropdown.
 */
export const FORM_CATEGORIES = [
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Arms',
  'Core',
  'Other',
] as const;

interface CategoryChipsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryChips({
  selectedCategory,
  onSelectCategory,
}: CategoryChipsProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((category) => {
        const isSelected = selectedCategory === category;
        return (
          <Pressable
            key={category}
            onPress={() => onSelectCategory(category)}
            style={[styles.chip, isSelected && styles.chipSelected]}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
              {category}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    chip: {
      minHeight: 36,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.radii.full,
      backgroundColor: theme.colors.bgElevated,
    },
    chipSelected: {
      backgroundColor: theme.colors.accent,
    },
    chipText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    chipTextSelected: {
      color: theme.colors.textPrimary,
    },
  });
}

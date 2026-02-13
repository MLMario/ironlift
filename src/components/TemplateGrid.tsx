/**
 * TemplateGrid Component
 *
 * 2-column FlatList grid displaying template cards with an appended "+"
 * card for creating new templates. Uses a sentinel item approach to add
 * the creation card at the end of the list.
 *
 * numColumns is hardcoded to 2 (never dynamic) per plan specification.
 */

import { FlatList, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { TemplateCard, CARD_MIN_HEIGHT } from '@/components/TemplateCard';
import type { TemplateWithExercises } from '@/types/database';

/** Sentinel item appended to the data array for the "+" create card. */
interface AddCardSentinel {
  id: '__add__';
}

type GridItem = TemplateWithExercises | AddCardSentinel;

function isAddCard(item: GridItem): item is AddCardSentinel {
  return item.id === '__add__';
}

interface TemplateGridProps {
  templates: TemplateWithExercises[];
  onEdit: (template: TemplateWithExercises) => void;
  onDelete: (template: TemplateWithExercises) => void;
  onStart: (template: TemplateWithExercises) => void;
  onCreateNew: () => void;
}

export function TemplateGrid({
  templates,
  onEdit,
  onDelete,
  onStart,
  onCreateNew,
}: TemplateGridProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const data: GridItem[] = [...templates, { id: '__add__' as const }];

  function renderItem({ item }: { item: GridItem }) {
    if (isAddCard(item)) {
      return (
        <Pressable
          style={({ pressed }) => [
            styles.addCard,
            pressed && styles.addCardPressed,
          ]}
          onPress={onCreateNew}
        >
          <Ionicons name="add" size={32} color={theme.colors.textMuted} />
          <Text style={styles.addCardText}>New Template</Text>
        </Pressable>
      );
    }

    return (
      <TemplateCard
        template={item}
        onEdit={onEdit}
        onDelete={onDelete}
        onStart={onStart}
      />
    );
  }

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: theme.spacing.sm }}
      contentContainerStyle={{
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
      }}
    />
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    addCard: {
      flex: 1,
      minHeight: CARD_MIN_HEIGHT,
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.bgPrimary,
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    addCardPressed: {
      backgroundColor: theme.colors.bgSurface,
    },
    addCardText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textMuted,
    },
  });
}

/**
 * TemplateGrid Component
 *
 * Single-column template list with a "My Templates" section header and
 * "+Create" button. Templates render full-width in a vertical FlatList.
 *
 * Replaces the previous 2-column grid with sentinel "+" card approach.
 */

import { FlatList, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { TemplateCard } from '@/components/TemplateCard';
import type { TemplateWithExercises } from '@/types/database';

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

  function renderItem({ item }: { item: TemplateWithExercises }) {
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
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Templates</Text>
        <Pressable
          style={({ pressed }) => [
            styles.createButton,
            pressed && styles.createButtonPressed,
          ]}
          onPress={onCreateNew}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </Pressable>
      </View>
      <FlatList
        data={templates}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          gap: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          paddingBottom: theme.spacing.md,
        }}
      />
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
    createButton: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    createButtonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    createButtonText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
    },
  });
}

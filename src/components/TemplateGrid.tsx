/**
 * TemplateGrid Component
 *
 * Single-column template list with a "My Templates" section header and
 * "+Create" button. Templates render full-width using .map() inside a
 * plain View (not FlatList) so it can be embedded in a parent ScrollView
 * without nested scrollable container warnings.
 */

import { TemplateCard } from "@/components/TemplateCard";
import type { Theme } from "@/theme";
import { useTheme } from "@/theme";
import type { TemplateWithExercises } from "@/types/database";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  const templateCount = templates.length;

  return (
    <View>
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

      <View style={styles.templateList}>
        <Text
          style={
            templateCount > 0
              ? styles.sectionSubTitle
              : styles.emptySectionSubTitle
          }
        >
          {templateCount > 0
            ? "Start a New Workout"
            : "Create a Workout Template to \n Start Logging"}
        </Text>
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onEdit={onEdit}
            onDelete={onDelete}
            onStart={onStart}
          />
        ))}
      </View>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    templateList: {
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: theme.spacing.md,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
      fontSize: theme.typography.sizes["2xl"],
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
    sectionSubTitle: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    emptySectionSubTitle: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
      paddingLeft: theme.spacing.xl,
      paddingRight: theme.spacing.xl,
      paddingTop: theme.spacing.xl,
      textAlign: "center",
    },
  });
}

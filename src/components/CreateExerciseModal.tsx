/**
 * CreateExerciseModal Component
 *
 * Modal for creating a new custom exercise with:
 * - Name input with validation (empty, invalid characters)
 * - Category dropdown (same pattern as inline edit)
 * - Duplicate name detection via service error
 *
 * Uses RN Modal (transparent, fade animation) with the same overlay/card
 * pattern as ConfirmationModal: rgba(0,0,0,0.6) backdrop, centered card,
 * maxWidth 340, bgSurface.
 */

import { exercises } from "@/services/exercises";
import { useTheme, type Theme } from "@/theme";
import type { ExerciseCategory } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const CATEGORIES: ExerciseCategory[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Legs",
  "Arms",
  "Core",
  "Other",
];

interface CreateExerciseModalProps {
  visible: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateExerciseModal({
  visible,
  onClose,
  onCreated,
}: CreateExerciseModalProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<ExerciseCategory>("Chest");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Reset state on modal open
  useEffect(() => {
    if (visible) {
      setName("");
      setCategory("Chest");
      setError(null);
      setShowCategoryDropdown(false);
    }
  }, [visible]);

  async function handleCreate() {
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name cannot be empty");
      return;
    }

    if (!/^[a-zA-Z0-9 -]+$/.test(trimmed)) {
      setError("Name can only contain letters, numbers, spaces, and dashes");
      return;
    }

    setIsCreating(true);
    const result = await exercises.createExercise(trimmed, category);
    setIsCreating(false);

    if (result.error) {
      const msg = result.error.message || "";
      if (msg.toLowerCase().includes("already exists")) {
        setError("An exercise with this name already exists");
      } else {
        setError("Failed to create exercise");
      }
      return;
    }

    onCreated();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Create Exercise</Text>

          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder="Exercise name"
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
          />

          {/* Category dropdown */}
          <Pressable
            style={styles.categoryDropdownTrigger}
            onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
          >
            <Text style={styles.categoryDropdownText}>{category}</Text>
            <Ionicons
              name={showCategoryDropdown ? "chevron-up" : "chevron-down"}
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>

          {showCategoryDropdown && (
            <View style={styles.categoryDropdownList}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.categoryOption,
                    category === cat && styles.categoryOptionSelected,
                  ]}
                  onPress={() => {
                    setCategory(cat);
                    setShowCategoryDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      category === cat && styles.categoryOptionTextSelected,
                    ]}
                  >
                    {cat}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>

            <Pressable
              style={styles.createButton}
              onPress={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textPrimary}
                />
              ) : (
                <Text style={styles.createButtonText}>Create</Text>
              )}
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: theme.spacing.lg,
    },
    card: {
      width: "100%",
      maxWidth: 340,
      backgroundColor: theme.colors.bgSurface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    nameInput: {
      backgroundColor: theme.colors.bgPrimary,
      color: theme.colors.textPrimary,
      borderRadius: theme.radii.md,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      fontSize: theme.typography.sizes.base,
    },
    categoryDropdownTrigger: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: theme.colors.bgPrimary,
      borderRadius: theme.radii.md,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing.sm,
    },
    categoryDropdownText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.textPrimary,
    },
    categoryDropdownList: {
      backgroundColor: theme.colors.bgPrimary,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginTop: theme.spacing.xs,
      overflow: "hidden",
    },
    categoryOption: {
      paddingVertical: theme.spacing.xs + 2,
      paddingHorizontal: theme.spacing.sm,
    },
    categoryOptionSelected: {
      backgroundColor: theme.colors.accent,
    },
    categoryOptionText: {
      fontSize: theme.typography.sizes.sm,
      color: theme.colors.textSecondary,
    },
    categoryOptionTextSelected: {
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.weights.medium,
    },
    errorText: {
      color: theme.colors.danger,
      fontSize: theme.typography.sizes.sm,
      marginTop: theme.spacing.xs,
    },
    buttonRow: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    cancelButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textSecondary,
    },
    createButton: {
      flex: 1,
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      minHeight: 44,
      justifyContent: "center",
      alignItems: "center",
    },
    createButtonText: {
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
  });
}

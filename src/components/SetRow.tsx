/**
 * SetRow Component
 *
 * A single row in the set configuration table within the template editor.
 * Displays set number, weight input, reps input, and a delete button.
 *
 * Weight and reps use numeric TextInputs with monospace font.
 * Delete button is hidden (opacity 0) when canDelete is false (minimum 1 set enforced).
 * All tap targets meet the 44px minimum.
 */

import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

interface SetRowProps {
  setNumber: number;
  weight: number;
  reps: number;
  onWeightChange: (value: number) => void;
  onRepsChange: (value: number) => void;
  onDelete: () => void;
  canDelete: boolean;
}

export function SetRow({
  setNumber,
  weight,
  reps,
  onWeightChange,
  onRepsChange,
  onDelete,
  canDelete,
}: SetRowProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const handleWeightChange = (text: string) => {
    const parsed = parseFloat(text);
    onWeightChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleRepsChange = (text: string) => {
    const parsed = parseInt(text, 10);
    onRepsChange(isNaN(parsed) ? 0 : parsed);
  };

  return (
    <View style={styles.row}>
      <View style={styles.setNumberColumn}>
        <Text style={styles.setNumberText}>{setNumber}</Text>
      </View>

      <TextInput
        style={styles.input}
        value={String(weight)}
        onChangeText={handleWeightChange}
        keyboardType="numeric"
        selectTextOnFocus
        placeholderTextColor={theme.colors.textMuted}
      />

      <TextInput
        style={styles.input}
        value={String(reps)}
        onChangeText={handleRepsChange}
        keyboardType="numeric"
        selectTextOnFocus
        placeholderTextColor={theme.colors.textMuted}
      />

      <Pressable
        onPress={onDelete}
        disabled={!canDelete}
        style={[styles.deleteButton, !canDelete && styles.deleteButtonHidden]}
        hitSlop={4}
      >
        <Ionicons
          name="trash-outline"
          size={18}
          color={theme.colors.danger}
        />
      </Pressable>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    setNumberColumn: {
      width: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    setNumberText: {
      fontSize: theme.typography.sizes.sm,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textMuted,
    },
    input: {
      flex: 1,
      height: 40,
      backgroundColor: theme.colors.bgElevated,
      borderRadius: theme.radii.md,
      textAlign: 'center',
      fontSize: theme.typography.sizes.sm,
      fontFamily: theme.typography.fontFamilyMono,
      color: theme.colors.textPrimary,
      paddingHorizontal: theme.spacing.sm,
    },
    deleteButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    deleteButtonHidden: {
      opacity: 0,
    },
  });
}

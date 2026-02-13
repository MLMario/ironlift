/**
 * DashboardHeader Component
 *
 * Sticky header for the dashboard screen. Shows the "IronLift" brand text
 * on the left (split-color: "Iron" in white, "Lift" in accent blue) and
 * a settings gear icon on the right.
 *
 * Rendered above the FlatList (not inside it) so it stays fixed while
 * the template grid scrolls independently.
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

interface DashboardHeaderProps {
  onSettingsPress: () => void;
}

export function DashboardHeader({ onSettingsPress }: DashboardHeaderProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.brandContainer}>
        <Text style={styles.brandIron}>Iron</Text>
        <Text style={styles.brandLift}>Lift</Text>
      </View>
      <Pressable
        onPress={onSettingsPress}
        style={styles.gearButton}
        hitSlop={8}
      >
        <Ionicons
          name="settings-outline"
          size={24}
          color={theme.colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.bgPrimary,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    brandContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    brandIron: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
    brandLift: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.accent,
    },
    gearButton: {
      minWidth: theme.layout.minTapTarget,
      minHeight: theme.layout.minTapTarget,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

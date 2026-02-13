/**
 * DashboardHeader Component
 *
 * Sticky header for the dashboard screen. Shows the "IronLift" brand text
 * on the left and a settings gear icon on the right.
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
      <Text style={styles.brand}>IronLift</Text>
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
    brand: {
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
    },
    gearButton: {
      minWidth: theme.layout.minTapTarget,
      minHeight: theme.layout.minTapTarget,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

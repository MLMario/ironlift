/**
 * Settings Screen
 *
 * Full-screen settings menu accessible from the dashboard gear icon.
 * Shows menu items: My Exercises, Workout History, Log Out.
 *
 * Replaces the former SettingsSheet bottom sheet overlay with standard
 * stack navigation (slides from right, back button returns to dashboard).
 */

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { auth } from '@/services/auth';

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  function handleBack() {
    router.back();
  }

  function handleMyExercises() {
    router.push('/settings/exercises');
  }

  function handleWorkoutHistory() {
    router.push('/settings/history');
  }

  function handleLogout() {
    auth.logout();
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.textPrimary}
          />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {/* My Exercises */}
        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && styles.menuItemPressed,
          ]}
          onPress={handleMyExercises}
        >
          <View style={styles.menuIcon}>
            <Ionicons
              name="list-outline"
              size={22}
              color={theme.colors.textPrimary}
            />
          </View>
          <Text style={styles.menuLabel}>My Exercises</Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textMuted}
          />
        </Pressable>

        {/* Workout History */}
        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && styles.menuItemPressed,
          ]}
          onPress={handleWorkoutHistory}
        >
          <View style={styles.menuIcon}>
            <Ionicons
              name="time-outline"
              size={22}
              color={theme.colors.textPrimary}
            />
          </View>
          <Text style={styles.menuLabel}>Workout History</Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={theme.colors.textMuted}
          />
        </Pressable>

        {/* Separator */}
        <View style={styles.separator} />

        {/* Log Out */}
        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && styles.menuItemPressed,
          ]}
          onPress={handleLogout}
        >
          <View style={styles.menuIcon}>
            <Ionicons
              name="log-out-outline"
              size={22}
              color={theme.colors.danger}
            />
          </View>
          <Text style={styles.logoutLabel}>Log Out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ============================================================================
// Styles
// ============================================================================

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      minWidth: 44,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    headerTitle: {
      flex: 1,
      fontSize: theme.typography.sizes.lg,
      fontWeight: theme.typography.weights.semibold,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    headerSpacer: {
      minWidth: 44,
    },
    menuContainer: {
      paddingTop: theme.spacing.sm,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      minHeight: 52,
    },
    menuItemPressed: {
      backgroundColor: theme.colors.bgElevated,
    },
    menuIcon: {
      width: 32,
      alignItems: 'center',
    },
    menuLabel: {
      flex: 1,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.textPrimary,
      marginLeft: theme.spacing.sm,
    },
    logoutLabel: {
      flex: 1,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
      color: theme.colors.danger,
      marginLeft: theme.spacing.sm,
    },
    separator: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.sm,
      marginHorizontal: theme.spacing.md,
    },
  });
}

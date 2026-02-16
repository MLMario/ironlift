/**
 * SettingsSheet Component
 *
 * Bottom sheet overlay on the dashboard, triggered by the gear icon.
 * Shows three menu items: My Exercises, Workout History, Log Out.
 *
 * Uses @gorhom/bottom-sheet for native gesture-driven sheet behavior.
 * Navigation callbacks are owned by the dashboard to ensure proper
 * dismiss-then-navigate sequencing.
 */

import { useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';

// ============================================================================
// Types
// ============================================================================

interface SettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  onMyExercises: () => void;
  onWorkoutHistory: () => void;
  onLogout: () => void;
}

// ============================================================================
// SettingsSheet Component
// ============================================================================

export function SettingsSheet({
  visible,
  onClose,
  onMyExercises,
  onWorkoutHistory,
  onLogout,
}: SettingsSheetProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = useMemo(() => ['35%'], []);

  // Open/close based on visible prop
  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  // Handle sheet index change -- when closed (index -1), notify parent
  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose]
  );

  // Backdrop with tap-to-dismiss
  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.6}
      />
    ),
    []
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      index={-1}
      enablePanDownToClose
      onChange={handleChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.bgSurface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.textMuted }}
    >
      <BottomSheetView style={styles.sheetContent}>
        {/* My Exercises */}
        <Pressable
          style={({ pressed }) => [
            styles.menuItem,
            pressed && styles.menuItemPressed,
          ]}
          onPress={onMyExercises}
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
          onPress={onWorkoutHistory}
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
          onPress={onLogout}
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
      </BottomSheetView>
    </BottomSheet>
  );
}

// ============================================================================
// Styles
// ============================================================================

function getStyles(theme: Theme) {
  return StyleSheet.create({
    sheetContent: {
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.lg,
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

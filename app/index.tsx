/**
 * Dashboard Screen
 *
 * The app's central hub. Displays the user's workout templates in a
 * single-column list with swipeable edit/delete actions. Users can create
 * new templates, start workouts, and access settings from here.
 *
 * Uses useFocusEffect to refresh templates when returning from template
 * editor or any other screen.
 *
 * Features:
 * - Start button navigates to /workout?templateId=<id>
 * - Crash recovery: checks AsyncStorage on mount for saved workout,
 *   shows ResumeWorkoutModal with Resume/Discard options
 *
 * States:
 * - Loading: centered spinner (no cached templates yet)
 * - Error: error message with retry
 * - Normal: "My Templates" section with cards (empty = header + no cards)
 */

import { useCallback, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { auth } from '@/services/auth';
import { templates as templatesService } from '@/services/templates';
import { useAuth } from '@/hooks/useAuth';
import { useTemplates } from '@/hooks/useTemplates';
import { useWorkoutBackup } from '@/hooks/useWorkoutBackup';
import type { WorkoutBackupData } from '@/hooks/useWorkoutBackup';
import { DashboardHeader } from '@/components/DashboardHeader';
import { TemplateGrid } from '@/components/TemplateGrid';
import { ResumeWorkoutModal } from '@/components/ResumeWorkoutModal';
import type { TemplateWithExercises } from '@/types/database';

export default function DashboardScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { user } = useAuth();
  const { templates, isLoading, error, refresh } = useTemplates();
  const backup = useWorkoutBackup(user?.id);

  // Crash recovery state
  const [resumeData, setResumeData] = useState<WorkoutBackupData | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Check for saved workout on mount (crash recovery)
  useEffect(() => {
    const checkSavedWorkout = async () => {
      if (!user?.id) return;
      const data = await backup.restore();
      if (data) {
        setResumeData(data);
        setShowResumeModal(true);
      }
    };
    checkSavedWorkout();
    // Only check on mount and when user changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Refresh templates when dashboard regains focus (e.g., after template editor modal)
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  function handleCreateNew() {
    router.push('/template-editor');
  }

  function handleEdit(template: TemplateWithExercises) {
    router.push(`/template-editor?templateId=${template.id}`);
  }

  function handleDelete(template: TemplateWithExercises) {
    Alert.alert(
      'Delete Template',
      `Delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await templatesService.deleteTemplate(template.id);
            refresh();
          },
        },
      ]
    );
  }

  function handleStart(template: TemplateWithExercises) {
    router.push(`/workout?templateId=${template.id}`);
  }

  function handleResume() {
    setShowResumeModal(false);
    router.push('/workout?restore=true');
  }

  async function handleDiscard() {
    setShowResumeModal(false);
    await backup.clear();
    setResumeData(null);
  }

  function handleSettingsPress() {
    // Temporary: wire to logout until Phase 7 settings bottom sheet
    auth.logout();
  }

  // Loading state: show spinner when loading with no cached data
  if (isLoading && templates.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader onSettingsPress={handleSettingsPress} />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // Error state: show error message with context
  if (error && templates.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <DashboardHeader onSettingsPress={handleSettingsPress} />
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DashboardHeader onSettingsPress={handleSettingsPress} />
      <TemplateGrid
        templates={templates}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStart={handleStart}
        onCreateNew={handleCreateNew}
      />
      <ResumeWorkoutModal
        visible={showResumeModal}
        templateName={resumeData?.activeWorkout?.template_name || 'Unknown'}
        startedAt={resumeData?.activeWorkout?.started_at || ''}
        onResume={handleResume}
        onDiscard={handleDiscard}
      />
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    centerContent: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    errorText: {
      fontSize: theme.typography.sizes.base,
      color: theme.colors.danger,
      textAlign: 'center',
    },
  });
}

/**
 * Dashboard Screen
 *
 * The app's central hub. Displays the user's workout templates and progress
 * charts in a single continuous ScrollView. Users can create new templates,
 * start workouts, add/delete charts, and access settings from here.
 *
 * Uses useFocusEffect to refresh both templates and charts when returning
 * from template editor or any other screen.
 *
 * Features:
 * - Start button navigates to /workout?templateId=<id>
 * - Crash recovery: checks AsyncStorage on mount for saved workout,
 *   shows ResumeWorkoutModal with Resume/Discard options
 * - Charts section with add/delete, 25-chart limit enforcement
 * - Settings bottom sheet with My Exercises, Workout History, Log Out
 *
 * States:
 * - Loading: centered spinner (no cached templates yet)
 * - Error: error message with retry
 * - Normal: "My Templates" + "Progress Charts" sections in ScrollView
 */

import { useCallback, useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useTheme } from '@/theme';
import type { Theme } from '@/theme';
import { auth } from '@/services/auth';
import { templates as templatesService } from '@/services/templates';
import { charts as chartsService } from '@/services/charts';
import { useAuth } from '@/hooks/useAuth';
import { useTemplates } from '@/hooks/useTemplates';
import { useCharts } from '@/hooks/useCharts';
import { useWorkoutBackup } from '@/hooks/useWorkoutBackup';
import type { WorkoutBackupData } from '@/hooks/useWorkoutBackup';
import { DashboardHeader } from '@/components/DashboardHeader';
import { TemplateGrid } from '@/components/TemplateGrid';
import { ChartSection } from '@/components/ChartSection';
import { AddChartSheet } from '@/components/AddChartSheet';
import { ResumeWorkoutModal } from '@/components/ResumeWorkoutModal';
import { SettingsSheet } from '@/components/SettingsSheet';
import type { TemplateWithExercises } from '@/types/database';

export default function DashboardScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { user } = useAuth();
  const { templates, isLoading, error, refresh } = useTemplates();
  const { charts: chartList, isLoading: chartsLoading, refresh: refreshCharts } = useCharts();
  const backup = useWorkoutBackup(user?.id);

  // Crash recovery state
  const [resumeData, setResumeData] = useState<WorkoutBackupData | null>(null);
  const [showResumeModal, setShowResumeModal] = useState(false);

  // Chart sheet state
  const [showAddChart, setShowAddChart] = useState(false);

  // Settings sheet state
  const [settingsOpen, setSettingsOpen] = useState(false);

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

  // Refresh templates and charts when dashboard regains focus
  useFocusEffect(
    useCallback(() => {
      refresh();
      refreshCharts();
    }, [refresh, refreshCharts])
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

  function handleAddChart() {
    setShowAddChart(true);
  }

  function handleCloseAddChart() {
    setShowAddChart(false);
  }

  function handleChartCreated() {
    refreshCharts();
  }

  async function handleDeleteChart(chartId: string) {
    await chartsService.deleteChart(chartId);
    refreshCharts();
  }

  function handleSettingsPress() {
    setSettingsOpen(true);
  }

  function handleSettingsClose() {
    setSettingsOpen(false);
  }

  function handleMyExercises() {
    setSettingsOpen(false);
    setTimeout(() => router.push('/settings/exercises'), 200);
  }

  function handleWorkoutHistory() {
    setSettingsOpen(false);
    setTimeout(() => router.push('/settings/history'), 200);
  }

  function handleLogout() {
    setSettingsOpen(false);
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TemplateGrid
          templates={templates}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onStart={handleStart}
          onCreateNew={handleCreateNew}
        />
        <ChartSection
          charts={chartList}
          isLoading={chartsLoading}
          onDelete={handleDeleteChart}
          onAddChart={handleAddChart}
          canAddChart={chartList.length < 25}
        />
      </ScrollView>
      <AddChartSheet
        visible={showAddChart}
        onClose={handleCloseAddChart}
        onChartCreated={handleChartCreated}
      />
      <ResumeWorkoutModal
        visible={showResumeModal}
        templateName={resumeData?.activeWorkout?.template_name || 'Unknown'}
        startedAt={resumeData?.activeWorkout?.started_at || ''}
        onResume={handleResume}
        onDiscard={handleDiscard}
      />
      <SettingsSheet
        visible={settingsOpen}
        onClose={handleSettingsClose}
        onMyExercises={handleMyExercises}
        onWorkoutHistory={handleWorkoutHistory}
        onLogout={handleLogout}
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
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xl,
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

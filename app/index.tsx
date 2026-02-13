import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, type Theme } from '@/theme';
import { auth } from '@/services/auth';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import type { Exercise } from '@/types/database';

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    content: {
      flex: 1,
      padding: theme.spacing.md,
      justifyContent: 'center',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.semibold,
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.base,
    },
    button: {
      backgroundColor: theme.colors.accent,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.lg,
      minHeight: theme.layout.minTapTarget,
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      maxWidth: theme.layout.containerMaxWidth,
    },
    buttonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    buttonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
    },
    logoutButton: {
      borderWidth: 1,
      borderColor: theme.colors.danger,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.lg,
      minHeight: theme.layout.minTapTarget,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      width: '100%' as const,
      maxWidth: theme.layout.containerMaxWidth,
      marginTop: theme.spacing.lg,
    },
    logoutButtonPressed: {
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
    },
    logoutText: {
      color: theme.colors.danger,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
    },
  });
}

export default function DashboardScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Placeholder -- Phase 1</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/workout')}
        >
          <Text style={styles.buttonText}>Start Workout</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/template-editor')}
        >
          <Text style={styles.buttonText}>Edit Template</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => setPickerVisible(true)}
        >
          <Text style={styles.buttonText}>Exercises</Text>
        </Pressable>

        {selectedExercise && (
          <Text style={styles.subtitle}>Selected: {selectedExercise.name}</Text>
        )}

        <Pressable
          style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
          onPress={() => auth.logout()}
        >
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </View>

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(exercise) => {
          setSelectedExercise(exercise);
          setPickerVisible(false);
        }}
      />
    </SafeAreaView>
  );
}

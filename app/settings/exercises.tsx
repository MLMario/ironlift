import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme, type Theme } from '@/theme';

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
    },
    buttonPressed: {
      backgroundColor: theme.colors.accentHover,
    },
    buttonText: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
    },
  });
}

export default function ExercisesScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>My Exercises</Text>
        <Text style={styles.subtitle}>Placeholder -- Phase 1</Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/settings/test-exercise-id')}
        >
          <Text style={styles.buttonText}>View Exercise</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Back</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

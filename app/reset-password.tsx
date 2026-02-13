import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  });
}

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>Placeholder -- Phase 2 Plan 4</Text>
      </View>
    </SafeAreaView>
  );
}

import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface SuccessBoxProps {
  message: string | null;
}

export function SuccessBox({ message }: SuccessBoxProps) {
  const theme = useTheme();

  if (!message) {
    return null;
  }

  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      backgroundColor: 'rgba(74, 222, 128, 0.1)',
      borderWidth: 1,
      borderColor: theme.colors.success,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    text: {
      color: theme.colors.success,
      fontSize: theme.typography.sizes.sm,
    },
  });
}

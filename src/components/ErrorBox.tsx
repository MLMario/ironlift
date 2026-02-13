import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface ErrorBoxProps {
  message: string | null;
}

export function ErrorBox({ message }: ErrorBoxProps) {
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
      backgroundColor: 'rgba(248, 113, 113, 0.1)',
      borderWidth: 1,
      borderColor: theme.colors.danger,
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
    },
    text: {
      color: theme.colors.danger,
      fontSize: theme.typography.sizes.sm,
    },
  });
}

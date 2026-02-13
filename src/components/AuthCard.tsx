import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface AuthCardProps {
  children: ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return <View style={styles.card}>{children}</View>;
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.bgSurface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.lg,
      maxWidth: theme.layout.containerMaxWidth,
      width: '100%',
      alignSelf: 'center',
      ...theme.shadows.md,
    },
  });
}

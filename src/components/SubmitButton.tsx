import { Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';

interface SubmitButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'danger';
}

export function SubmitButton({
  title,
  onPress,
  loading = false,
  variant = 'primary',
}: SubmitButtonProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  const bgColor =
    variant === 'primary' ? theme.colors.accent : theme.colors.danger;
  const bgColorPressed =
    variant === 'primary' ? theme.colors.accentHover : theme.colors.dangerHover;

  return (
    <Pressable
      role="button"
      aria-label={title}
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: pressed ? bgColorPressed : bgColor },
        loading && styles.buttonDisabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textPrimary} />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </Pressable>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    button: {
      minHeight: theme.layout.minTapTarget,
      alignSelf: 'stretch',
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    text: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes.base,
      fontWeight: theme.typography.weights.medium,
    },
  });
}

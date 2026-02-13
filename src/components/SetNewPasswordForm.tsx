import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { TextInputField } from '@/components/TextInputField';
import { ErrorBox } from '@/components/ErrorBox';
import { SubmitButton } from '@/components/SubmitButton';

interface SetNewPasswordFormProps {
  password: string;
  confirmPassword: string;
  onPasswordChange: (text: string) => void;
  onConfirmPasswordChange: (text: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
}

export function SetNewPasswordForm({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  error,
  loading,
  onSubmit,
}: SetNewPasswordFormProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set New Password</Text>
      <Text style={styles.subtitle}>Enter your new password below.</Text>
      <ErrorBox message={error} />
      <TextInputField
        label="New Password"
        value={password}
        onChangeText={onPasswordChange}
        secureTextEntry
        hint="Minimum 6 characters"
      />
      <TextInputField
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={onConfirmPasswordChange}
        secureTextEntry
      />
      <SubmitButton
        title="Update Password"
        loading={loading}
        onPress={onSubmit}
      />
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
    },
    subtitle: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.sm,
      textAlign: 'center',
    },
  });
}

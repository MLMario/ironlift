import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { TextInputField } from '@/components/TextInputField';
import { ErrorBox } from '@/components/ErrorBox';
import { SuccessBox } from '@/components/SuccessBox';
import { SubmitButton } from '@/components/SubmitButton';

interface ResetPasswordFormProps {
  email: string;
  onEmailChange: (text: string) => void;
  error: string | null;
  successMessage: string | null;
  loading: boolean;
  resetEmailSent: boolean;
  onSubmit: () => void;
  onBackToLogin: () => void;
}

export function ResetPasswordForm({
  email,
  onEmailChange,
  error,
  successMessage,
  loading,
  resetEmailSent,
  onSubmit,
  onBackToLogin,
}: ResetPasswordFormProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <Pressable onPress={onBackToLogin} style={styles.backLink}>
        <Text style={styles.backLinkText}>Back to login</Text>
      </Pressable>
      <Text style={styles.title}>Reset Password</Text>
      {resetEmailSent ? (
        <SuccessBox message="Password reset email sent. Check your inbox." />
      ) : (
        <View style={styles.formContent}>
          <ErrorBox message={error} />
          <SuccessBox message={successMessage} />
          <TextInputField
            label="Email"
            value={email}
            onChangeText={onEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <SubmitButton title="Send Reset Email" loading={loading} onPress={onSubmit} />
        </View>
      )}
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
    backLink: {
      alignSelf: 'flex-start',
    },
    backLinkText: {
      color: theme.colors.accent,
      fontSize: theme.typography.sizes.sm,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes.xl,
      fontWeight: theme.typography.weights.semibold,
      textAlign: 'center',
    },
    formContent: {
      gap: theme.spacing.md,
    },
  });
}

import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { TextInputField } from '@/components/TextInputField';
import { ErrorBox } from '@/components/ErrorBox';
import { SubmitButton } from '@/components/SubmitButton';

interface RegisterFormProps {
  email: string;
  password: string;
  confirmPassword: string;
  onEmailChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  onConfirmPasswordChange: (text: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
}

export function RegisterForm({
  email,
  password,
  confirmPassword,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  error,
  loading,
  onSubmit,
}: RegisterFormProps) {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <ErrorBox message={error} />
      <TextInputField
        label="Email"
        value={email}
        onChangeText={onEmailChange}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <TextInputField
        label="Password"
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
      <SubmitButton title="Create Account" loading={loading} onPress={onSubmit} />
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
  });
}

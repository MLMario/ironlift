import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/theme';
import { TextInputField } from '@/components/TextInputField';
import { ErrorBox } from '@/components/ErrorBox';
import { SubmitButton } from '@/components/SubmitButton';

interface LoginFormProps {
  email: string;
  password: string;
  onEmailChange: (text: string) => void;
  onPasswordChange: (text: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: () => void;
  onForgotPassword: () => void;
}

export function LoginForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  error,
  loading,
  onSubmit,
  onForgotPassword,
}: LoginFormProps) {
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
      />
      <Pressable onPress={onForgotPassword} style={styles.forgotPasswordLink}>
        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
      </Pressable>
      <SubmitButton title="Sign In" loading={loading} onPress={onSubmit} />
    </View>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      gap: theme.spacing.md,
    },
    forgotPasswordLink: {
      alignSelf: 'flex-end',
    },
    forgotPasswordText: {
      color: theme.colors.accent,
      fontSize: theme.typography.sizes.sm,
    },
  });
}

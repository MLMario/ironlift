import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useTheme, type Theme } from '@/theme';
import { supabase } from '@/lib/supabase';
import { auth } from '@/services/auth';
import { AuthCard } from '@/components/AuthCard';
import { SetNewPasswordForm } from '@/components/SetNewPasswordForm';
import { ErrorBox } from '@/components/ErrorBox';
import { SuccessBox } from '@/components/SuccessBox';
import { SubmitButton } from '@/components/SubmitButton';

/**
 * Extract access_token, refresh_token, and type from a Supabase deep link URL.
 *
 * Supabase sends tokens in the URL hash fragment (#), NOT query parameters (?).
 * Example: ironlift://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
 */
function extractTokensFromUrl(url: string): {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
} {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return { accessToken: null, refreshToken: null, type: null };
  }

  const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
  return {
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    type: hashParams.get('type'),
  };
}

export default function ResetPasswordScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const url = Linking.useURL();

  // State variables
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [sessionEstablished, setSessionEstablished] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);

  // Deep link token extraction and session establishment
  useEffect(() => {
    if (!url) {
      // No URL yet -- could still be loading, or no deep link was used.
      // We set an error only after we've confirmed there's no URL to parse.
      return;
    }

    const { accessToken, refreshToken } = extractTokensFromUrl(url);

    if (!accessToken || !refreshToken) {
      setTokenError(
        'No reset link found. Please request a new password reset email.'
      );
      return;
    }

    // Establish session from deep link tokens
    setLoading(true);
    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setTokenError(
            'This reset link has expired or is invalid. Please request a new password reset email.'
          );
        } else {
          setSessionEstablished(true);
        }
      })
      .catch(() => {
        setTokenError(
          'This reset link has expired or is invalid. Please request a new password reset email.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [url]);

  // Handle password update submission
  const handlePasswordUpdate = async () => {
    // Clear previous error
    setError(null);

    // Client-side validation
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await auth.updateUser(password);
    setLoading(false);

    if (result.error) {
      setError(result.error.message);
    } else {
      setPasswordUpdated(true);
    }
  };

  // Navigate to sign-in
  const handleGoToLogin = () => {
    router.replace('/sign-in');
  };

  // State 1: Loading (initial, while establishing session from deep link)
  if (!url || (loading && !sessionEstablished && !tokenError && !passwordUpdated)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  // State 2: Token error (expired/invalid link, or no tokens in URL)
  if (tokenError) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.brandHeader}>
              <Text style={styles.brandTitle}>
                <Text style={styles.brandIron}>Iron</Text>
                <Text style={styles.brandLift}>Lift</Text>
              </Text>
              <Text style={styles.brandTagline}>Track. Train. Transform.</Text>
            </View>
            <AuthCard>
              <View style={styles.cardContent}>
                <ErrorBox message={tokenError} />
                <SubmitButton
                  title="Request New Link"
                  onPress={handleGoToLogin}
                />
              </View>
            </AuthCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // State 4: Password updated successfully
  if (passwordUpdated) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.brandHeader}>
              <Text style={styles.brandTitle}>
                <Text style={styles.brandIron}>Iron</Text>
                <Text style={styles.brandLift}>Lift</Text>
              </Text>
              <Text style={styles.brandTagline}>Track. Train. Transform.</Text>
            </View>
            <AuthCard>
              <View style={styles.cardContent}>
                <SuccessBox message="Password updated successfully!" />
                <SubmitButton
                  title="Back to Login"
                  onPress={handleGoToLogin}
                />
              </View>
            </AuthCard>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // State 3: Session established, show Set New Password form
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brandHeader}>
            <Text style={styles.brandTitle}>
              <Text style={styles.brandIron}>Iron</Text>
              <Text style={styles.brandLift}>Lift</Text>
            </Text>
            <Text style={styles.brandTagline}>Track. Train. Transform.</Text>
          </View>
          <AuthCard>
            <SetNewPasswordForm
              password={password}
              confirmPassword={confirmPassword}
              onPasswordChange={setPassword}
              onConfirmPasswordChange={setConfirmPassword}
              error={error}
              loading={loading}
              onSubmit={handlePasswordUpdate}
            />
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    flex: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    brandHeader: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    brandTitle: {
      fontSize: theme.typography.sizes['3xl'],
      fontWeight: theme.typography.weights.semibold,
    },
    brandIron: {
      color: theme.colors.textPrimary,
    },
    brandLift: {
      color: theme.colors.accent,
    },
    brandTagline: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.sm,
    },
    cardContent: {
      gap: theme.spacing.md,
    },
  });
}

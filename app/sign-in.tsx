import { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { auth } from '@/services/auth';
import { AuthCard } from '@/components/AuthCard';
import { AuthTabs } from '@/components/AuthTabs';
import { LoginForm } from '@/components/LoginForm';
import { RegisterForm } from '@/components/RegisterForm';
import { ResetPasswordForm } from '@/components/ResetPasswordForm';
import { EmailVerificationModal } from '@/components/EmailVerificationModal';

type AuthView = 'login' | 'register' | 'reset';

export default function SignInScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Auth state machine
  const [authView, setAuthView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showEmailConfirmModal, setShowEmailConfirmModal] = useState(false);

  // State transitions (matching web app's switchAuthSurface)
  const handleTabChange = (tab: 'login' | 'register') => {
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setAuthView(tab);
  };

  const handleForgotPassword = () => {
    setError(null);
    setPassword('');
    setConfirmPassword('');
    setAuthView('reset');
  };

  const handleBackToLogin = () => {
    setError(null);
    setResetEmailSent(false);
    setAuthView('login');
  };

  // Form handlers
  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await auth.login(email.trim(), password);
      if (result.error) {
        setError(result.error.message);
      }
      // On success, auth state change triggers navigation automatically
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await auth.register(email.trim(), password);
      if (result.error) {
        setError(result.error.message);
      } else {
        // Show email verification modal and clear form
        setShowEmailConfirmModal(true);
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await auth.resetPassword(email.trim());
      if (result.error) {
        setError(result.error.message);
      } else {
        setResetEmailSent(true);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Email verification modal dismiss
  const handleDismissEmailModal = () => {
    setShowEmailConfirmModal(false);
    setAuthView('login');
    setError(null);
  };

  // Determine active tab for AuthTabs
  const activeTab: 'login' | 'register' =
    authView === 'register' ? 'register' : 'login';

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand header */}
          <View style={styles.brandContainer}>
            <Text style={styles.brandTitle}>
              <Text style={styles.brandIron}>Iron</Text>
              <Text style={styles.brandLift}>Lift</Text>
            </Text>
            <Text style={styles.brandTagline}>Track. Train. Transform.</Text>
          </View>

          {/* Auth card */}
          <AuthCard>
            {/* Tabs: visible for login and register views */}
            {authView !== 'reset' && (
              <View style={styles.tabsContainer}>
                <AuthTabs activeTab={activeTab} onTabChange={handleTabChange} />
              </View>
            )}

            {/* Form content area */}
            <View style={styles.formContainer}>
              {authView === 'login' && (
                <LoginForm
                  email={email}
                  password={password}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  error={error}
                  loading={loading}
                  onSubmit={handleLogin}
                  onForgotPassword={handleForgotPassword}
                />
              )}
              {authView === 'register' && (
                <RegisterForm
                  email={email}
                  password={password}
                  confirmPassword={confirmPassword}
                  onEmailChange={setEmail}
                  onPasswordChange={setPassword}
                  onConfirmPasswordChange={setConfirmPassword}
                  error={error}
                  loading={loading}
                  onSubmit={handleRegister}
                />
              )}
              {authView === 'reset' && (
                <ResetPasswordForm
                  email={email}
                  onEmailChange={setEmail}
                  error={error}
                  successMessage={null}
                  loading={loading}
                  resetEmailSent={resetEmailSent}
                  onSubmit={handleResetPassword}
                  onBackToLogin={handleBackToLogin}
                />
              )}
            </View>

            {/* Footer links: toggle between login/register */}
            {authView === 'login' && (
              <Pressable
                onPress={() => handleTabChange('register')}
                style={styles.footerLink}
              >
                <Text style={styles.footerText}>
                  Don't have an account?{' '}
                  <Text style={styles.footerAccent}>Sign up</Text>
                </Text>
              </Pressable>
            )}
            {authView === 'register' && (
              <Pressable
                onPress={() => handleTabChange('login')}
                style={styles.footerLink}
              >
                <Text style={styles.footerText}>
                  Already have an account?{' '}
                  <Text style={styles.footerAccent}>Log in</Text>
                </Text>
              </Pressable>
            )}
          </AuthCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Email verification modal */}
      <EmailVerificationModal
        visible={showEmailConfirmModal}
        onDismiss={handleDismissEmailModal}
      />
    </SafeAreaView>
  );
}

function getStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
    },
    keyboardAvoid: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.md,
    },
    brandContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
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
      color: theme.colors.textMuted,
      fontSize: theme.typography.sizes.sm,
      marginTop: theme.spacing.xs,
    },
    tabsContainer: {
      marginBottom: theme.spacing.md,
    },
    formContainer: {
      marginTop: theme.spacing.sm,
    },
    footerLink: {
      alignItems: 'center',
      marginTop: theme.spacing.lg,
    },
    footerText: {
      color: theme.colors.textSecondary,
      fontSize: theme.typography.sizes.sm,
    },
    footerAccent: {
      color: theme.colors.accent,
    },
  });
}

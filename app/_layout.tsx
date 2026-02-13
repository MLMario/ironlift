import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '@/theme';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

// Keep the native splash screen visible until auth state is resolved.
// This prevents a flash of the auth screen when the user is already logged in.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const theme = useTheme();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  // While checking initial session, return null (splash screen stays visible)
  if (isLoading) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bgPrimary },
      }}
    >
      {/* Auth screens -- shown when NOT logged in */}
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>

      {/* App screens -- shown when logged in */}
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="template-editor"
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="workout"
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="settings" />
      </Stack.Protected>

      {/* Reset password -- outside guards because setSession() during deep link
          recovery flips isLoggedIn mid-flow, which would redirect user away before
          entering new password. Declared AFTER isLoggedIn group so that on normal
          login, Expo Router finds index (first screen in isLoggedIn group) before
          reaching this unguarded screen during its redirect scan. */}
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

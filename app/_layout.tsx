import { Stack } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '@/theme';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useWriteQueue } from '@/hooks/useWriteQueue';

// Keep the native splash screen visible until auth state is resolved.
// This prevents a flash of the auth screen when the user is already logged in.
SplashScreen.preventAutoHideAsync();

// Configure notification handler for foreground display.
// Must be called at module level (outside component) per Expo docs.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function RootLayoutNav() {
  const theme = useTheme();
  const { isLoggedIn, isLoading } = useAuth();

  // Auto-sync offline write queue on foreground and connectivity changes
  useWriteQueue();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
      // Request notification permissions after auth state resolves.
      // Fire-and-forget: permission denial is handled gracefully
      // (foreground haptic + sound still works without notification permission).
      Notifications.requestPermissionsAsync();
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

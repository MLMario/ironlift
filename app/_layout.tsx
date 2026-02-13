import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { ThemeProvider, useTheme } from '@/theme';
import { supabase } from '@/lib/supabase';

function RootLayoutNav() {
  const theme = useTheme();
  // Phase 1: hardcode to true -- Phase 2 will use real auth state
  const isLoggedIn = true;

  useEffect(() => {
    // Phase 1: Supabase connection test -- log result to console
    supabase.auth.getSession().then(({ error }) => {
      if (error) {
        console.error('Supabase connection test failed:', error.message);
      } else {
        console.log('Supabase connection successful');
      }
    });
  }, []);

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
        <Stack.Screen name="create-account" />
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
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

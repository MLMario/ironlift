// Global test setup for IronLift
// Runs after Jest environment is ready (setupFilesAfterEnv)

// 1. Reanimated mock setup (must be first)
require('react-native-reanimated').setUpTests();

// 2. Gesture Handler mock setup
import 'react-native-gesture-handler/jestSetup';

// 3. AsyncStorage mock
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// 4. Environment variables (prevent Supabase client from throwing on import)
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// 5. Mock expo-sqlite localStorage (used by Supabase auth storage)
// The real module requires native SQLite bindings unavailable in Jest
jest.mock('expo-sqlite/localStorage/install', () => {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
});

// 6. Mock Supabase client (prevent real network calls and side effects in tests)
// The real module reads env vars, calls AppState.addEventListener at module scope
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
    })),
    auth: {
      getSession: jest.fn(),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  },
}));

// 7. Suppress Animated warnings in tests
// Note: Reanimated's setUpTests() handles animated mocking.
// NativeAnimatedHelper mock removed -- module path no longer exists in RN 0.81+.

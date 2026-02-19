# Phase 13: Test Harness for Unit Testing - Research

**Researched:** 2026-02-18
**Domain:** React Native / Expo unit testing with Jest and @testing-library/react-native
**Confidence:** HIGH

## Summary

This phase sets up a complete unit testing harness for the IronLift iOS app (Expo SDK 54, React 19.1, React Native 0.81.5). The standard approach for Expo projects is the `jest-expo` preset combined with `@testing-library/react-native` (RNTL). The project currently has zero test infrastructure -- no jest config, no babel config at root level, no test files.

The core stack is well-established: `jest-expo` handles Jest configuration (transform rules, module resolution, platform mocking), while RNTL v13.x provides component rendering and querying utilities with built-in Jest matchers. Since the project uses React 19.1, RNTL v13 is the correct choice (v13 supports React 18 and 19; v14 is still alpha/unstable). The `react-test-renderer` peer dependency is required by RNTL v13 and must match the React version exactly (19.1.0).

Key areas requiring attention: mocking Supabase (the app uses direct Supabase calls with `expo-sqlite/localStorage` for auth storage), mocking AsyncStorage (used extensively for cache and write queue), setting up Reanimated v4 mock via `setUpTests()`, configuring Gesture Handler's jest setup file, handling the `@/*` path alias (jest-expo auto-resolves tsconfig paths), and providing environment variables (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`) so the Supabase client module does not throw during import.

**Primary recommendation:** Use `jest-expo` preset + RNTL v13 + a shared `jest-setup.ts` file that initializes Reanimated mocks, Gesture Handler mocks, AsyncStorage mocks, Supabase client mocks, and environment variables. Include 3-4 proof-of-concept tests covering pure utility functions, service layer (with mocked Supabase), and a simple component render.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jest-expo | ~54.x (matched to SDK) | Jest preset for Expo projects | Official Expo-maintained preset; handles transforms, module resolution, platform mocking |
| jest | ^29.x | Test runner | Bundled with jest-expo; industry standard |
| @testing-library/react-native | ^13.3.x | Component rendering and queries | De facto standard for RN component testing; built-in matchers replace deprecated @testing-library/jest-native |
| react-test-renderer | 19.1.0 | React tree renderer for tests | Required peer dependency of RNTL v13; must match React version exactly |
| @types/jest | ^29.x | TypeScript types for Jest | Needed for TS test files |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/jest-native | DO NOT INSTALL | Deprecated custom matchers | Deprecated; matchers are now built into RNTL v13+. Do not install. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jest-expo | bare jest + manual RN config | Much more configuration work; jest-expo handles transformIgnorePatterns, module mocking, platform presets automatically |
| RNTL v13 | RNTL v14 | v14 is alpha-only, explicitly warned against by maintainers; not production-ready |
| Manual Supabase mocks | MSW (Mock Service Worker) | MSW is heavier setup for this use case; manual jest.mock is simpler for service-layer tests |

**Installation:**
```bash
npx expo install jest-expo jest @types/jest -- --save-dev
npm install --save-dev @testing-library/react-native react-test-renderer@19.1.0
```

Note: `npx expo install` pins jest-expo to the correct version for SDK 54. `react-test-renderer` must be installed at exactly 19.1.0 to match the project's React version. If peer dependency warnings occur, they can be safely ignored (React 19 deprecated react-test-renderer but it still functions).

## Architecture Patterns

### Recommended Test File Structure
```
__tests__/
  lib/
    formatters.test.ts       # Pure utility tests
    timeUtils.test.ts         # Pure utility tests
    cache.test.ts             # AsyncStorage-backed cache tests
  services/
    writeQueue.test.ts        # Service layer with mocked deps
  components/
    SubmitButton.test.tsx     # Simple component render test
jest-setup.ts                 # Global test setup (mocks, env vars)
jest.config.ts                # Jest configuration
```

**Key rule from Expo Router docs:** "Do NOT put test files inside the `app/` directory." All files in `app/` must be routes or layouts. Tests go in a top-level `__tests__/` directory or use `.test.ts(x)` suffix outside `app/`.

### Pattern 1: Jest Configuration File
**What:** Centralized Jest config using `jest.config.ts`
**When to use:** Always -- single source of truth for test configuration
**Example:**
```typescript
// jest.config.ts
// Source: https://docs.expo.dev/develop/unit-testing/
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterSetup: ['<rootDir>/jest-setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-gifted-charts)',
  ],
};

export default config;
```

### Pattern 2: Global Test Setup File
**What:** Setup file that runs before all tests to initialize mocks and environment
**When to use:** Always -- required for Reanimated, Gesture Handler, AsyncStorage, Supabase mocks
**Example:**
```typescript
// jest-setup.ts

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
jest.mock('expo-sqlite/localStorage/install', () => {
  // Provide a minimal localStorage mock in global scope
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };
});

// 6. Mock Supabase client (prevent real network calls in tests)
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
      onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    },
  },
}));

// 7. Suppress React Native console warnings in tests
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
```

### Pattern 3: Testing Pure Utility Functions
**What:** Direct function tests with no mocking needed
**When to use:** For files in `src/lib/` that have no RN/Supabase dependencies
**Example:**
```typescript
// __tests__/lib/timeUtils.test.ts
import { formatTime, parseTimeInput, clampSeconds } from '@/lib/timeUtils';

describe('formatTime', () => {
  it('formats seconds to M:SS', () => {
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(45)).toBe('0:45');
    expect(formatTime(0)).toBe('0:00');
  });

  it('clamps negative input to 0', () => {
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('parseTimeInput', () => {
  it('parses plain seconds', () => {
    expect(parseTimeInput('90')).toBe(90);
  });

  it('parses M:SS format', () => {
    expect(parseTimeInput('1:30')).toBe(90);
  });

  it('returns null for empty/invalid input', () => {
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('abc')).toBeNull();
  });
});
```

### Pattern 4: Testing Service Functions with Mocked Dependencies
**What:** Test service logic by mocking external dependencies (Supabase, AsyncStorage)
**When to use:** For files in `src/services/` and `src/lib/cache.ts`
**Example:**
```typescript
// __tests__/services/writeQueue.test.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { enqueue, getQueue, clearQueue } from '@/services/writeQueue';

// AsyncStorage is auto-mocked by jest-setup.ts

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('writeQueue', () => {
  it('enqueues an entry', async () => {
    await enqueue({
      id: 'test-uuid',
      type: 'workout_log',
      payload: { /* mock payload */ } as any,
      created_at: new Date().toISOString(),
    });

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('test-uuid');
    expect(queue[0].attempts).toBe(0);
  });

  it('clears the queue', async () => {
    await enqueue({
      id: 'test-uuid',
      type: 'workout_log',
      payload: {} as any,
      created_at: new Date().toISOString(),
    });

    await clearQueue();
    const queue = await getQueue();
    expect(queue).toHaveLength(0);
  });
});
```

### Pattern 5: Testing Components with ThemeProvider Wrapper
**What:** Component tests need the ThemeProvider context that wraps the entire app
**When to use:** For any component that calls `useTheme()`
**Example:**
```typescript
// __tests__/helpers/render.tsx
import React from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';

function AllProviders({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

const customRender = (ui: React.ReactElement, options?: RenderOptions) =>
  render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from RNTL
export * from '@testing-library/react-native';
// Override render with custom version
export { customRender as render };
```

### Anti-Patterns to Avoid
- **Testing inside `app/` directory:** Expo Router treats all files in `app/` as routes. Tests there will cause build errors.
- **Installing `@testing-library/jest-native`:** This package is deprecated. Its matchers are built into RNTL v13+. Installing it creates conflicts.
- **Mocking entire React Native modules manually:** Use `jest-expo` preset which provides correct mocks automatically. Only mock specific modules when the preset's mocks are insufficient.
- **Testing implementation details:** Don't test internal state management or private functions. Test visible behavior (rendered output, function return values, callback invocations).
- **Importing from `@/lib/supabase` in test files directly:** The Supabase client module has side effects (AppState listener). Always mock it globally in `jest-setup.ts`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Jest configuration for RN | Manual transforms/mocks | `jest-expo` preset | Handles 50+ edge cases in RN module resolution, transforms, platform-specific mocking |
| AsyncStorage mock | In-memory key-value store | `@react-native-async-storage/async-storage/jest/async-storage-mock` | Official mock with proper method signatures; tracks calls for assertions |
| Reanimated test setup | Manual animated value mocks | `require('react-native-reanimated').setUpTests()` | Official setup handles all internal mocking, provides `toHaveAnimatedStyle` matcher |
| Gesture Handler mocks | Manual native module stubs | `react-native-gesture-handler/jestSetup.js` | Official setup file handles native module mocking |
| Component test rendering with providers | Manual `<ThemeProvider>` wrapping in every test | Custom `render` helper with `wrapper` option | Cleaner tests, single maintenance point |
| Path alias resolution (`@/*`) | Manual `moduleNameMapper` | `jest-expo` reads `tsconfig.json` `paths` automatically | Verified: jest-expo auto-converts TS paths to Jest moduleNameMapper |

**Key insight:** The Expo ecosystem provides official test infrastructure for all its native modules. Manually mocking native modules is error-prone and breaks on upgrades.

## Common Pitfalls

### Pitfall 1: Missing transformIgnorePatterns for third-party RN libraries
**What goes wrong:** Jest fails with "SyntaxError: Unexpected token" when importing libraries like `react-native-gifted-charts`, `react-native-svg`, or `react-native-reanimated`.
**Why it happens:** These libraries ship un-transpiled ES module code. Jest's default transform ignores everything in `node_modules/`.
**How to avoid:** Extend `transformIgnorePatterns` to include ALL React Native libraries used in the project. The regex pattern must be maintained as new dependencies are added.
**Warning signs:** `SyntaxError: Cannot use import statement outside a module` or `Unexpected token 'export'`.

### Pitfall 2: Supabase Client Side Effects on Import
**What goes wrong:** Tests crash with "Missing Supabase env vars" error when any module that imports from `@/services/*` is loaded.
**Why it happens:** `src/lib/supabase.ts` reads `process.env.EXPO_PUBLIC_SUPABASE_URL` at module load time and throws if missing. It also calls `AppState.addEventListener` at module scope.
**How to avoid:** Set environment variables in `jest-setup.ts` BEFORE any test imports. Mock `@/lib/supabase` globally to prevent the real module from loading.
**Warning signs:** "Missing Supabase env vars" or "Cannot read property 'addEventListener' of undefined".

### Pitfall 3: expo-sqlite/localStorage/install Side Effect
**What goes wrong:** Tests crash when importing anything that eventually imports `@/lib/supabase` because `expo-sqlite/localStorage/install` tries to set up a native SQLite-backed localStorage.
**Why it happens:** The Supabase client uses `expo-sqlite/localStorage/install` for auth token storage (imported at line 1 of `supabase.ts`). This module requires native SQLite bindings unavailable in Jest.
**How to avoid:** Mock `expo-sqlite/localStorage/install` in `jest-setup.ts` with a simple in-memory localStorage polyfill.
**Warning signs:** Native module errors referencing SQLite or `ExpoSQLite`.

### Pitfall 4: react-test-renderer Version Mismatch with React 19.1
**What goes wrong:** Tests fail with "react-test-renderer and React versions must match" or similar peer dependency errors.
**Why it happens:** `react-test-renderer` must be the exact same version as `react`. The project uses React 19.1.0.
**How to avoid:** Install `react-test-renderer@19.1.0` explicitly. Note: React 19 shows deprecation warnings for react-test-renderer but it still works.
**Warning signs:** Peer dependency warnings during `npm install`, runtime errors about mismatched React versions.

### Pitfall 5: Tests Inside app/ Directory
**What goes wrong:** Expo Router tries to register test files as routes, causing build errors or unexpected navigation behavior.
**Why it happens:** Expo Router auto-discovers all files in `app/` as route components.
**How to avoid:** Place ALL test files in `__tests__/` at project root or use a separate `tests/` directory. Never put `.test.ts(x)` files in `app/`.
**Warning signs:** Mysterious route registration errors, extra routes appearing in navigation.

### Pitfall 6: RNTL v13 concurrentRoot Default with React 19
**What goes wrong:** Tests that worked with React 18 fail with timing issues or unexpected state in React 19.
**Why it happens:** RNTL v13 changed the default value of `concurrentRoot` to true for React 19, which enables concurrent rendering in tests.
**How to avoid:** Be aware that tests run in concurrent mode by default. Use `waitFor` and `findBy*` queries for async state updates. Use `act()` properly.
**Warning signs:** "An update to Component was not wrapped in act(...)" warnings, flaky tests.

## Code Examples

Verified patterns from official sources:

### package.json Script
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watchAll",
    "test:coverage": "jest --coverage"
  }
}
```

### Complete jest.config.ts
```typescript
// Source: https://docs.expo.dev/develop/unit-testing/
import type { Config } from 'jest';

const config: Config = {
  preset: 'jest-expo',
  setupFilesAfterSetup: ['<rootDir>/jest-setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|native-base|react-native-svg|react-native-reanimated|react-native-gesture-handler|react-native-gifted-charts|react-native-worklets)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/types/**',
    '!**/*.d.ts',
  ],
};

export default config;
```

### RNTL Component Test with Built-in Matchers
```typescript
// Source: https://oss.callstack.com/react-native-testing-library/docs/api/jest-matchers
import { render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@/theme';
import SubmitButton from '@/components/SubmitButton';

test('renders button with label', () => {
  render(
    <ThemeProvider>
      <SubmitButton label="Save" onPress={() => {}} />
    </ThemeProvider>
  );

  // Built-in matcher from RNTL v13 -- no separate import needed
  expect(screen.getByText('Save')).toBeOnTheScreen();
});
```

### Mocking a Service Module
```typescript
// In test file: mock specific service functions
jest.mock('@/services/exercises', () => ({
  exercises: {
    getExercises: jest.fn().mockResolvedValue({
      data: [
        { id: '1', name: 'Bench Press', category: 'chest', is_system: true },
      ],
      error: null,
    }),
  },
}));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@testing-library/jest-native` for matchers | Built-in matchers in RNTL v12.4+ | Mid-2024 | No separate package needed; matchers auto-register on import |
| `react-native-reanimated/mock` manual require | `setUpTests()` function | Reanimated v3+ | Cleaner setup, better mock coverage |
| `setupFiles` for Reanimated mock | `setupFilesAfterSetup` for Reanimated mock | Jest 28+ | Ensures mock runs after Jest environment is ready |
| RNTL v12 with React 18 defaults | RNTL v13 with concurrent rendering default for React 19 | RNTL v13 (Q4 2024) | Tests run in concurrent mode; need `waitFor`/`findBy*` for async |
| react-test-renderer maintained | react-test-renderer deprecated (still functional) | React 19 | Shows console warnings; RNTL v14 will eliminate need but v14 is not stable |

**Deprecated/outdated:**
- `@testing-library/jest-native`: Deprecated. Matchers merged into RNTL v12.4+.
- `react-test-renderer`: Deprecated in React 19 but still works. Required by RNTL v13. Will be removed in RNTL v14.
- `jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'))`: Old pattern. Use `setUpTests()` instead.

## Open Questions

Things that couldn't be fully resolved:

1. **jest-expo Automatic Path Alias Resolution**
   - What we know: jest-expo reads `tsconfig.json` `paths` and converts them to Jest `moduleNameMapper`. A bug was fixed (expo#29775) where wildcard `*` paths caused issues. Standard `@/*` to `src/*` paths should work.
   - What's unclear: Cannot verify at runtime since jest-expo is not yet installed. The auto-resolution should handle `@/*` but may need a manual `moduleNameMapper` fallback.
   - Recommendation: Install jest-expo first, run a simple test. If `@/*` imports fail, add manual `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }`.

2. **expo-notifications Mock**
   - What we know: `app/_layout.tsx` calls `Notifications.setNotificationHandler` and `Notifications.requestPermissionsAsync` at module scope. These need mocking if any test transitively imports the layout.
   - What's unclear: Whether jest-expo's preset auto-mocks `expo-notifications` sufficiently.
   - Recommendation: Add `jest.mock('expo-notifications')` to jest-setup.ts if errors occur. For Phase 13, test files should not import from `app/` directory anyway.

3. **react-test-renderer Deprecation Warnings**
   - What we know: React 19 logs console warnings when react-test-renderer is used. RNTL v13 depends on it.
   - What's unclear: Whether the warnings are noisy enough to warrant suppression.
   - Recommendation: Accept the warnings for now. When RNTL v14 reaches stable, migrate away from react-test-renderer.

## Sources

### Primary (HIGH confidence)
- [Expo Unit Testing Docs](https://docs.expo.dev/develop/unit-testing/) - Installation, jest-expo preset config, transformIgnorePatterns
- [Expo Router Testing Docs](https://docs.expo.dev/router/reference/testing/) - renderRouter API, test file placement rules, custom matchers
- [RNTL Quick Start](https://oss.callstack.com/react-native-testing-library/docs/start/quick-start) - Installation, auto-matchers in v13
- [RNTL Jest Matchers API](https://oss.callstack.com/react-native-testing-library/docs/api/jest-matchers) - Complete list of built-in matchers
- [Reanimated Testing Guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/testing/) - setUpTests(), jest config, animated style matchers
- [Gesture Handler Testing Guide](https://docs.swmansion.com/react-native-gesture-handler/docs/guides/testing/) - jestSetup.js, fireGestureHandler API

### Secondary (MEDIUM confidence)
- [RNTL v13/v14 Roadmap Discussion](https://github.com/callstack/react-native-testing-library/discussions/1698) - React 19 support scope, v14 alpha warnings
- [RNTL v13.3.3 Release](https://github.com/callstack/react-native-testing-library/releases) - Latest stable version confirmation
- [jest-expo tsconfig paths issue #29775](https://github.com/expo/expo/issues/29775) - Auto path resolution behavior confirmation
- [AsyncStorage Jest Integration](https://react-native-async-storage.github.io/async-storage/docs/advanced/jest/) - Official mock setup patterns

### Tertiary (LOW confidence)
- WebSearch results on Supabase mocking patterns - General community patterns, not verified with official source
- WebSearch results on jest-localstorage-mock for expo-sqlite/localStorage - May not be needed if manual mock works

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Verified via official Expo docs, RNTL docs, and library-specific testing guides
- Architecture: HIGH - Test structure patterns verified against Expo Router constraints and RNTL best practices
- Pitfalls: HIGH - Multiple sources confirm each pitfall; many derived from direct code analysis of the IronLift codebase
- Mocking patterns: MEDIUM - Supabase and expo-sqlite/localStorage mocking patterns are based on general patterns; exact behavior needs validation during implementation

**Research date:** 2026-02-18
**Valid until:** 2026-03-18 (30 days; stack is stable)

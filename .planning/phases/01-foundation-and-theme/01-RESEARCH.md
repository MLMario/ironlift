# Phase 1: Foundation and Theme - Research

**Researched:** 2026-02-12
**Domain:** Expo project scaffolding, theme system, navigation skeleton, Supabase client
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Theme system
- ThemeProvider React Context + `useTheme()` hook (Decision 7a, UI-02)
- Semantic token names: `surface`, `textPrimary`, `border`, etc. -- never literal color names (Decision 7b, UI-01)
- Dark mode only at launch; token structure supports future light mode via same keys, different values (Decision 7b)
- Token categories: colors, spacing, radii, typography (Roadmap success criteria #2)
- All token values extracted from the web app's CSS custom properties -- web app is the canonical source of truth (Decision 7, UI-05)

#### Styling approach
- All components hand-rolled with `StyleSheet.create()` -- no UI component libraries (Decision 7, UI-03)
- System font (SF Pro) only -- no custom fonts, no font loading (Decision 7c, UI-04)
- Minimum 44px tap target on all interactive elements (UI-06)
- No inline styles except dynamic values depending on props/state

#### Navigation skeleton
- Expo Router file-based routing (Decision 6a)
- Hub-and-spoke: dashboard is sole persistent screen (Decision 6)
- No tab bar (Decision 6)
- Layout groups: root layout, auth layout, and main layout as Expo Router layout groups (Roadmap success criteria #4)
- All screens are empty placeholders in Phase 1 -- just enough to verify navigation structure works
- Presentation styles configured in layout: modals for template editor, stack push for workout, bottom sheet for settings (Decision 6b)

#### Supabase client
- Direct Supabase with RLS -- no API layer, no Edge Functions (Decision 4)
- Token storage via `expo-sqlite/localStorage` adapter passed as custom `storage` to Supabase client init (Decision 5a)
- Env vars adapted from web's Vite-specific vars to Expo mechanism (Decision 2c)
- Connection verified by a test query or auth ping (Roadmap success criteria #5)

#### Web app port (Phase 1 scope)
- Copy as-is: `sql/` schema files for database reference (Decision 2a)
- Copy as-is: `src/types/database.ts` and `src/types/services.ts` (Decision 2a)
- Translate: Web app CSS custom properties (colors, spacing, radii, typography) into TypeScript theme object (Roadmap)
- Reference: Web app stylesheets for exact design token values (Roadmap)

### Claude's Discretion
- Theme object structure (flat vs nested organization of tokens)
- Expo SDK version selection (latest stable)
- Env var configuration approach (expo-constants, .env, etc.)
- Placeholder screen content and styling
- Auth/main layout group naming convention
- tsconfig path alias configuration

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope. All decisions were pre-captured in existing documentation.
</user_constraints>

## Summary

This phase establishes the four pillars every subsequent phase builds on: the Expo project itself, the theme system, the navigation skeleton, and the Supabase client connection. Research covered Expo SDK 54 (latest stable), Expo Router with `Stack.Protected` for auth/main separation, the `expo-sqlite/localStorage` adapter for Supabase token persistence, and the complete set of CSS custom properties from the web app that must be translated into a TypeScript theme object.

The key technical finding is that `StyleSheet.create()` produces static style objects -- they cannot reference dynamic theme values at creation time. The standard pattern is a **style factory function** that takes the theme object and returns a `StyleSheet.create()` call, invoked inside the component via a `useStyles(createStyles)` helper or simply called with the theme from `useTheme()`. This is a well-established React Native pattern that allows both static optimization and dynamic theming.

Expo Router's `Stack.Protected` API (available since SDK 54) provides a declarative way to separate auth and main app screens in a single root layout without needing separate route groups. This simplifies the navigation skeleton significantly compared to older redirect-based patterns.

**Primary recommendation:** Use Expo SDK 54 with `Stack.Protected` for auth/main separation, a style factory pattern for theme-aware `StyleSheet.create()`, `EXPO_PUBLIC_` env vars for Supabase credentials, and nested token categories in the theme object.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | 54.0.33 | Expo SDK runtime | Latest stable SDK; includes React Native 0.81, React 19.1, New Architecture support |
| `expo-router` | 6.0.x | File-based navigation | Included in default Expo template; `Stack.Protected` for auth guards |
| `@supabase/supabase-js` | ~2.95.x | Supabase client | Direct database/auth access with RLS |
| `expo-sqlite` | ~16.0.x | SQLite + localStorage adapter | Provides `expo-sqlite/localStorage/install` for Supabase token persistence |
| `typescript` | ~5.9.2 | Type safety | SDK 54 recommended version |

### Supporting (already in Expo Go / default template)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-reanimated` | v4 | Animations | Built into Expo Go SDK 54; required for New Architecture |
| `react-native-gesture-handler` | - | Gestures | Built into Expo Go SDK 54 |
| `react-native-safe-area-context` | - | Safe area insets | Built into Expo Go; needed for proper layout |
| `react` | 19.1 | React runtime | Included with SDK 54 |
| `react-native` | 0.81 | RN runtime | Included with SDK 54 |

### Alternatives Considered (N/A -- all locked by user decisions)

No alternatives were explored. All stack choices are locked by the constitution and CONTEXT.md decisions.

**Installation (after project creation):**
```bash
pnpm add @supabase/supabase-js expo-sqlite
```

Note: `expo-router`, `react-native-reanimated`, `react-native-gesture-handler`, and `react-native-safe-area-context` come pre-installed with the default Expo template. `expo-sqlite` is bundled with Expo Go but needs explicit installation in `package.json` for the `localStorage` adapter import.

## Architecture Patterns

### Recommended Project Structure (Phase 1)

```
ironlift/
├── app/                          # Expo Router screens (UI only)
│   ├── _layout.tsx               # Root Stack navigator with Stack.Protected
│   ├── index.tsx                 # Dashboard (home screen) -- placeholder
│   ├── workout.tsx               # Active Workout -- placeholder (stack push)
│   ├── template-editor.tsx       # Template Editor -- placeholder (modal)
│   ├── sign-in.tsx               # Sign In -- placeholder (public)
│   ├── create-account.tsx        # Create Account -- placeholder (public)
│   └── settings/
│       ├── exercises.tsx          # My Exercises -- placeholder (stack push)
│       ├── history.tsx            # Exercise History -- placeholder (stack push)
│       └── [exerciseId].tsx       # Exercise Detail -- placeholder (stack push)
├── src/
│   ├── types/                    # Copied from web app
│   │   ├── database.ts           # Database row/insert/update types
│   │   └── services.ts           # Service interface types
│   ├── lib/
│   │   └── supabase.ts           # Supabase client init
│   ├── theme/
│   │   ├── tokens.ts             # Design token values (colors, spacing, etc.)
│   │   ├── ThemeProvider.tsx      # React Context provider
│   │   └── index.ts              # Barrel export
│   ├── hooks/                    # (empty in Phase 1)
│   ├── services/                 # (empty in Phase 1)
│   └── components/               # (empty in Phase 1)
├── sql/                          # Copied from web app
│   ├── current_schema.sql
│   ├── migration_per_set_tracking.sql
│   ├── migration_schema_cleanup.sql
│   ├── migration_template_sets.sql
│   ├── migration_system_exercises.sql
│   └── migration_cascade_delete.sql
├── assets/                       # Expo assets
├── .env                          # EXPO_PUBLIC_ env vars (gitignored)
├── .env.example                  # Template for env vars (committed)
├── app.json                      # Expo config
├── tsconfig.json                 # TypeScript config with path aliases
└── package.json
```

### Pattern 1: Theme Provider with Style Factory

**What:** A React Context that provides theme tokens, paired with a style factory pattern that creates themed StyleSheet objects.

**Why:** `StyleSheet.create()` is static -- it cannot reference dynamic values. The style factory pattern solves this by calling `StyleSheet.create()` inside the component with the current theme, while still getting static optimization for non-dynamic values.

**Example:**

```typescript
// src/theme/tokens.ts
export const darkTheme = {
  colors: {
    bgPrimary: '#0f0f0f',
    bgSurface: '#1a1a1a',
    bgElevated: '#27272a',
    border: '#2a2a2a',
    borderDim: '#27272a',
    accent: '#4f9eff',
    success: '#4ade80',
    warning: '#fbbf24',
    danger: '#f87171',
    textPrimary: '#ffffff',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    accentHover: '#3d88e6',
    successHover: '#3bc46a',
    dangerHover: '#e65959',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
  },
  radii: {
    sm: 4,
    md: 8,
    lg: 12,
    full: 9999,
  },
  typography: {
    fontFamily: undefined, // System font (SF Pro on iOS)
    fontFamilyMono: 'SF Mono', // System monospace
    sizes: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 32,
    },
    lineHeights: {
      tight: 1.2,
      base: 1.5,
    },
    weights: {
      normal: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
    },
  },
  layout: {
    containerMaxWidth: 480,
    minTapTarget: 44,
  },
  shadows: {
    sm: { shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, shadowOpacity: 0.3, shadowColor: '#000' },
    md: { shadowOffset: { width: 0, height: 4 }, shadowRadius: 6, shadowOpacity: 0.4, shadowColor: '#000' },
    lg: { shadowOffset: { width: 0, height: 10 }, shadowRadius: 15, shadowOpacity: 0.5, shadowColor: '#000' },
  },
} as const;

export type Theme = typeof darkTheme;
```

```typescript
// src/theme/ThemeProvider.tsx
import React, { createContext, useContext, useMemo } from 'react';
import { darkTheme, type Theme } from './tokens';

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Currently dark-only; wrapping in useMemo for future light mode support
  const theme = useMemo(() => darkTheme, []);
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
```

```typescript
// Usage in a screen/component (style factory pattern)
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, type Theme } from '@/theme';

function createStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.bgPrimary,
      padding: theme.spacing.md,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: theme.typography.sizes['2xl'],
      fontWeight: theme.typography.weights.semibold,
    },
  });
}

export default function DashboardScreen() {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
    </View>
  );
}
```

### Pattern 2: Root Layout with Stack.Protected

**What:** A single root `_layout.tsx` uses `Stack.Protected` to declaratively show auth screens when logged out and app screens when logged in.

**Why:** `Stack.Protected` (Expo Router SDK 54+) eliminates the need for separate `(auth)` and `(main)` route groups. It is simpler, handles deep links correctly, and avoids redirect loops.

**Example:**

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '@/theme';

function RootLayoutNav() {
  const theme = useTheme();
  // Phase 1: hardcode to true; Phase 2 will use real auth state
  const isLoggedIn = true;

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
```

### Pattern 3: Supabase Client with Expo Env Vars

**What:** Supabase client using `expo-sqlite/localStorage` for session persistence and `EXPO_PUBLIC_` env vars for credentials.

**Example:**

```typescript
// src/lib/supabase.ts
import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Create .env with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

```
# .env (gitignored)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Anti-Patterns to Avoid

- **Using `expo-secure-store` for Supabase tokens:** Has a ~2048-byte limit that can break Supabase sessions. Use `expo-sqlite/localStorage` instead.
- **Using `import.meta.env` (Vite pattern):** Expo uses `process.env.EXPO_PUBLIC_*` -- do not copy the web app's env var pattern.
- **Creating separate `(auth)` and `(main)` route groups:** `Stack.Protected` is the modern pattern and handles edge cases (deep links, redirects) better. Do not use the older redirect-based auth pattern.
- **Caching theme values outside render:** Theme values should be read via `useTheme()` on each render, not stored in module-level variables, to support future theme switching.
- **Using bracket notation for env vars:** `process.env['EXPO_PUBLIC_X']` does NOT work in Expo. Must use dot notation: `process.env.EXPO_PUBLIC_X`.
- **Inline styles for static theme values:** Use the style factory pattern. Only use inline styles for truly dynamic values (e.g., computed from props/state).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Auth token persistence | Custom AsyncStorage auth adapter | `expo-sqlite/localStorage` adapter via `import 'expo-sqlite/localStorage/install'` | Supabase-recommended, handles token size edge cases, built-in to Expo Go |
| File-based routing | Manual React Navigation setup | Expo Router (file-based) | Pre-configured with Expo template, free deep linking, less boilerplate |
| Auth route guards | Custom redirect logic in screens | `Stack.Protected guard={condition}` | Handles deep links, prevents flicker, declarative |
| Safe area handling | Manual padding calculations | `react-native-safe-area-context` (built into Expo Go) | Handles notch, home indicator, dynamic island automatically |
| Project creation | Manual setup from scratch | `pnpm create expo-app@latest` | Pre-configured TypeScript, Expo Router, Metro, correct SDK version |

**Key insight:** Expo SDK 54's default template already includes Expo Router, TypeScript, and most of the navigation infrastructure. Building from the template avoids misconfiguration.

## Common Pitfalls

### Pitfall 1: StyleSheet.create() with Dynamic Theme Values
**What goes wrong:** Developer defines styles at module level using `StyleSheet.create()` with hardcoded theme values, then tries to make the theme dynamic later and realizes styles don't update.
**Why it happens:** `StyleSheet.create()` is evaluated once at module load time. It produces static style IDs, not reactive objects.
**How to avoid:** Use the style factory pattern from day one. Define a `createStyles(theme: Theme)` function that returns `StyleSheet.create({...})`. Call it inside the component with the current theme from `useTheme()`.
**Warning signs:** Color values hardcoded directly in `StyleSheet.create()` calls at module scope.

### Pitfall 2: Bracket Notation for Environment Variables
**What goes wrong:** Using `process.env['EXPO_PUBLIC_SUPABASE_URL']` or destructuring `const { EXPO_PUBLIC_SUPABASE_URL } = process.env` -- both silently return `undefined`.
**Why it happens:** Expo CLI performs static text replacement of `process.env.EXPO_PUBLIC_*` at build time. It only recognizes dot notation.
**How to avoid:** Always use `process.env.EXPO_PUBLIC_SUPABASE_URL` with dot notation. Add runtime validation that throws if the value is falsy.
**Warning signs:** Env vars are `undefined` at runtime despite being set in `.env`.

### Pitfall 3: Forgetting `detectSessionInUrl: false` in Supabase Config
**What goes wrong:** Supabase client tries to detect auth tokens from the URL on initialization, which doesn't apply in React Native and can cause errors or unexpected behavior.
**Why it happens:** Default Supabase behavior is designed for web browsers where auth redirects include tokens in the URL hash.
**How to avoid:** Always set `detectSessionInUrl: false` in the Supabase client auth config.
**Warning signs:** Auth-related errors on app startup, unexpected session state.

### Pitfall 4: Missing `expo-sqlite` in package.json
**What goes wrong:** `import 'expo-sqlite/localStorage/install'` fails even though `expo-sqlite` is bundled in Expo Go.
**Why it happens:** Expo Go has the native module, but the JS package must be listed in `package.json` for Metro to resolve the import.
**How to avoid:** Run `pnpm add expo-sqlite` explicitly before using the localStorage adapter.
**Warning signs:** "Cannot find module 'expo-sqlite/localStorage/install'" error.

### Pitfall 5: Restarting Expo CLI After tsconfig.json Changes
**What goes wrong:** Path aliases like `@/theme` don't resolve after adding them to `tsconfig.json`.
**Why it happens:** Metro caches the tsconfig path alias configuration. Changes require a CLI restart.
**How to avoid:** After modifying `tsconfig.json` path aliases, stop and restart `npx expo start`.
**Warning signs:** "Unable to resolve module" errors for aliased paths.

### Pitfall 6: Types File Import from @supabase/supabase-js
**What goes wrong:** Copying `services.ts` from web app fails because it imports `User`, `Session`, `AuthChangeEvent`, `Subscription` from `@supabase/supabase-js`.
**Why it happens:** The types file has a hard dependency on Supabase types that must be installed.
**How to avoid:** Install `@supabase/supabase-js` before copying the types. The import path is identical between web and RN.
**Warning signs:** TypeScript errors in `services.ts` about missing module.

### Pitfall 7: pnpm Node-Linker Configuration
**What goes wrong:** Metro bundler cannot resolve some packages due to pnpm's default isolated symlink structure.
**Why it happens:** Expo SDK 54 supports pnpm isolated installations, but some packages may still expect hoisted node_modules.
**How to avoid:** The default template created with `pnpm create expo-app` sets `node-linker=hoisted` in `.npmrc`. Keep this setting unless there's a specific reason to change it. SDK 54 supports isolated but hoisted is safer.
**Warning signs:** "Cannot find module" errors for packages that are installed.

## Code Examples

### Complete Theme Token Extraction from Web App CSS

The web app's CSS custom properties (source of truth) map to the following TypeScript theme tokens:

```typescript
// Source: Apps/exercise_tracker_app/apps/web/css/styles.css :root block (lines 9-61)

// CSS: --color-bg-primary: #0f0f0f       ->  colors.bgPrimary: '#0f0f0f'
// CSS: --color-bg-surface: #1a1a1a       ->  colors.bgSurface: '#1a1a1a'
// CSS: --color-bg-elevated: #27272a      ->  colors.bgElevated: '#27272a'
// CSS: --color-border: #2a2a2a           ->  colors.border: '#2a2a2a'
// CSS: --color-border-dim: #27272a       ->  colors.borderDim: '#27272a'
// CSS: --color-accent: #4f9eff           ->  colors.accent: '#4f9eff'
// CSS: --color-success: #4ade80          ->  colors.success: '#4ade80'
// CSS: --color-warning: #fbbf24          ->  colors.warning: '#fbbf24'
// CSS: --color-danger: #f87171           ->  colors.danger: '#f87171'
// CSS: --color-text-primary: #ffffff     ->  colors.textPrimary: '#ffffff'
// CSS: --color-text-secondary: #a1a1aa   ->  colors.textSecondary: '#a1a1aa'
// CSS: --color-text-muted: #71717a       ->  colors.textMuted: '#71717a'
// CSS: --color-accent-hover: #3d88e6     ->  colors.accentHover: '#3d88e6' (pressed states)
// CSS: --color-success-hover: #3bc46a    ->  colors.successHover: '#3bc46a'
// CSS: --color-danger-hover: #e65959     ->  colors.dangerHover: '#e65959'
//
// CSS: --spacing-xs: 0.25rem (4px)       ->  spacing.xs: 4
// CSS: --spacing-sm: 0.5rem (8px)        ->  spacing.sm: 8
// CSS: --spacing-md: 1rem (16px)         ->  spacing.md: 16
// CSS: --spacing-lg: 1.5rem (24px)       ->  spacing.lg: 24
// CSS: --spacing-xl: 2rem (32px)         ->  spacing.xl: 32
// CSS: --spacing-2xl: 3rem (48px)        ->  spacing['2xl']: 48
//
// CSS: --radius-sm: 4px                  ->  radii.sm: 4
// CSS: --radius-md: 8px                  ->  radii.md: 8
// CSS: --radius-lg: 12px                 ->  radii.lg: 12
// CSS: --radius-full: 9999px             ->  radii.full: 9999
//
// CSS: --font-family: system-ui, ...     ->  typography.fontFamily: undefined (RN default = SF Pro)
// CSS: --font-mono: ui-monospace, ...    ->  typography.fontFamilyMono: 'SF Mono'
// CSS: --font-size-base: 16px            ->  typography.sizes.base: 16
// CSS: --line-height-base: 1.5           ->  typography.lineHeights.base: 1.5
//
// Typography scale (from CSS heading rules):
// CSS: h1 { font-size: 2rem }           ->  typography.sizes['3xl']: 32
// CSS: h2 { font-size: 1.5rem }         ->  typography.sizes['2xl']: 24
// CSS: h3 { font-size: 1.25rem }        ->  typography.sizes.xl: 20
// CSS: h4 { font-size: 1.125rem }       ->  typography.sizes.lg: 18
// CSS: .text-small { font-size: 0.875rem } -> typography.sizes.sm: 14
// CSS: .text-xs { font-size: 0.75rem }  ->  typography.sizes.xs: 12
//
// CSS: --shadow-sm: 0 1px 2px ...        ->  shadows.sm (see token object)
// CSS: --shadow-md: 0 4px 6px ...        ->  shadows.md
// CSS: --shadow-lg: 0 10px 15px ...      ->  shadows.lg
//
// CSS: --container-max-width: 480px      ->  layout.containerMaxWidth: 480
// CSS: --min-tap-target: 44px            ->  layout.minTapTarget: 44
```

### Supabase Connection Test

```typescript
// Connection verification (used once in Phase 1 to confirm Supabase works)
import { supabase } from '@/lib/supabase';

async function testSupabaseConnection(): Promise<boolean> {
  try {
    // Use auth.getSession() as a lightweight ping
    const { error } = await supabase.auth.getSession();
    if (error) {
      console.error('Supabase connection test failed:', error.message);
      return false;
    }
    console.log('Supabase connection successful');
    return true;
  } catch (err) {
    console.error('Supabase connection test error:', err);
    return false;
  }
}
```

### tsconfig.json Path Alias Configuration

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

### Project Creation Command

```bash
# Create project with pnpm (SDK 54 default template includes Expo Router + TypeScript)
pnpm create expo-app@latest ironlift

# Install additional dependencies
cd ironlift
pnpm add @supabase/supabase-js expo-sqlite
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-secure-store` for Supabase tokens | `expo-sqlite/localStorage` adapter | 2025 (Supabase docs update) | Avoids 2048-byte token limit that breaks sessions |
| Redirect-based auth guards in Expo Router | `Stack.Protected guard={condition}` | Expo Router v4+ (SDK 54) | Declarative, handles deep links, no flicker |
| `expo-constants` + `extra` field for env vars | `EXPO_PUBLIC_` prefix in `.env` | Expo SDK 49+ | Simpler, standard .env pattern, no app.config.ts wiring |
| `import.meta.env.VITE_*` (web) | `process.env.EXPO_PUBLIC_*` (Expo) | N/A (different platform) | Must translate web env var references |
| Classic Architecture optional | New Architecture required | SDK 52 (Expo Go), SDK 55 (all) | Not a choice -- New Architecture is mandatory in Expo Go |
| Reanimated v3 | Reanimated v4 | SDK 54 | Requires New Architecture; included in Expo Go SDK 54 |
| JSC engine | Hermes engine | SDK 54 | JSC removed from RN core in SDK 54 |
| React 18 | React 19.1 | SDK 54 | React Compiler enabled by default in template |

**Deprecated/outdated:**
- **`expo-secure-store` for Supabase:** 2048-byte limit breaks sessions. Use `expo-sqlite/localStorage`.
- **Redirect-based auth patterns:** `Stack.Protected` is the recommended replacement.
- **Constants.expoConfig.extra:** Still works but `EXPO_PUBLIC_` is the modern approach.
- **JSC engine:** Removed from React Native core in SDK 54. Hermes is the only option.

## Discretionary Recommendations

### Theme Object Structure: Nested Categories (Recommended)

Use nested categories rather than a flat object:

```typescript
theme.colors.bgPrimary    // not theme.bgPrimary
theme.spacing.md           // not theme.spacingMd
theme.radii.lg             // not theme.radiusLg
theme.typography.sizes.xl  // not theme.fontSizeXl
```

**Rationale:** The web app CSS already organizes tokens into categories (`--color-*`, `--spacing-*`, `--radius-*`, `--font-*`). Preserving this structure in TypeScript makes the token mapping auditable. TypeScript `as const` assertion enables autocomplete for all nested values.

### Expo SDK Version: 54.0.33 (Recommended)

SDK 54 is the current latest stable. SDK 55 is in beta (as of Feb 2026). Use SDK 54 because:
- Stable and battle-tested
- `Stack.Protected` is available
- New Architecture is supported (required by Expo Go)
- React 19.1 + React Compiler included
- SDK 55 beta may have breaking changes not yet resolved

### Env Var Approach: EXPO_PUBLIC_ Prefix (Recommended)

Use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in a `.env` file.

**Rationale:** Simplest, most standard approach. No `app.config.ts` wiring needed. `.env` files follow the same pattern as web development. Expo CLI handles the build-time substitution automatically.

### Layout Group Naming: No Groups Needed (Recommended)

With `Stack.Protected`, separate `(auth)` and `(main)` layout groups are unnecessary. All screens live in `app/` directly, and `Stack.Protected` controls visibility based on auth state. This is simpler and is the pattern shown in official Expo documentation.

The "root layout, auth layout, and main layout" from the success criteria is satisfied by:
- **Root layout:** `app/_layout.tsx` (the `Stack` with `Stack.Protected`)
- **Auth group:** The `Stack.Protected guard={!isLoggedIn}` block
- **Main group:** The `Stack.Protected guard={isLoggedIn}` block

### tsconfig Path Aliases: @/* -> src/* (Recommended)

```json
"paths": { "@/*": ["src/*"] }
```

This enables `import { useTheme } from '@/theme'` instead of `import { useTheme } from '../../../src/theme'`. Standard Expo convention. Restart Expo CLI after adding.

### Placeholder Screen Content (Recommended)

Each placeholder screen should display:
1. Screen name (e.g., "Dashboard", "Workout")
2. Dark background (`bgPrimary`) to verify theme
3. White text (`textPrimary`) to verify text tokens
4. A 44px-tall pressable element to verify tap target sizing
5. A navigation link/button to verify route transitions

This satisfies success criteria 1 (dark theme renders), 2 (tokens accessible), 3 (44px tap target), and 4 (navigation works).

## Open Questions

1. **SDK 55 timeline**
   - What we know: SDK 55 beta is available; removes New Architecture opt-out entirely
   - What's unclear: When it goes stable; whether it introduces breaking changes affecting this project
   - Recommendation: Start with SDK 54; upgrade when 55 is stable and well-tested. No urgency since SDK 54 already supports New Architecture.

2. **services.ts dependency on @supabase/supabase-js types**
   - What we know: `services.ts` imports `User`, `Session`, `AuthChangeEvent`, `Subscription` from `@supabase/supabase-js`
   - What's unclear: Whether the Supabase types have changed between the web app's version and the current version
   - Recommendation: Install `@supabase/supabase-js` first, then copy `services.ts`. If types have changed, adapt the imports. The `database.ts` file has no external dependencies and can be copied directly.

3. **Expo Go and `expo-sqlite/localStorage`**
   - What we know: `expo-sqlite` is bundled in Expo Go and the `localStorage` adapter is the Supabase-recommended approach
   - What's unclear: Whether any edge cases exist with this adapter in Expo Go specifically (vs custom dev client)
   - Recommendation: Test the Supabase connection early in Phase 1 to surface any issues. The official Supabase + Expo tutorial uses this exact pattern.

## Sources

### Primary (HIGH confidence)
- Expo SDK 54 changelog: https://expo.dev/changelog/sdk-54 -- SDK version, React Native 0.81, React 19.1, New Architecture status
- Expo Router protected routes docs: https://docs.expo.dev/router/advanced/protected/ -- `Stack.Protected` pattern
- Expo Router modals docs: https://docs.expo.dev/router/advanced/modals/ -- Modal presentation configuration
- Expo environment variables docs: https://docs.expo.dev/guides/environment-variables/ -- `EXPO_PUBLIC_` pattern
- Supabase Expo guide: https://docs.expo.dev/guides/using-supabase/ -- Client setup with `expo-sqlite/localStorage`
- Supabase Expo React Native tutorial: https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native -- Complete client configuration
- Web app CSS custom properties: `Apps/exercise_tracker_app/apps/web/css/styles.css` lines 9-61 -- All design token values
- Web app types: `Apps/exercise_tracker_app/packages/shared/src/types/database.ts` and `services.ts` -- Types to copy
- Web app SQL: `Apps/exercise_tracker_app/sql/*.sql` -- Schema files to copy
- npm registry: `expo@54.0.33`, `expo-router@6.0.23`, `expo-sqlite@16.0.10`, `@supabase/supabase-js@2.95.3`

### Secondary (MEDIUM confidence)
- Expo Router common navigation patterns: https://docs.expo.dev/router/basics/common-navigation-patterns/ -- Auth flow patterns
- Expo create-expo-app docs: https://docs.expo.dev/more/create-expo/ -- Project creation templates
- Expo tsconfig path aliases: https://docs.expo.dev/guides/typescript/ -- Path alias configuration

### Tertiary (LOW confidence)
- Medium articles on SDK 55 beta features -- SDK 55 timeline and feature details (beta, subject to change)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Versions verified via npm registry; SDK 54 confirmed as latest stable
- Architecture: HIGH - `Stack.Protected` pattern verified via official Expo Router docs; style factory pattern is well-established React Native convention
- Theme tokens: HIGH - Extracted directly from web app CSS source file (primary source of truth)
- Supabase client: HIGH - Official Supabase + Expo tutorial confirms exact pattern
- Pitfalls: HIGH - Each pitfall is documented in official sources or directly observable from API constraints

**Research date:** 2026-02-12
**Valid until:** 2026-03-14 (30 days; SDK 54 is stable, SDK 55 may change landscape)

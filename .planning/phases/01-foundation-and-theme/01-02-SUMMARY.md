---
phase: 01-foundation-and-theme
plan: 02
subsystem: theme-and-supabase
tags: [theme, design-tokens, supabase, react-context, dark-mode, expo-sqlite]
requires:
  - 01-01 (Expo project scaffold with @supabase/supabase-js and expo-sqlite installed)
provides:
  - "Dark theme system with 15 colors, 6 spacings, 4 radii, 7 font sizes, 3 shadows matching web app CSS"
  - "ThemeProvider React Context with useTheme() hook"
  - "Style factory pattern support via Theme type export"
  - "Supabase client with expo-sqlite localStorage adapter for token persistence"
affects:
  - 01-03 (navigation skeleton wraps app in ThemeProvider, uses theme tokens for screen styling)
  - All subsequent phases (every screen imports useTheme, every service imports supabase)
tech-stack:
  added: []
  patterns:
    - "ThemeProvider React Context with useTheme() hook for theme access"
    - "Style factory pattern: createStyles(theme) returns StyleSheet.create() result"
    - "expo-sqlite/localStorage side-effect import for Supabase token persistence"
    - "EXPO_PUBLIC_ env vars with dot notation for Expo static text replacement"
    - "detectSessionInUrl: false for React Native Supabase client"
key-files:
  created:
    - src/theme/tokens.ts
    - src/theme/ThemeProvider.tsx
    - src/theme/index.ts
    - src/lib/supabase.ts
  modified: []
key-decisions:
  - id: theme-context-default
    decision: "ThemeContext default value is darkTheme (not null/undefined)"
    rationale: "useTheme() works even outside ThemeProvider (useful for testing) while ThemeProvider is still required in app tree"
  - id: font-family-undefined
    decision: "typography.fontFamily set to undefined (not 'System' or 'SF Pro')"
    rationale: "React Native uses system font by default when fontFamily is undefined; no custom font loading needed"
  - id: as-const-assertion
    decision: "darkTheme uses 'as const' assertion for literal types"
    rationale: "Enables TypeScript autocomplete for all nested token values (literal string/number types vs wide string/number)"
  - id: supabase-runtime-validation
    decision: "Runtime throw on missing env vars instead of silent undefined"
    rationale: "Catches misconfigured .env immediately at app startup rather than failing silently on first API call"
duration: "~2 minutes"
completed: 2026-02-13
---

# Phase 1 Plan 2: Theme System and Supabase Client Summary

Dark theme system with 15 colors, 6 spacings, 4 radii, 7 font sizes, 3 shadows matching web app CSS custom properties + ThemeProvider/useTheme() hook + Supabase client with expo-sqlite localStorage adapter and runtime env var validation.

## Performance

- **Duration:** ~2 minutes
- **Start:** 2026-02-13T02:35:24Z
- **End:** 2026-02-13T02:37:44Z
- **Tasks:** 2/2 completed
- **Files created:** 4

## Accomplishments

1. **Theme tokens extracted from web app CSS** -- All 15 colors, 6 spacings, 4 radii, 7 font sizes, 2 line heights, 3 font weights, 2 layout values, and 3 shadow definitions match the web app's CSS custom properties exactly
2. **ThemeProvider with useTheme() hook** -- React Context provider with darkTheme as default value, useMemo wrapping for future light mode support, typed return via Theme type
3. **Barrel export** -- `@/theme` resolves to src/theme/index.ts, re-exporting ThemeProvider, useTheme, darkTheme, and Theme type
4. **Supabase client configured** -- expo-sqlite/localStorage for token persistence, EXPO_PUBLIC_ env vars via dot notation, detectSessionInUrl: false for React Native, runtime validation on startup

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create theme system (tokens, provider, hook, barrel export) | f8f511c | src/theme/tokens.ts, src/theme/ThemeProvider.tsx, src/theme/index.ts |
| 2 | Create Supabase client with expo-sqlite localStorage adapter | 581de71 | src/lib/supabase.ts |

## Files Created

- **src/theme/tokens.ts** -- Design token values: 15 colors, 6 spacings, 4 radii, 7 font sizes, 2 line heights, 3 weights, 2 layout values, 3 shadows, all with `as const` literal types
- **src/theme/ThemeProvider.tsx** -- React Context with darkTheme default, ThemeProvider component, useTheme() hook
- **src/theme/index.ts** -- Barrel export re-exporting ThemeProvider, useTheme, darkTheme, Theme
- **src/lib/supabase.ts** -- Supabase client with expo-sqlite/localStorage adapter, dot-notation env vars, runtime validation

## Decisions Made

1. **ThemeContext default = darkTheme:** Context created with `createContext<Theme>(darkTheme)` so useTheme() returns a valid theme even outside ThemeProvider (for testing), while ThemeProvider is still required in the app tree for proper usage
2. **fontFamily = undefined:** React Native defaults to system font (SF Pro on iOS) when fontFamily is undefined, avoiding any custom font loading
3. **`as const` assertion:** Enables literal type autocomplete for all token values (e.g., `'#0f0f0f'` not `string`, `16` not `number`)
4. **Runtime env var throw:** Supabase client throws immediately if EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY are missing, catching misconfigured .env at startup

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

**Ready for 01-03 (Navigation skeleton):**
- ThemeProvider available to wrap root layout: `import { ThemeProvider } from '@/theme'`
- useTheme() available for placeholder screen styling: `const theme = useTheme()`
- Style factory pattern ready: `function createStyles(theme: Theme) { return StyleSheet.create({...}) }`
- Supabase client available for future auth integration: `import { supabase } from '@/lib/supabase'`

**No blockers identified.**

## Self-Check: PASSED

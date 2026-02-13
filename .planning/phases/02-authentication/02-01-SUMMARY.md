---
phase: 02-authentication
plan: 01
subsystem: auth
tags: [supabase, expo-router, react-context, session-management, splash-screen]
requires:
  - phase: 01-foundation-and-theme
    provides: Supabase client, theme system, navigation skeleton
provides:
  - Auth service with register/login/logout/resetPassword/updateUser/getCurrentUser/getSession/onAuthStateChange
  - AuthProvider context with session state management
  - Root layout auth guard with splash screen hold
affects: [02-authentication, 03-exercise-library]
tech-stack:
  added: []
  patterns: [AuthProvider context pattern, AppState auto-refresh, splash screen hold during session check]
key-files:
  created: [src/services/auth.ts, src/hooks/useAuth.tsx, app/reset-password.tsx, .planning/phases/02-authentication/02-USER-SETUP.md]
  modified: [src/lib/supabase.ts, app/_layout.tsx]
  deleted: [app/create-account.tsx]
key-decisions:
  - "useAuth.tsx uses .tsx extension (not .ts) because AuthProvider renders JSX via Context.Provider"
  - "AppState auto-refresh placed at module level in supabase.ts (not inside AuthProvider) per official Supabase pattern"
  - "reset-password.tsx placeholder created to satisfy Expo Router route requirement (actual implementation in plan 02-04)"
duration: 3min
completed: 2026-02-13
---
# Phase 2 Plan 1: Auth Service and Provider Summary
**Auth service ported from web app with Linking.createURL for deep links, AuthProvider context managing session via getSession + onAuthStateChange, root layout splash screen hold preventing auth flash**

## Performance
- **Duration:** ~3 minutes
- **Started:** 2026-02-13T04:00:42Z
- **Completed:** 2026-02-13T04:03:31Z
- **Tasks:** 3/3
- **Files created:** 4
- **Files modified:** 2
- **Files deleted:** 1

## Accomplishments
1. Ported the complete auth service from the web app with two targeted changes: import paths and resetPassword redirectTo URL (uses `Linking.createURL('reset-password')` instead of `window.location`)
2. Added AppState auto-refresh listener to the Supabase client for proper token refresh in non-browser environment
3. Created AuthProvider context with session management -- initial check via getSession, ongoing updates via onAuthStateChange, isLoading flag for splash screen coordination
4. Rewired root layout to use real auth state via useAuth() hook, replacing hardcoded `isLoggedIn = true`
5. Added splash screen hold (preventAutoHideAsync/hideAsync) to prevent auth screen flash on app launch
6. Deleted create-account.tsx (register is now internal to sign-in screen per CONTEXT.md)
7. Created reset-password.tsx placeholder for the deep link route (implementation in plan 02-04)

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Port auth service and add AppState auto-refresh | 99453c3 | src/services/auth.ts, src/lib/supabase.ts |
| 2 | Create AuthProvider context and useAuth hook | 593c87d | src/hooks/useAuth.tsx |
| 3 | Wire AuthProvider into root layout with splash screen hold | 6a29784 | app/_layout.tsx, app/reset-password.tsx, app/create-account.tsx (deleted) |

## Files Created
- `src/services/auth.ts` -- Auth service implementing AuthService interface (register, login, logout, resetPassword, updateUser, getCurrentUser, getSession, onAuthStateChange)
- `src/hooks/useAuth.tsx` -- AuthProvider component and useAuth hook for app-wide auth state
- `app/reset-password.tsx` -- Placeholder screen for password reset deep link route
- `.planning/phases/02-authentication/02-USER-SETUP.md` -- Supabase dashboard configuration checklist

## Files Modified
- `src/lib/supabase.ts` -- Added AppState import and auto-refresh listener (startAutoRefresh on active, stopAutoRefresh on background)
- `app/_layout.tsx` -- Replaced hardcoded isLoggedIn with useAuth(), added SplashScreen hold, wrapped with AuthProvider, updated Stack.Protected guards

## Files Deleted
- `app/create-account.tsx` -- Removed; register is now internal to sign-in screen (not a separate route)

## Decisions Made
1. **useAuth.tsx extension:** File uses .tsx (not .ts) because AuthProvider renders JSX via `<AuthContext.Provider>`. This is the standard React pattern.
2. **AppState listener placement:** Placed at module level in supabase.ts (outside any component) per the official Supabase Expo tutorial, rather than inside AuthProvider.
3. **reset-password placeholder:** Created a minimal placeholder screen to satisfy Expo Router's file-based routing requirement. Without it, the Stack.Screen reference in _layout.tsx would have no matching route file.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created reset-password.tsx placeholder**
- **Found during:** Task 3
- **Issue:** Root layout references `reset-password` in Stack.Screen, but no route file existed. Expo Router requires a matching file for each route.
- **Fix:** Created `app/reset-password.tsx` with minimal placeholder content (same pattern as Phase 1 placeholders). Actual implementation will come in plan 02-04.
- **Files created:** app/reset-password.tsx
- **Commit:** 6a29784

**2. [Rule 3 - Blocking] Renamed useAuth.ts to useAuth.tsx**
- **Found during:** Task 2
- **Issue:** AuthProvider uses JSX (`<AuthContext.Provider>`) which requires .tsx extension, not .ts. TypeScript compiler returned syntax errors.
- **Fix:** Renamed file from useAuth.ts to useAuth.tsx. All imports using `@/hooks/useAuth` work with either extension.
- **Files affected:** src/hooks/useAuth.tsx
- **Commit:** 593c87d

## Issues Encountered
None beyond the deviations documented above.

## User Setup Required
**External services require manual configuration.** See [02-USER-SETUP.md](./02-USER-SETUP.md)

Three items need Supabase Dashboard configuration:
1. Add `ironlift://reset-password` to Redirect URLs
2. Verify email confirmations are enabled
3. Verify minimum password length is 6

## Next Phase Readiness
- Auth service is ready for consumption by auth UI screens (plans 02-02, 02-03, 02-04)
- AuthProvider is wired into root layout and managing session state
- Stack.Protected guards are active -- app will show sign-in screen when no session exists
- No blockers for next plans

## Self-Check: PASSED

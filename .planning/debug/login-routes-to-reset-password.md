---
status: diagnosed
trigger: "Login routes to reset-password screen instead of dashboard"
created: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - reset-password is the first available unguarded screen in the Stack, so when isLoggedIn flips to true and sign-in guard becomes false, Expo Router redirects to reset-password (the next available screen) instead of index (which is further down in declaration order)
test: Traced screen declaration order in _layout.tsx and matched against Expo Router redirect docs
expecting: Confirmed
next_action: Return diagnosis

## Symptoms

expected: After successful login, user navigates to dashboard (index)
actual: After successful login, user is taken to reset-password screen showing "No reset link found"
errors: No error -- just wrong screen displayed
reproduction: Login on sign-in screen -> lands on reset-password instead of dashboard
started: After reset-password was moved outside auth guards (commit 6acb6bd)

## Eliminated

## Evidence

- timestamp: 2026-02-12T00:01:00Z
  checked: app/_layout.tsx screen declaration order
  found: |
    Screen order in Stack:
    1. sign-in (guarded by !isLoggedIn)
    2. reset-password (UNGUARDED - outside both Stack.Protected groups)
    3. index (guarded by isLoggedIn)
    4. template-editor, workout, settings (guarded by isLoggedIn)
  implication: reset-password sits between the two guard groups, unguarded

- timestamp: 2026-02-12T00:02:00Z
  checked: Expo Router Stack.Protected redirect behavior (official docs)
  found: |
    "If a user tries to navigate to a protected screen, or if a screen becomes
    protected while it is active, they will be redirected to the anchor route
    (usually the index screen) or the first available screen in the stack."
    When sign-in becomes protected (guard flips to false because isLoggedIn=true),
    the router looks for the FIRST AVAILABLE (non-protected) screen in declaration order.
  implication: reset-password is the first non-protected screen after sign-in becomes inaccessible

- timestamp: 2026-02-12T00:03:00Z
  checked: Login flow in sign-in.tsx and useAuth.tsx
  found: |
    1. User calls auth.login() -> Supabase sets session
    2. onAuthStateChange fires -> setSession(session) in AuthProvider
    3. isLoggedIn becomes true (!!session)
    4. _layout.tsx re-renders: sign-in guard (!isLoggedIn) becomes false
    5. User is on sign-in screen which is now protected -> redirect triggered
    6. Router looks for first available screen -> finds reset-password (unguarded)
    7. Router does NOT reach index because it already found an available screen
  implication: The redirect goes to reset-password because it is declared before index and is unguarded

- timestamp: 2026-02-12T00:04:00Z
  checked: reset-password.tsx initial render behavior when navigated to without a deep link
  found: |
    Line 51: const url = Linking.useURL(); -- returns null when no deep link
    Line 143: if (!url || ...) -- shows loading spinner initially
    But eventually url resolves to null and the component shows tokenError state:
    "No reset link found. Please request a new password reset email."
  implication: Confirms the exact error message the user sees matches this code path

## Resolution

root_cause: |
  In app/_layout.tsx, the reset-password screen is declared OUTSIDE both Stack.Protected
  groups (lines 39-40), sitting between the auth guard (sign-in) and the app guard (index).

  When login succeeds, isLoggedIn flips from false to true. This makes the sign-in screen's
  guard (!isLoggedIn) evaluate to false, so sign-in becomes protected/inaccessible. Since
  the user is currently ON the sign-in screen, Expo Router must redirect them away.

  Expo Router's redirect logic picks "the first available screen in the stack" based on
  declaration order. It scans: sign-in (protected, skip) -> reset-password (UNGUARDED,
  available!) -> stops here. It never reaches index (which is guarded by isLoggedIn=true
  and would also be available, but is declared AFTER reset-password).

  The reset-password screen then renders without a deep link URL, so Linking.useURL()
  returns null, and it shows the "No reset link found" error state.
fix:
verification:
files_changed: []

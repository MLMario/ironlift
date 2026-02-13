---
phase: 02-authentication
plan: 05
subsystem: navigation
tags: [expo-router, stack-protected, login-routing, gap-closure]
dependency-graph:
  requires: [02-04]
  provides: [correct-login-redirect, fixed-screen-declaration-order]
  affects: []
tech-stack:
  added: []
  patterns: [screen-declaration-order-matters-for-redirect]
key-files:
  created: []
  modified: [app/_layout.tsx]
decisions:
  - id: 02-05-order
    summary: "reset-password declared after isLoggedIn group to fix redirect scan order"
    rationale: "Expo Router scans screen declarations in order for first available unguarded screen during redirect; placing reset-password between guard groups made it the first match after login"
metrics:
  duration: "32s"
  completed: "2026-02-13"
---

# Phase 02 Plan 05: Fix Login Routing (Gap Closure) Summary

**One-liner:** Reordered reset-password screen declaration after isLoggedIn Protected group to fix post-login redirect landing on reset-password instead of dashboard.

## What Was Done

### Task 1: Reorder reset-password screen declaration in root layout
**Commit:** `e19793a`

Moved the `<Stack.Screen name="reset-password" />` declaration from between the two `Stack.Protected` groups to after the `isLoggedIn` group. Updated the comment to explain both why it is outside guards (deep link setSession flow) and why it must be declared after the isLoggedIn group (redirect scan order).

**Before (broken):**
```
Stack.Protected guard={!isLoggedIn} -> sign-in
Stack.Screen name="reset-password"    <-- first unguarded screen found after login
Stack.Protected guard={isLoggedIn}  -> index, template-editor, workout, settings
```

**After (fixed):**
```
Stack.Protected guard={!isLoggedIn} -> sign-in
Stack.Protected guard={isLoggedIn}  -> index, template-editor, workout, settings
Stack.Screen name="reset-password"    <-- now after index, no longer intercepting redirect
```

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Reorder reset-password screen declaration | `e19793a` | app/_layout.tsx |

## Deviations from Plan

None -- plan executed exactly as written.

## Decisions Made

| ID | Decision | Rationale |
|----|----------|-----------|
| 02-05-order | reset-password declared after isLoggedIn group | Expo Router redirect scan finds first available screen in declaration order; placing reset-password after the isLoggedIn group ensures index is found first on login |

## Verification

- [x] reset-password Stack.Screen is declared AFTER the isLoggedIn Stack.Protected block
- [x] reset-password Stack.Screen is NOT inside any Stack.Protected block
- [x] index is still the first screen in the isLoggedIn Stack.Protected block
- [x] sign-in is still in the !isLoggedIn Stack.Protected block
- [x] Comment above reset-password explains both guard and ordering rationale
- [x] TypeScript compilation passes (`npx tsc --noEmit` -- no errors)

## Impact on UAT

This fix addresses **UAT Test 8** failure: "After login, user sees the dashboard" was failing because Expo Router redirected to reset-password instead of index. With this declaration order fix, login should now correctly redirect to the dashboard.

## Next Phase Readiness

Phase 2 (Authentication) gap closure complete. No blockers for Phase 3 (Exercise Library).

## Self-Check: PASSED

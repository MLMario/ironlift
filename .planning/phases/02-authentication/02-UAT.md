---
status: diagnosed
phase: 02-authentication
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md]
started: 2026-02-12T22:00:00Z
updated: 2026-02-12T22:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. App Launch and Splash Screen
expected: App launches in Expo Go, shows splash screen briefly, then navigates to the sign-in screen. No flash of dashboard content before the sign-in screen appears.
result: pass

### 2. Brand Header and Sign-In Layout
expected: Sign-in screen shows "Iron" in white and "Lift" in accent blue as the app title, with "Track. Train. Transform." tagline below in muted text. Below that, an AuthCard contains Login/Register tabs with the Login tab active and underlined in accent blue.
result: pass

### 3. Login Form Fields
expected: Login tab shows email field (with keyboard type for email) and password field with an eye icon toggle. Tapping the eye icon reveals/hides the password text. A "Forgot password?" link appears right-aligned below the password field. "Log In" button at the bottom.
result: pass

### 4. Register Form and Tab Switching
expected: Tapping the "Register" tab switches to a registration form with email, password (with "Minimum 6 characters" hint), and confirm password fields. Email typed in the Login tab is preserved when switching. Passwords are cleared on tab switch.
result: pass

### 5. Input Focus Glow
expected: Tapping into any text input field shows an accent-colored (blue) border glow around that field. The glow disappears when the field loses focus.
result: pass

### 6. Client-Side Validation
expected: On the Login tab, tapping "Log In" with empty fields shows an error message (red error box). On the Register tab, entering mismatched passwords and tapping "Create Account" shows a password mismatch error. Entering a password shorter than 6 characters shows a minimum length error.
result: pass

### 7. Forgot Password Flow
expected: Tapping "Forgot password?" on the login form switches to a reset password view with a "Back to login" link at top, "Reset Password" title, email field, and send button. Tapping "Back to login" returns to the login form.
result: pass

### 8. Login with Valid Credentials
expected: Entering a valid email and password on the Login tab and tapping "Log In" shows a loading spinner on the button, then navigates to the dashboard screen (which currently shows a placeholder with a temporary logout button).
result: issue
reported: "Fails it takes me to a screen with an error message: No reset link found. Please request a new password reset email with a request new link button. If I force quit the app and load it again it opens at the dashboard, suggesting the login is successful but im not being routed to the dashboard"
severity: major

### 9. Session Persistence
expected: After logging in successfully, fully close the app (swipe away from app switcher) and reopen it. The app should go directly to the dashboard without showing the sign-in screen or requiring re-login.
result: pass

### 10. Logout
expected: On the dashboard placeholder, tapping the temporary logout button returns to the sign-in screen. The session is cleared.
result: pass

## Summary

total: 10
passed: 9
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "After successful login, user is navigated to the dashboard screen"
  status: failed
  reason: "User reported: Fails it takes me to a screen with an error message: No reset link found. Please request a new password reset email with a request new link button. If I force quit the app and load it again it opens at the dashboard, suggesting the login is successful but im not being routed to the dashboard"
  severity: major
  test: 8
  root_cause: "reset-password screen declared outside both Stack.Protected groups in _layout.tsx, positioned between auth guard (!isLoggedIn) and app guard (isLoggedIn). When login succeeds, Expo Router redirects from now-protected sign-in and finds unguarded reset-password as first available screen before reaching index."
  artifacts:
    - path: "app/_layout.tsx"
      issue: "reset-password Stack.Screen declared between guard groups (line 40), making it the first unguarded screen Expo Router finds during redirect"
  missing:
    - "Move reset-password screen declaration after the isLoggedIn guard group so index is found first during redirect"
  debug_session: ".planning/debug/login-routes-to-reset-password.md"

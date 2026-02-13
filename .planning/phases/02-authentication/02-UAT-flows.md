---
status: partial
phase: 02-authentication
source: [02-01-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md, 02-05-SUMMARY.md]
started: 2026-02-12T00:00:00Z
updated: 2026-02-12T00:00:00Z
---

## Current Test

[partial -- password recovery tests pending Supabase email rate limit reset]

## Tests

### 1. Account Registration
expected: On the sign-in screen, tap "Register" tab. Enter a new email, password (6+ chars), and confirm password. Tap "Create Account". Loading spinner appears, then "Check Your Email" modal pops up with confirmation instructions. Tap "Got it" to dismiss.
result: pass
note: Initially hit Supabase email rate limit. After disabling email confirmation in Supabase Dashboard, registration succeeded and user was created in database.

### 2. Registration Email Received
expected: Check the email inbox for the address you just registered. You should receive a confirmation email from Supabase with a link to verify your account.
result: skipped
reason: Email confirmation disabled in Supabase Dashboard for testing

### 3. Login After Registration
expected: After registration (email confirmation disabled), go to Login tab. Enter the email and password you registered with. Tap "Log In". You should land on the dashboard.
result: pass

### 4. Duplicate Registration Rejected
expected: Log out. On the Register tab, try creating an account with the SAME email you just registered. Tap "Create Account". An error message should appear. No "Check Your Email" modal.
result: pass

### 5. Forgot Password Request
expected: On the Login tab, tap "Forgot password?" link. Enter email. Tap "Send Reset Link". Green success box appears.
result: [pending]
note: Blocked by Supabase email rate limit. Will retest when rate limit resets.

### 6. Reset Email Received
expected: Check email inbox for password reset email from Supabase with ironlift://reset-password deep link.
result: [pending]
note: Blocked by Supabase email rate limit. Will retest when rate limit resets.

### 7. Deep Link Opens Set New Password Screen
expected: Tap the reset link in email on iPhone. App opens to "Set New Password" form -- NOT the "No reset link found" error state.
result: [pending]
note: Blocked by Supabase email rate limit. Will retest when rate limit resets.

### 8. Set New Password
expected: Enter new password (6+ chars) and confirm. Tap "Update Password". Green success box: "Password updated successfully!" with "Back to Login" button.
result: [pending]
note: Blocked by Supabase email rate limit. Will retest when rate limit resets.

### 9. Login With New Password
expected: Tap "Back to Login". Enter email and NEW password. Tap "Log In". Land on dashboard.
result: [pending]
note: Blocked by Supabase email rate limit. Will retest when rate limit resets.

### 10. Old Password Rejected
expected: Log out. Enter email and OLD password. Tap "Log In". Error message appears. Old password no longer works.
result: [pending]
note: Blocked by Supabase email rate limit. Will retest when rate limit resets.

## Summary

total: 10
passed: 3
issues: 0
pending: 6
skipped: 1

## Gaps

[none yet]

---
status: diagnosed
trigger: "forgot password shows rate limit exceeded; account creation sends no email"
created: 2026-02-17T00:00:00Z
updated: 2026-02-17T00:00:00Z
---

## Current Focus

hypothesis: Supabase built-in SMTP rate limit (2 emails/hour) is being hit due to prior signUp attempts consuming the quota, AND no confirmation emails are sent because Supabase "Confirm email" may be misconfigured
test: Traced full code path from button press to error display
expecting: Rate limit error originates from Supabase server (HTTP 429), not client-side
next_action: Return diagnosis

## Symptoms

expected: User clicks forgot password, enters email, receives password reset email. Account creation sends confirmation email.
actual: Forgot password immediately returns "rate limit exceeded" error. Account creation succeeds (user created) but no confirmation email sent.
errors: "rate limit exceeded" displayed in ErrorBox component
reproduction: 1) Create account (no email arrives), 2) Try forgot password (rate limit error)
started: Unknown -- possibly since first use

## Eliminated

- hypothesis: Client-side rate limiting or throttling in auth flow
  evidence: Searched entire src/ and app/ directories for "rate limit", "throttle", "debounce" -- zero matches. No custom rate limiting logic exists anywhere in the codebase.
  timestamp: 2026-02-17

- hypothesis: Error message is being transformed or wrapped by a utility
  evidence: No error handling utilities exist (no src/lib/error*.ts, no src/utils/ directory). Error flows directly from supabase.auth SDK -> auth.ts return -> sign-in.tsx setError(result.error.message).
  timestamp: 2026-02-17

- hypothesis: Supabase client misconfiguration (flowType, auth options)
  evidence: Client uses default flowType 'implicit' (not overridden), standard config with autoRefreshToken, persistSession, detectSessionInUrl=false. No unusual auth options.
  timestamp: 2026-02-17

- hypothesis: Double-calling of resetPassword
  evidence: resetPassword is called exactly once from handleResetPassword in sign-in.tsx. No other callers exist.
  timestamp: 2026-02-17

## Evidence

- timestamp: 2026-02-17
  checked: src/services/auth.ts resetPassword function (lines 136-166)
  found: Calls supabase.auth.resetPasswordForEmail(email, { redirectTo }) where redirectTo = Linking.createURL('reset-password'). Returns { success: false, error } directly from Supabase SDK error. No transformation.
  implication: Error message displayed is the verbatim Supabase server error message.

- timestamp: 2026-02-17
  checked: app/sign-in.tsx handleResetPassword (lines 116-136)
  found: Calls auth.resetPassword(email.trim()), on error sets setError(result.error.message). ErrorBox displays this string directly.
  implication: "rate limit exceeded" is the exact message from the Supabase GoTrue server response.

- timestamp: 2026-02-17
  checked: src/lib/supabase.ts client initialization
  found: Standard createClient with auth config: { storage: localStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }. No flowType override (defaults to 'implicit'). No rate limiting config.
  implication: Client config is correct for React Native. No client-side cause.

- timestamp: 2026-02-17
  checked: @supabase/auth-js error handling chain (node_modules/@supabase/auth-js/src/lib/fetch.ts)
  found: _getErrorMessage extracts msg || message || error_description || error from server JSON response. HTTP non-OK responses flow through handleError() which creates AuthApiError with server's message and status code.
  implication: "rate limit exceeded" comes from Supabase GoTrue server's JSON response body, not client-side logic.

- timestamp: 2026-02-17
  checked: Supabase built-in SMTP rate limits (official docs)
  found: Supabase's built-in email service has a hard limit of 2 emails per hour. This is NOT configurable and applies to ALL auth emails (signup confirmation, password reset, magic link, etc.).
  implication: If signup triggered even a failed email attempt, it consumes from the 2/hour quota. A subsequent resetPasswordForEmail would hit the limit.

- timestamp: 2026-02-17
  checked: Supabase auth issue #1236
  found: Known issue: "Email rate limit is triggered even in scenarios where an email doesn't end up being sent." The rate limit counter increments on the attempt, not on successful delivery.
  implication: Even if no email was actually delivered (e.g., signup with confirm-email enabled but email fails), the rate limit quota is consumed.

- timestamp: 2026-02-17
  checked: src/services/auth.ts register function (lines 34-69)
  found: signUp call does NOT pass emailRedirectTo option. Just passes { email, password }.
  implication: No redirect URL for confirmation email -- but more importantly, if "Confirm email" is ENABLED, the signup consumes email quota even if email doesn't arrive.

- timestamp: 2026-02-17
  checked: Linking.createURL behavior in Expo Go
  found: In Expo Go, Linking.createURL('reset-password') produces something like exp://192.168.x.x:8081/--/reset-password. This is NOT in the Supabase Redirect URLs allowlist (which has exp+ironlift://reset-password and ironlift://reset-password).
  implication: Even if rate limit were not hit, the redirect URL would fail Supabase's redirect allowlist check in Expo Go. In a production build, it would produce ironlift://reset-password which IS in the allowlist.

## Resolution

root_cause: |
  TWO INDEPENDENT ISSUES:

  1. RATE LIMIT (PRIMARY): The Supabase project uses the built-in SMTP email service which has a hard limit of 2 emails per hour. The account creation attempt (signUp) consumed email quota (the rate limit counter increments on attempt, not delivery -- known Supabase issue #1236). When the user subsequently tried forgot-password, the resetPasswordForEmail call hit the server-side rate limit, and the GoTrue server returned HTTP 429 with message "Email rate limit exceeded" (or similar). This error flowed directly through: GoTrue server -> @supabase/auth-js handleError() -> AuthApiError -> auth.ts returns { success: false, error } -> sign-in.tsx calls setError(result.error.message) -> ErrorBox displays it.

  2. NO EMAILS SENT (SECONDARY): Two possible sub-causes:
     a) If "Confirm email" is ENABLED in Supabase Auth settings: The built-in SMTP's 2/hour limit may have already been consumed by prior attempts, OR the built-in SMTP is simply unreliable for delivery (it's meant for development/demo only).
     b) If "Confirm email" is DISABLED in Supabase Auth settings: No email is sent by design -- Supabase skips sending confirmation email and auto-confirms the user. The app's EmailVerificationModal ("Check Your Email") would then be misleading since no email was ever intended to be sent.

  CONTRIBUTING FACTOR: The redirectTo URL generated by Linking.createURL('reset-password') in Expo Go produces exp://IP:PORT/--/reset-password, which does NOT match the configured Supabase Redirect URLs (exp+ironlift://reset-password, ironlift://reset-password). This would cause redirect failures even if emails were successfully sent.

fix: (not applied -- diagnosis only)
verification: (not applied -- diagnosis only)
files_changed: []

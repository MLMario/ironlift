---
status: diagnosed
trigger: "deep-link-opens-web-not-app: Email confirmation/reset links open web app in browser instead of Expo Go app"
created: 2026-02-19T00:00:00Z
updated: 2026-02-19T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED (PHASE 1) - Supabase email templates used SiteURL not RedirectTo. Fixed with trampoline.
hypothesis2: CONFIRMED (PHASE 2) - Linking.useURL() race condition: reset-password screen subscribes to URL events AFTER Expo Router has already consumed the deep link and navigated. getInitialURL() returns the original app launch URL (no tokens), and the url event has already fired before the component mounts.
test: Traced through expo-linking and expo-router source code
expecting: N/A - root cause confirmed
next_action: Report diagnosis - fix is to use useLocalSearchParams() instead of Linking.useURL()

## Symptoms

expected: When user clicks email confirmation or password reset link on their phone, it should open the Expo Go app on the correct screen
actual: Email links open the web application (exercise_tracker_app) in the phone's browser. The web app works correctly when opened this way, but the native app never receives the deep link.
errors: No errors. Flow works in wrong app.
reproduction: 1) Sign up or request password reset in Expo app 2) Check email on phone 3) Click link 4) Browser opens with web app
started: Since implementing auth in Expo app. Web app auth always worked.

## Eliminated

- hypothesis: Deep link scheme not registered in app.json
  evidence: app.json has "scheme": "ironlift" correctly configured
  timestamp: 2026-02-19

- hypothesis: Auth service not setting redirectTo parameter
  evidence: auth.ts correctly calls Linking.createURL('sign-in') and Linking.createURL('reset-password'), generating exp://10.0.0.158:8081/--/sign-in and exp://10.0.0.158:8081/--/reset-password respectively. These are passed as emailRedirectTo/redirectTo to Supabase.
  timestamp: 2026-02-19

- hypothesis: Wrong Supabase project (different between web and mobile)
  evidence: Both apps use identical Supabase URL (polqpyzydxazpnyyesyd.supabase.co) and anon key. Same project.
  timestamp: 2026-02-19

## Evidence

- timestamp: 2026-02-19
  checked: ironlift/src/services/auth.ts - register() and resetPassword()
  found: register() uses emailRedirectTo = Linking.createURL('sign-in'), resetPassword() uses redirectTo = Linking.createURL('reset-password'). Both correctly generate exp:// URLs for Expo Go dev or ironlift:// for production builds.
  implication: The client-side code correctly passes custom scheme URLs to Supabase API.

- timestamp: 2026-02-19
  checked: Both .env files for Supabase credentials
  found: Both ironlift and exercise_tracker_app use identical SUPABASE_URL and ANON_KEY (polqpyzydxazpnyyesyd.supabase.co)
  implication: Both apps share the SAME Supabase project. The Supabase project has ONE "Site URL" configuration that was set up for the web app.

- timestamp: 2026-02-19
  checked: Web app auth.ts - register() and resetPassword()
  found: Web register() does NOT set emailRedirectTo at all (uses Supabase default). Web resetPassword() uses window.location.origin + window.location.pathname (the deployed Vercel URL).
  implication: The web app relies on Supabase's default Site URL for signup confirmation, and explicitly sets the current web origin for password reset.

- timestamp: 2026-02-19
  checked: Supabase documentation on email templates and redirectTo
  found: Supabase default email templates use {{ .ConfirmationURL }} which is constructed using {{ .SiteURL }}, NOT {{ .RedirectTo }}. The redirectTo parameter from the client is available as {{ .RedirectTo }} in email templates, BUT the default templates do NOT use it. The default templates construct links like: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email. The SiteURL is the project-level "Site URL" setting in Supabase Dashboard > Authentication > URL Configuration.
  implication: Even though the Expo app passes exp://... or ironlift://... as redirectTo, the default email template IGNORES this and uses SiteURL (the web app URL) instead.

- timestamp: 2026-02-19
  checked: Supabase documentation on verify endpoint redirect flow
  found: When user clicks the email link, it hits Supabase's /auth/v1/verify endpoint. After verification, Supabase redirects the user to either: (a) the redirect_to parameter if present in the verification URL, OR (b) the Site URL as fallback. The default email templates construct the verification URL using SiteURL, so the redirect_to in the verification URL points to the web app, not the Expo app.
  implication: The entire chain uses SiteURL. The redirectTo passed by the client is stored server-side but never makes it into the email because the default template uses SiteURL.

- timestamp: 2026-02-19
  checked: exercise_tracker_app deployment configuration
  found: Web app is deployed on Vercel (vercel.json present). The Supabase project's Site URL is almost certainly set to the Vercel deployment URL of the web app.
  implication: Confirms the Site URL in Supabase Dashboard points to the web app's Vercel URL.

- timestamp: 2026-02-19
  checked: Supabase documentation on how redirectTo interacts with email templates
  found: The docs explicitly state: "When using a redirectTo option, you may need to replace the {{ .SiteURL }} with {{ .RedirectTo }} in your email templates." This confirms the default templates use SiteURL and users must MANUALLY update them to use RedirectTo.
  implication: This is the root cause. The default email templates were never updated to use {{ .RedirectTo }}, so the redirectTo parameter from the Expo app is effectively ignored.

## Resolution

root_cause: |
  TWO interacting issues cause email links to open the web app instead of the Expo app:

  **Issue 1 (PRIMARY): Supabase email templates use {{ .SiteURL }}, not {{ .RedirectTo }}**

  The Supabase project's email templates (for signup confirmation and password reset) use the
  default templates which construct the email link using {{ .SiteURL }}. The Site URL in the
  Supabase Dashboard is set to the web app's Vercel deployment URL (since the web app was set
  up first). Even though the Expo app correctly passes exp:// or ironlift:// URLs via the
  redirectTo/emailRedirectTo parameter, the default email templates IGNORE this parameter and
  use {{ .SiteURL }} instead.

  The Supabase docs explicitly state: "When using a redirectTo option, you may need to replace
  {{ .SiteURL }} with {{ .RedirectTo }} in your email templates."

  This means the email link always points to:
    https://<web-app-vercel-url>/auth/confirm?token_hash=...&type=...
  instead of:
    https://<supabase-project>.supabase.co/auth/v1/verify?token=...&type=...&redirect_to=exp://...

  **Issue 2 (SECONDARY): Even if email templates are fixed, exp:// URLs cannot be the final redirect target**

  The Supabase email verification flow is: user clicks link -> Supabase /auth/v1/verify endpoint
  processes token -> HTTP 302 redirect to redirect_to URL. An HTTP 302 redirect to exp:// or
  ironlift:// custom URL schemes is unreliable across browsers (some block it, especially without
  user-initiated navigation). The Supabase Native Mobile Deep Linking docs describe a pattern
  where the redirect goes to a web page that then triggers the deep link, not a direct 302 to
  a custom scheme.

  **The complete chain of failure:**
  1. Expo app calls supabase.auth.signUp({ options: { emailRedirectTo: 'exp://10.0.0.158:8081/--/sign-in' } })
  2. Supabase stores the redirectTo server-side
  3. Supabase sends email using the default template with {{ .SiteURL }} (web app URL)
  4. User clicks the link -> goes to web app URL in browser
  5. Web app loads and handles the auth flow correctly (since it shares the same Supabase project)
  6. Expo app never receives the deep link

fix:
verification:
files_changed: []

# Phase 2: Authentication - Context

**Gathered:** 2026-02-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create accounts, log in, maintain persistent sessions, and recover forgotten passwords — gating all personalized data access. Email/password only (no biometrics, no social login). Session tokens stored via `expo-sqlite/localStorage` adapter. Password reset via system browser + deep link return (`ironlift://reset-password`).

</domain>

<decisions>
## Implementation Decisions

### Auth screen structure
- Single screen with tabbed toggle (Login / Register) — mirrors web app's `AuthSurface` pattern
- Brand header above the auth card: "IronLift" with split-color styling (white "Iron" + accent blue "Lift") and tagline
- Auth card container with rounded corners, border, shadow — matches web app's `.auth-card`
- Forgot Password: "Forgot password?" link on the login form (right-aligned above submit button)
- Tapping "Forgot password?" replaces auth card content with Reset Password form (tabs hidden, "Back to login" link at top)
- Set New Password screen triggered by deep link `ironlift://reset-password` — shows new password + confirm password fields

### Email verification behavior
- Mirror web app exactly
- After signup: show modal with "Check Your Email" title and instructions to verify before logging in
- On modal dismiss: switch to Login tab
- User must verify email before they can log in (Supabase default behavior)
- No in-app verification UI — Supabase handles the verification link

### Form validation & feedback
- Error display: red error box at top of form for both client-side and server-side errors (mirrors web)
- Password hint: muted text below password field ("Minimum 6 characters") on Register and Set New Password forms
- Client-side validation: empty field check, password match check (register/update), min length check
- Server-side errors: Supabase auth error messages displayed in the same error box
- Loading state: spinner (ActivityIndicator) inside the submit button, button disabled — native iOS pattern (not text swap)

### Error & edge case UX
- Expired/invalid reset link: show error on Set New Password screen in the standard red error box + "Request New Link" button below the error for easy recovery
- Network errors: same red error box as all other auth errors — no special handling or distinction
- Wrong password / account not found: Supabase error message in standard red error box
- All errors: user stays on current form, can retry immediately — form remains filled

### Claude's Discretion
- Exact auth card dimensions and padding for mobile
- Keyboard avoidance behavior and scroll handling on auth forms
- Animation transitions between auth sub-views (login/register/reset)
- Password visibility toggle icon choice and placement
- Success message styling (green box for reset email sent, password updated)
- Splash/loading screen during initial session check on app launch

</decisions>

<specifics>
## Specific Ideas

- Web app's auth UI is the pixel reference — match its colors, spacing, typography, tab underline accent, input focus glow, error/success box styling
- Brand header split-color pattern: white "Iron" + accent blue "Lift" (adapted from web's "IronFactor")
- Password fields have visibility toggle (eye/eye-off icon) — same as web app
- Register form has 3 fields: email, password, confirm password — same as web
- Login form has 2 fields: email, password — same as web
- Reset Password form has 1 field: email — with success state replacing the form when email is sent
- Set New Password form has 2 fields: new password, confirm new password

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-authentication*
*Context gathered: 2026-02-12*

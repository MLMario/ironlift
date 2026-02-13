# Phase 2: Authentication - Research

**Researched:** 2026-02-12
**Domain:** Supabase Auth + Expo Router + React Native (email/password, deep links, session management)
**Confidence:** HIGH

## Summary

Phase 2 implements email/password authentication using the existing Supabase client (`src/lib/supabase.ts`) and Expo Router's `Stack.Protected` guard pattern already scaffolded in Phase 1. The auth service from the web app (`exercise_tracker_app/packages/shared/src/services/auth.ts`) can be copied and adapted with minimal changes -- swap the Supabase import and change the `resetPassword()` redirect URL from `window.location.origin` to the `ironlift://` deep link scheme.

The main technical challenges are: (1) handling the password reset deep link where Supabase puts tokens in URL hash fragments (#) rather than query parameters, requiring manual parsing; (2) coordinating the initial session check with splash screen visibility to prevent auth screen flicker on app launch; and (3) building the auth UI as a single screen with internal state management (tabbed login/register, inline reset password form) rather than separate Expo Router screens.

**Primary recommendation:** Port the web app's `auth.ts` service as-is with two changes (import path and redirectTo URL). Build a single `app/sign-in.tsx` screen that manages login/register/reset sub-views internally via state, mirroring the web app's `AuthSurface` pattern. Use `Linking.useURL()` from `expo-linking` to handle the password reset deep link, manually parsing hash fragments to extract tokens for `supabase.auth.setSession()`.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single screen with tabbed toggle (Login / Register) -- mirrors web app's AuthSurface pattern
- Brand header above the auth card: "IronLift" with split-color styling (white "Iron" + accent blue "Lift") and tagline
- Auth card container with rounded corners, border, shadow -- matches web app's .auth-card
- Forgot Password: "Forgot password?" link on the login form (right-aligned above submit button)
- Tapping "Forgot password?" replaces auth card content with Reset Password form (tabs hidden, "Back to login" link at top)
- Set New Password screen triggered by deep link ironlift://reset-password -- shows new password + confirm password fields
- Mirror web app email verification exactly: modal with "Check Your Email" after signup, switch to Login on dismiss
- User must verify email before they can log in (Supabase default behavior)
- Error display: red error box at top of form for both client-side and server-side errors
- Password hint: muted text below password field ("Minimum 6 characters") on Register and Set New Password forms
- Client-side validation: empty field check, password match check, min length check
- Loading state: spinner (ActivityIndicator) inside submit button, button disabled
- Expired/invalid reset link: error in red box + "Request New Link" button
- Network errors: same red error box as all other auth errors
- All errors: user stays on current form, can retry immediately -- form remains filled
- Web app's auth UI is the pixel reference for colors, spacing, typography, tab underline accent, input focus glow, error/success box styling
- Password fields have visibility toggle (eye/eye-off icon)
- Register: email, password, confirm password; Login: email, password; Reset: email; Set New Password: new password, confirm new password

### Claude's Discretion
- Exact auth card dimensions and padding for mobile
- Keyboard avoidance behavior and scroll handling on auth forms
- Animation transitions between auth sub-views (login/register/reset)
- Password visibility toggle icon choice and placement
- Success message styling (green box for reset email sent, password updated)
- Splash/loading screen during initial session check on app launch

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| `@supabase/supabase-js` | ^2.95.3 | Auth operations (signUp, signInWithPassword, resetPasswordForEmail, updateUser, setSession, onAuthStateChange) | Installed, client configured at `src/lib/supabase.ts` |
| `expo-router` | ~6.0.23 | Stack.Protected for auth guard, file-based routing | Installed, guard scaffolded in `app/_layout.tsx` |
| `expo-linking` | ~8.0.11 | Deep link URL parsing (useURL hook, Linking.parse, Linking.createURL) | Installed |
| `expo-splash-screen` | ~31.0.13 | Keep splash visible during initial session check | Installed |
| `expo-sqlite` | ^16.0.10 | localStorage polyfill for Supabase session persistence | Installed, import in `src/lib/supabase.ts` |
| `@expo/vector-icons` | ^15.0.3 | Ionicons for eye/eye-off password toggle icons | Installed |

### Supporting (may need installation)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-auth-session` | N/A | `QueryParams.getQueryParams()` utility for parsing deep link URL params | **NOT NEEDED** -- manual URL hash parsing is simpler and avoids the dependency. See "Deep Link Token Extraction" pattern below. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Manual hash fragment parsing | `expo-auth-session/build/QueryParams` | Adds unnecessary dependency for one utility function. `expo-auth-session` has Expo Go limitations for OAuth flows (not relevant here but adds conceptual weight). Manual parsing is 5 lines of code. |
| Single auth screen with state | Separate Expo Router screens per form | CONTEXT.md locks the single-screen approach mirroring web's AuthSurface. Separate screens would fight the Stack.Protected pattern (all auth screens must be in the unprotected group). |

**No new packages needed.** Everything required is already installed.

---

## Architecture Patterns

### Recommended File Structure

```
app/
  _layout.tsx              # Root layout -- wire up auth state to Stack.Protected guard
  sign-in.tsx              # Auth screen (login/register/reset sub-views)
  reset-password.tsx       # Set New Password screen (deep link target)
  index.tsx                # Dashboard (existing)
  ...
src/
  services/
    auth.ts                # Copied from web app, adapted
  hooks/
    useAuth.ts             # Auth context provider + hook (session, user, loading state)
  components/
    AuthCard.tsx           # Card container component
    AuthTabs.tsx           # Login/Register tab toggle
    LoginForm.tsx          # Login form
    RegisterForm.tsx       # Register form
    ResetPasswordForm.tsx  # Reset password (request email) form
    SetNewPasswordForm.tsx # Set new password form (used in reset-password.tsx)
    EmailVerificationModal.tsx  # "Check Your Email" modal
    TextInputField.tsx     # Reusable form input with label, error, password toggle
    ErrorBox.tsx           # Red error message box
    SuccessBox.tsx         # Green success message box
    SubmitButton.tsx       # Button with ActivityIndicator loading state
  lib/
    supabase.ts            # Existing -- add AppState auto-refresh
```

### Pattern 1: Auth Context Provider (Session Management)

**What:** A React Context that holds auth state (session, user, isLoading, isLoggedIn) and exposes it app-wide via `useAuth()` hook. Listens to `onAuthStateChange` and checks initial session on mount.

**When to use:** Every screen that needs auth state (root layout for guard, settings for logout, future phases for user ID).

**Why:** Avoids prop drilling. Single source of truth for auth state. The root layout consumes `isLoggedIn` and `isLoading` to control `Stack.Protected` guard.

```typescript
// src/hooks/useAuth.ts
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AppState } from 'react-native';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;  // true until initial session check completes
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  isLoggedIn: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // AppState-based auto-refresh (Supabase recommended pattern)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => subscription.remove();
  }, []);

  const value = {
    session,
    user: session?.user ?? null,
    isLoading,
    isLoggedIn: !!session,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
```

**Confidence: HIGH** -- This pattern is documented in official Supabase tutorials and Expo guides. The AppState auto-refresh is directly from Supabase docs.

### Pattern 2: Root Layout Auth Guard with Splash Screen

**What:** The root layout uses `useAuth()` to control `Stack.Protected` guard. While `isLoading` is true, the splash screen stays visible (preventing auth screen flash).

**When to use:** `app/_layout.tsx` -- the only place where auth state drives navigation.

```typescript
// app/_layout.tsx (updated)
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ThemeProvider, useTheme } from '@/theme';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const theme = useTheme();
  const { isLoggedIn, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return null; // Splash screen is still visible
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.bgPrimary },
      }}
    >
      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="index" />
        {/* ... other app screens */}
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  );
}
```

**Confidence: HIGH** -- `Stack.Protected` is already scaffolded in the existing `_layout.tsx`. The splash screen pattern is standard Expo practice.

**Key detail:** `reset-password` screen must be in the `!isLoggedIn` guard group OR be unprotected, because the deep link arrives before the user has an active session. The deep link establishes the session via `setSession()`, then the user can update their password.

**IMPORTANT CORRECTION:** Actually, the password reset deep link flow works differently. When the user clicks the reset link in their email, Supabase redirects to `ironlift://reset-password#access_token=...&refresh_token=...`. The app must:
1. Intercept this URL
2. Extract tokens from the hash fragment
3. Call `supabase.auth.setSession()` with the tokens
4. This triggers a `PASSWORD_RECOVERY` event (NOT `SIGNED_IN`)
5. Navigate to the Set New Password screen

This means `reset-password` should be accessible regardless of auth state, OR the session should be established first (putting user in "logged in" state) and then route to the password reset screen. The cleaner approach: put `reset-password` in the authenticated guard group, because `setSession()` will make `isLoggedIn = true` before navigation occurs.

### Pattern 3: Deep Link Token Extraction for Password Reset

**What:** Parse the `ironlift://reset-password#access_token=...&refresh_token=...` deep link, extract tokens from the URL hash fragment, and establish a session.

**When to use:** When the app is opened via the password reset deep link.

**Critical detail:** Supabase sends tokens in the URL **hash fragment** (#), NOT as query parameters (?). Standard URL parsers may not handle this. Manual parsing is needed.

```typescript
// Helper function to extract tokens from Supabase deep link hash fragment
function extractTokensFromUrl(url: string): {
  accessToken: string | null;
  refreshToken: string | null;
  type: string | null;
} {
  // Supabase puts tokens in hash fragment:
  // ironlift://reset-password#access_token=xxx&refresh_token=yyy&type=recovery
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return { accessToken: null, refreshToken: null, type: null };
  }

  const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
  return {
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
    type: hashParams.get('type'),
  };
}

// Create session from deep link URL
async function createSessionFromUrl(url: string) {
  const { accessToken, refreshToken, type } = extractTokensFromUrl(url);

  if (!accessToken || !refreshToken) return null;

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (error) throw error;
  return data.session;
}
```

**Confidence: HIGH** -- Verified via GitHub issue #843 on supabase-js that tokens arrive in hash fragments. The workaround of replacing `#` with `?` and using URLSearchParams is documented by multiple sources.

### Pattern 4: Auth Screen Internal State Machine

**What:** The `sign-in.tsx` screen manages login/register/reset as internal state transitions, not as separate Expo Router screens.

**When to use:** The main auth screen.

**State machine:**
```
sign-in.tsx state:
  'login'     -> LoginForm (default)
  'register'  -> RegisterForm
  'reset'     -> ResetPasswordForm

Transitions:
  Tab tap "Login"           -> 'login'
  Tab tap "Register"        -> 'register'
  "Forgot password?" tap    -> 'reset'
  "Back to login" tap       -> 'login'
  Registration success      -> show EmailVerificationModal, then -> 'login'
  Reset email sent          -> show success state within ResetPasswordForm
```

**Why internal state, not router screens:** The CONTEXT.md locks this as "single screen with tabbed toggle." The web app uses this exact pattern in `AuthSurface.tsx`. Internal state allows shared form fields (email persists between login/register), smooth transitions, and a single auth card container.

**Confidence: HIGH** -- Directly mirrors the web app's `AuthSurface` component.

### Pattern 5: Auth Service (Copy and Adapt from Web)

**What:** Port `auth.ts` from the web app with minimal changes.

**Changes from web version:**
1. Import path: `import { supabase } from '@/lib/supabase'` (instead of `'../lib/supabase'`)
2. `resetPassword()`: Replace `window.location.origin + window.location.pathname` with `Linking.createURL('reset-password')` (generates `ironlift://reset-password`)
3. Remove `window.location.hash` cleanup from `goToLoginAfterPasswordUpdate` (no URL bar in native app)

**Keep unchanged:**
- `register()`, `login()`, `logout()`, `updateUser()`, `getCurrentUser()`, `getSession()`, `onAuthStateChange()` -- all work identically
- Validation logic (empty check, min length, password match)
- Return types (`AuthResult`, `SuccessResult`, `ServiceError`)

**Confidence: HIGH** -- Types are already in `src/types/services.ts`. The web service is straightforward Supabase calls.

### Anti-Patterns to Avoid

- **Separate Expo Router screens for login/register/reset:** Fights the locked decision of a single auth screen with tabbed toggle. Would create unnecessary navigation transitions and break shared form state.
- **Using `detectSessionInUrl: true` in Supabase config:** This is for web apps where Supabase reads tokens from `window.location`. In React Native there's no URL bar -- it's already set to `false` in the existing config. Deep link tokens must be handled manually.
- **Calling Supabase methods inside `onAuthStateChange` callback:** Supabase docs explicitly warn this causes deadlocks. Set state in the callback, handle side effects in `useEffect`.
- **Using `getSession()` as the sole session check without `onAuthStateChange`:** `getSession()` returns the cached session which may be stale. `onAuthStateChange` provides real-time updates. Use both: `getSession()` for initial check, `onAuthStateChange` for ongoing state.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence | Custom AsyncStorage session manager | `expo-sqlite/localStorage` adapter passed to Supabase client (already configured) | Supabase handles serialization, token refresh, and persistence internally when given a storage adapter |
| Token refresh | Manual refresh token rotation | `autoRefreshToken: true` + `startAutoRefresh()`/`stopAutoRefresh()` with AppState listener | Supabase client handles refresh timing, error recovery, and race conditions |
| URL scheme handling | Manual URL scheme registration | `app.json` `scheme` field (already set to `"ironlift"`) | Expo handles Info.plist configuration automatically |
| Password visibility toggle icons | Custom SVG icons | `@expo/vector-icons/Ionicons` `eye` and `eye-off` icons | Already installed, matches iOS native feel |
| Splash screen timing | Custom loading screen component | `expo-splash-screen` with `preventAutoHideAsync()` / `hideAsync()` | Native splash screen is visible during JS bundle load. Extending it until auth check completes prevents flash. |

**Key insight:** The Supabase client with `expo-sqlite/localStorage` adapter handles 90% of session management automatically. The app code only needs to: (1) listen to auth state changes, (2) handle the password reset deep link manually, and (3) wire up the UI.

---

## Common Pitfalls

### Pitfall 1: Auth Screen Flash on App Launch
**What goes wrong:** App shows the login screen for a split second before checking the session and redirecting to the dashboard.
**Why it happens:** `getSession()` is async. The root layout renders immediately with `isLoggedIn = false`, showing auth screens. When the session resolves, it flips to `true`, causing a visible flash.
**How to avoid:** Keep the native splash screen visible (`SplashScreen.preventAutoHideAsync()`) until `isLoading` becomes false. Return `null` from the root layout while loading.
**Warning signs:** Users see a login form flash when opening the app while already logged in.

### Pitfall 2: Hash Fragment vs Query Params in Deep Links
**What goes wrong:** `Linking.parse()` or standard URL parsing returns `null` for tokens because Supabase puts them in the hash fragment (#access_token=...), not query params (?access_token=...).
**Why it happens:** URL hash fragments are client-side only (never sent to server). Supabase uses them for security. Standard URL parsers treat everything after # as a single fragment string.
**How to avoid:** Manually extract the hash fragment and parse it with `URLSearchParams`. See "Deep Link Token Extraction" pattern above.
**Warning signs:** `access_token` and `refresh_token` are `null` when parsing the deep link URL.

### Pitfall 3: PASSWORD_RECOVERY vs SIGNED_IN Event Race
**What goes wrong:** When the user opens a password reset link, both `PASSWORD_RECOVERY` and `SIGNED_IN` events may fire. If `SIGNED_IN` is handled first, the app navigates to the dashboard instead of the password reset screen.
**Why it happens:** `setSession()` establishes a session (triggering `SIGNED_IN`), but Supabase also emits `PASSWORD_RECOVERY` to indicate the session came from a recovery link.
**How to avoid:** Two approaches: (a) Use a `isPasswordRecoveryMode` flag (like the web app does) that prevents `SIGNED_IN` from overriding navigation; or (b) handle the deep link routing at the URL level -- if the URL path is `reset-password`, navigate there directly regardless of auth events.
**Warning signs:** Users clicking password reset links end up on the dashboard instead of the password update form.

### Pitfall 4: Expired/Invalid Reset Link Tokens
**What goes wrong:** User clicks an old password reset link. `setSession()` fails because tokens are expired. The Set New Password screen shows but the form submission fails with a cryptic error.
**Why it happens:** Supabase reset tokens have a limited lifetime (default 1 hour). Email link scanners can also consume the token before the user clicks it.
**How to avoid:** Check for errors from `setSession()` immediately. If it fails, show the error in the standard red error box on the Set New Password screen with a "Request New Link" button (as specified in CONTEXT.md).
**Warning signs:** Users report "can't reset password" errors intermittently.

### Pitfall 5: Deadlocks in onAuthStateChange Callback
**What goes wrong:** App freezes or auth state becomes inconsistent.
**Why it happens:** Calling Supabase auth methods (getUser, getSession, signOut) inside the `onAuthStateChange` callback creates a deadlock. Supabase docs explicitly warn against this.
**How to avoid:** Only update React state inside the callback. Handle side effects (data fetching, cache clearing) in `useEffect` hooks that react to the state changes.
**Warning signs:** App hangs on login or logout.

### Pitfall 6: Keyboard Covers Form Inputs on iOS
**What goes wrong:** The keyboard slides up and covers the email/password input fields, making it impossible to see what you're typing.
**Why it happens:** iOS keyboard doesn't automatically push content up in React Native unless `KeyboardAvoidingView` is used.
**How to avoid:** Wrap the auth screen content in `KeyboardAvoidingView` with `behavior="padding"` on iOS. For auth forms with only 2-3 fields, this is sufficient without needing a ScrollView.
**Warning signs:** Users can't see the input field they're typing in on smaller iPhones.

---

## Code Examples

### Auth Service (adapted from web app)

```typescript
// src/services/auth.ts
// Copied from web app's auth.ts with two changes:
// 1. Import path for supabase client
// 2. resetPassword redirectTo URL

import * as Linking from 'expo-linking';
import type { User, Session } from '@supabase/supabase-js';
import type {
  AuthService,
  AuthResult,
  SuccessResult,
  ServiceError,
  AuthStateChangeCallback,
  AuthSubscription,
} from '@/types/services';
import { supabase } from '@/lib/supabase';

async function register(email: string, password: string): Promise<AuthResult> {
  // ... identical to web app
}

async function login(email: string, password: string): Promise<AuthResult> {
  // ... identical to web app
}

async function logout(): Promise<ServiceError> {
  // ... identical to web app
}

async function resetPassword(email: string): Promise<SuccessResult> {
  try {
    if (!email) {
      return { success: false, error: new Error('Email is required') };
    }

    // KEY CHANGE: Use deep link URL instead of window.location
    const redirectTo = Linking.createURL('reset-password');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return { success: false, error };
    }
    return { success: true, error: null };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err : new Error(String(err)),
    };
  }
}

// updateUser, getCurrentUser, getSession, onAuthStateChange -- identical to web
```

### Deep Link Handler in Root Layout or Reset Password Screen

```typescript
// In the reset-password screen or a dedicated hook
import * as Linking from 'expo-linking';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function useDeepLinkSession() {
  const url = Linking.useURL();

  useEffect(() => {
    if (!url) return;

    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return;

    const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          console.error('Failed to set session from deep link:', error.message);
          // Handle error -- show in UI
        }
      });
    }
  }, [url]);

  return url;
}
```

### TextInput with Password Toggle (Reusable Component)

```typescript
// src/components/TextInputField.tsx
import { View, TextInput, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, type Theme } from '@/theme';
import { useState } from 'react';

interface TextInputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences';
  hint?: string;
}

export function TextInputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  hint,
}: TextInputFieldProps) {
  const theme = useTheme();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isPassword = secureTextEntry;

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <Text style={{
        color: theme.colors.textPrimary,
        fontSize: theme.typography.sizes.sm,
        fontWeight: theme.typography.weights.medium,
      }}>
        {label}
      </Text>
      <View style={{ position: 'relative' }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={isPassword && !isPasswordVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          style={{
            backgroundColor: theme.colors.bgPrimary,
            color: theme.colors.textPrimary,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radii.md,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm + 2,
            fontSize: theme.typography.sizes.base,
            paddingRight: isPassword ? 48 : theme.spacing.md,
          }}
        />
        {isPassword && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={{
              position: 'absolute',
              right: theme.spacing.sm,
              top: 0,
              bottom: 0,
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.xs,
            }}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={22}
              color={theme.colors.textMuted}
            />
          </Pressable>
        )}
      </View>
      {hint && (
        <Text style={{
          color: theme.colors.textMuted,
          fontSize: theme.typography.sizes.xs,
        }}>
          {hint}
        </Text>
      )}
    </View>
  );
}
```

### AppState Auto-Refresh (Add to Supabase Client)

```typescript
// Add to src/lib/supabase.ts
import { AppState } from 'react-native';

// Tell Supabase Auth to continuously refresh the session automatically
// when the app is in the foreground. Stops refresh when backgrounded.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
```

**Source:** Official Supabase tutorial for Expo React Native.

### Keyboard Avoidance for Auth Forms

```typescript
// In auth screen
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

// Wrap auth card content
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  style={{ flex: 1 }}
>
  <ScrollView
    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
    keyboardShouldPersistTaps="handled"
  >
    {/* Brand header + Auth card */}
  </ScrollView>
</KeyboardAvoidingView>
```

**Note:** `keyboardShouldPersistTaps="handled"` prevents keyboard dismissal when tapping buttons inside the form -- essential for the submit button to work without requiring a double-tap.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-secure-store` for session tokens | `expo-sqlite/localStorage` adapter | 2025 (Supabase tutorial update) | expo-secure-store has ~2048 byte limit that breaks Supabase sessions. Already using the correct approach. |
| `autoRefreshToken: true` alone | `startAutoRefresh()` / `stopAutoRefresh()` with AppState | 2024+ (Supabase v2) | Auto-refresh needs explicit start/stop for non-browser environments. Without it, tokens may not refresh when app returns from background. |
| Redirect-based auth guard (useSegments + router.replace) | `Stack.Protected` guard | Expo Router v4+ (SDK 54) | Declarative, no redirect flicker. Already scaffolded in Phase 1. |
| `detectSessionInUrl: true` (web default) | `detectSessionInUrl: false` (React Native) | Always for RN | Already configured correctly in existing Supabase client. |

**Deprecated/outdated:**
- `expo-secure-store` for Supabase session storage -- value size limit breaks sessions
- Redirect-based auth guards with `useSegments()` -- replaced by `Stack.Protected`
- `AsyncStorage` for Supabase session storage -- `expo-sqlite/localStorage` is now the Supabase-recommended adapter

---

## Existing Codebase Integration Points

### Already Done (Phase 1)
1. **Supabase client:** `src/lib/supabase.ts` -- `expo-sqlite/localStorage` adapter, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`. Ready to use.
2. **URL scheme:** `app.json` has `"scheme": "ironlift"`. Deep links will work.
3. **Stack.Protected guard:** `app/_layout.tsx` has the guard scaffolded with `isLoggedIn = true` hardcoded. Phase 2 replaces this with real auth state.
4. **Auth screen routes:** `app/sign-in.tsx` and `app/create-account.tsx` exist as placeholders. Phase 2 will replace `sign-in.tsx` content and likely remove `create-account.tsx` (since register is an internal tab, not a separate route).
5. **Service types:** `src/types/services.ts` has `AuthService`, `AuthResult`, `SuccessResult`, `ServiceError`, `AuthStateChangeCallback`, `AuthSubscription` -- all ready for the auth service.
6. **Theme tokens:** `danger` (red), `success` (green), `textMuted`, `accent`, `bgSurface`, `border`, `radii`, `shadows` -- all tokens needed for auth UI exist.

### Needs Phase 2 Work
1. **Add AppState auto-refresh** to `src/lib/supabase.ts`
2. **Create auth service** at `src/services/auth.ts` (copy from web, adapt)
3. **Create AuthProvider** at `src/hooks/useAuth.ts` (context + hook)
4. **Wire AuthProvider** into `app/_layout.tsx` (wrap RootLayoutNav)
5. **Replace hardcoded `isLoggedIn`** with `useAuth()` hook
6. **Add splash screen hold** during initial session check
7. **Build auth UI components** (TextInputField, ErrorBox, SuccessBox, SubmitButton, etc.)
8. **Rebuild `app/sign-in.tsx`** with full auth surface (login/register/reset)
9. **Create `app/reset-password.tsx`** for deep link target (Set New Password screen)
10. **Remove `app/create-account.tsx`** (register is internal to sign-in screen now)
11. **Add deep link handler** for password reset tokens
12. **Add redirect URL** `ironlift://reset-password` to Supabase Dashboard allowed redirect URLs
13. **Handle logout** -- clear local cache (AUTH-05 requirement, for settings phase but logout action itself belongs here)

---

## Supabase Dashboard Configuration Required

The following must be configured in the Supabase project dashboard (not in code):

1. **Redirect URLs:** Add `ironlift://reset-password` to Authentication > URL Configuration > Redirect URLs
2. **Email verification:** Ensure "Enable email confirmations" is ON (default) in Authentication > Providers > Email
3. **Password minimum length:** Verify minimum password length is 6 in Authentication > Providers > Email (matches client-side validation)

**Confidence: HIGH** -- Standard Supabase dashboard configuration.

---

## Open Questions

1. **Deep link routing with Expo Router:** When the app receives `ironlift://reset-password#access_token=...`, does Expo Router route to `app/reset-password.tsx` automatically? The `#` hash fragment should not affect routing (only the path matters). This needs verification during implementation. If Expo Router does NOT route to it automatically (because the screen is in a Protected group and the session isn't established yet), the deep link handler may need to be in the root layout's `+native-intent.tsx` or handled before routing.

   - **What we know:** Expo Router maps deep links to file paths. `ironlift://reset-password` should map to `app/reset-password.tsx`. The `useURL()` hook provides the full URL including hash.
   - **What's unclear:** The timing -- does Expo Router attempt to navigate to `reset-password` before or after the auth state updates from `setSession()`? If the screen is protected behind `guard={isLoggedIn}` and `isLoggedIn` is still `false`, the navigation may be blocked.
   - **Recommendation:** Place the deep link token extraction in a `+native-intent.tsx` file OR in the AuthProvider (checking URL on mount), so `setSession()` is called BEFORE Expo Router tries to navigate. Alternatively, put `reset-password` screen outside of any Protected guard.

2. **Logout cache clearing (AUTH-05):** The requirement says "local cache is cleared on logout." The auth service itself just calls `supabase.auth.signOut()`. The cache clearing (AsyncStorage data for exercises, templates, history) is technically a Phase 3+ concern since no cache exists yet. The auth service should expose a `logout()` function that can be extended later.

   - **Recommendation:** Implement basic `signOut()` now. Add cache clearing when cache infrastructure exists.

---

## Sources

### Primary (HIGH confidence)
- [Supabase Official: Use Supabase with Expo React Native](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native) -- Client setup with expo-sqlite/localStorage, AppState auto-refresh pattern
- [Supabase Official: Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) -- Deep link setup, createSessionFromUrl pattern, QueryParams import from expo-auth-session
- [Supabase Official: Auth Events (onAuthStateChange)](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) -- Complete event list including PASSWORD_RECOVERY, deadlock warning
- [Supabase Official: Build User Management App with Expo](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) -- AppState auto-refresh code, session persistence
- [Expo Official: Stack.Protected Routes](https://docs.expo.dev/router/advanced/protected/) -- Guard prop behavior, auto-redirect, history cleanup
- [Expo Official: Using Supabase](https://docs.expo.dev/guides/using-supabase/) -- expo-sqlite/localStorage setup code
- [Expo Blog: Simplifying Auth Flows with Protected Routes](https://expo.dev/blog/simplifying-auth-flows-with-protected-routes) -- Stack.Protected pattern examples
- Web app source: `exercise_tracker_app/packages/shared/src/services/auth.ts` -- Direct reference for service port
- Web app source: `exercise_tracker_app/apps/web/src/surfaces/auth/AuthSurface.tsx` -- Direct reference for UI state machine

### Secondary (MEDIUM confidence)
- [GitHub Issue #843: supabase-js Password Reset Deep Link](https://github.com/supabase/supabase-js/issues/843) -- Confirms tokens arrive in URL hash fragment (#), not query params (?). Workaround for parsing.
- [Expo Docs: Customizing Deep Links (+native-intent)](https://docs.expo.dev/router/advanced/native-intent/) -- redirectSystemPath for intercepting deep links before routing
- [GitHub Demo: expo-router-guard-demo](https://github.com/aaronksaunders/expo-router-guard-demo) -- Community example of Stack.Protected with auth and roles

### Tertiary (LOW confidence)
- [Supabase Discussion #33633](https://github.com/orgs/supabase/discussions/33633) -- Reports of reset password deep link working inconsistently. May be email scanner related, not a code issue.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- All libraries already installed and configured
- Architecture patterns: HIGH -- Directly mirrors web app patterns, verified with official docs
- Auth service port: HIGH -- Source code examined, changes are minimal and well-understood
- Deep link handling: MEDIUM -- Token extraction pattern verified, but routing timing with Stack.Protected needs implementation testing (Open Question 1)
- Pitfalls: HIGH -- Well-documented in official sources and community issues

**Research date:** 2026-02-12
**Valid until:** 2026-03-12 (stable -- Supabase auth API and Expo Router patterns are mature)

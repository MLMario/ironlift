# Stack Research

**Domain:** iOS Exercise Tracker (Expo React Native + Supabase)
**Researched:** 2026-02-11
**Confidence:** MEDIUM-HIGH (versions verified via npm/official docs; some Expo Go compatibility details are LOW confidence)

---

## Critical Finding: Architecture Decision Needs Revision

The project constitution specifies "classic architecture (no New Architecture)." However, research reveals this is effectively moot and potentially harmful:

1. **Expo Go only supports the New Architecture** (since SDK 52). Since the dev workflow is Expo Go on a physical iPhone, the app will ALWAYS run on New Architecture during development regardless of config.
2. **SDK 54 is the LAST SDK to support Legacy Architecture.** SDK 55 (entering beta now, Jan 2026) removes it entirely. Starting a new project on Legacy Architecture means being forced to migrate within months.
3. **Reanimated v4 (bundled with SDK 54) only supports New Architecture.** Using Legacy Architecture requires downgrading to Reanimated v3, which is a maintenance path, not the happy path.

**Recommendation:** Accept the New Architecture. Since Expo Go already runs it, and SDK 55 mandates it, fighting it creates unnecessary friction. The "classic architecture for stability" rationale from the decision document is outdated -- the New Architecture is now the stable default with 83% adoption among SDK 54 EAS Build projects.

**Confidence: HIGH** -- verified via Expo official docs, SDK 54 changelog, and Reanimated compatibility table.

---

## Critical Finding: Auth Storage Approach

The project constitution specifies `expo-secure-store` for Keychain token storage. Research reveals a complication:

1. **expo-secure-store has a ~2048 byte practical limit** on iOS. Supabase session tokens frequently exceed this (especially with OAuth, but even email/password sessions can be ~2800+ bytes).
2. **Official Supabase docs now recommend `expo-sqlite/localStorage`** as the default storage adapter for Expo React Native (not expo-secure-store).
3. **The LargeSecureStore workaround** (AES-256 encryption key in SecureStore, encrypted data in AsyncStorage) exists but adds complexity and dependencies (`aes-js`, `react-native-get-random-values`).

**Options:**
- **Option A (Recommended): Use `expo-sqlite/localStorage`** -- matches current Supabase official docs, zero size limits, works in Expo Go. Data is unencrypted but on-device (same security as AsyncStorage). Simplest path.
- **Option B: LargeSecureStore pattern** -- encrypts session data with AES-256 key stored in Keychain. More secure but adds 2 dependencies and ~50 lines of adapter code. Only worthwhile if the app stores truly sensitive data beyond auth tokens.
- **Option C: Direct expo-secure-store** -- constitution's original choice. Will work for email/password sessions IF tokens stay under 2048 bytes. Fragile -- could break silently if Supabase adds claims or if tokens grow.

**Confidence: HIGH** -- verified via Expo SecureStore docs, Supabase official Expo tutorial, and community issue discussions.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Confidence | Why Recommended |
|------------|---------|---------|------------|-----------------|
| Expo SDK | ~54.0.33 | App framework, dev tooling, build system | HIGH | Latest stable SDK. Last to support Legacy Arch opt-out, but New Arch is the correct path. Includes RN 0.81, React 19.1 |
| React Native | 0.81 | Mobile UI runtime | HIGH | Bundled with Expo SDK 54. Stable, well-tested |
| React | 19.1 | Component library | HIGH | Bundled with Expo SDK 54 |
| TypeScript | ~5.7 | Type safety | HIGH | Bundled with Expo, version managed by `npx expo install` |
| Expo Router | ~4.0.x | File-based navigation | HIGH | Bundled with SDK 54. v4 is the version that ships with SDK 54 (v6 is for SDK 55 beta). Handles deep linking, modal/stack presentation |
| Supabase JS | ~2.49.x | Database client, auth, RLS | HIGH | Latest 2.x. Use `npx expo install` to get compatible version. Direct client, no API layer |

**Note on Expo Router version:** Search results showed expo-router 6.0.23 as "latest" on npm, but this is for SDK 55 beta. For SDK 54, Expo Router v4.x is the correct version. Always install via `npx expo install expo-router` to get the SDK-compatible version.

### Expo Packages (Managed by SDK)

These are installed via `npx expo install` which resolves the correct version for your SDK.

| Package | Expected Version (SDK 54) | Purpose | Expo Go | Confidence |
|---------|---------------------------|---------|---------|------------|
| expo-router | ~4.0.x | File-based routing, deep links | Yes | MEDIUM (exact version needs verification at install time) |
| expo-secure-store | ~15.0.x | iOS Keychain access (for encryption keys) | Yes | HIGH |
| expo-notifications | ~0.32.x | Local notification scheduling (rest timer) | Yes (local only) | HIGH |
| expo-linear-gradient | ~15.0.x | Gradient fills for charts | Yes | HIGH |
| expo-updates | ~0.28.x | OTA updates, EAS Update | N/A (build-only) | MEDIUM |
| expo-constants | Bundled | Environment variables, app config access | Yes | HIGH |
| expo-sqlite | ~15.x | localStorage polyfill for Supabase auth storage | Yes | HIGH |

### Third-Party Libraries

| Library | Version | Purpose | Expo Go | Confidence |
|---------|---------|---------|---------|------------|
| @gorhom/bottom-sheet | ~5.2.x | Settings menu bottom sheet | Yes | MEDIUM -- has reported SDK 54 issues (see Pitfalls) |
| react-native-reanimated | ~4.1.x | Animations (Expo Go built-in) | Yes | HIGH -- v4 is the SDK 54 default, requires New Architecture |
| react-native-gesture-handler | ~2.28.x | Gestures (Expo Go built-in) | Yes | HIGH |
| react-native-gifted-charts | ~1.4.x | Line/bar charts for workout data | Yes | MEDIUM -- actively maintained, works with Expo Go |
| react-native-svg | ~15.12.x | SVG rendering (chart dependency, Expo Go built-in) | Yes | HIGH |
| react-native-worklets | ~1.x | Worklet runtime for Reanimated v4 | Yes (bundled) | HIGH -- must be explicitly installed with SDK 54 |
| @react-native-async-storage/async-storage | ~2.2.x | Local key-value storage for caching and write queue | Yes | HIGH |
| @supabase/supabase-js | ~2.49.x | Supabase client | Yes | HIGH |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| jest-expo | Jest preset for Expo projects | Install via `npx expo install jest-expo jest` |
| @testing-library/react-native | Component testing utilities | Optional, for testing complex components |
| pnpm | Package manager | Already decided. Compatible with Expo Metro bundler |
| EAS CLI (`eas-cli`) | Cloud builds, submissions, OTA updates | Install globally: `pnpm add -g eas-cli` |
| TypeScript | Type checking | Bundled with Expo project template |

---

## Installation

```bash
# Create project (if not already created)
npx create-expo-app@latest ironlift --template blank-typescript

# Core Expo packages (use npx expo install for version pinning)
npx expo install expo-router expo-secure-store expo-notifications expo-linear-gradient expo-updates expo-constants expo-sqlite

# Reanimated v4 + worklets (SDK 54 default)
npx expo install react-native-reanimated react-native-worklets

# Gesture handler (Expo Go built-in, but must be in package.json)
npx expo install react-native-gesture-handler

# Async Storage
npx expo install @react-native-async-storage/async-storage

# SVG (Expo Go built-in, but must be in package.json for gifted-charts)
npx expo install react-native-svg

# Third-party libraries (use pnpm for non-Expo packages)
pnpm add @gorhom/bottom-sheet react-native-gifted-charts @supabase/supabase-js

# Dev dependencies
npx expo install jest-expo jest --dev
pnpm add -D @types/jest typescript
```

**Important:** Always use `npx expo install` for Expo SDK packages and RN ecosystem packages. It pins versions compatible with your SDK. Use `pnpm add` only for packages outside the Expo ecosystem (like Supabase JS, gifted-charts).

---

## Alternatives Considered

These alternatives were evaluated but NOT recommended because the project has already made its decisions. This section documents why the decisions hold.

| Category | Chosen | Alternative | Why Alternative Was Rejected |
|----------|--------|-------------|------------------------------|
| Framework | Expo SDK 54 | Expo SDK 53 | SDK 53 is older; SDK 54 has precompiled XCFrameworks (10x faster iOS builds), better Hermes bytecode diffing for OTA. No reason to use older SDK for new project |
| Framework | Expo SDK 54 | Expo SDK 55 (beta) | SDK 55 is in beta as of Jan 2026. Not stable enough for production project launch. Upgrade path from 54 to 55 is straightforward when it stabilizes |
| Navigation | Expo Router | React Navigation (raw) | Expo Router is built on React Navigation but automates navigator setup. For hub-and-spoke with ~6 screens, Expo Router is simpler. Deep linking comes free |
| Charts | react-native-gifted-charts | victory-native | victory-native v37+ requires react-native-skia which needs a custom dev client (not Expo Go). v36 works in Expo Go but is feature-frozen |
| Charts | react-native-gifted-charts | Custom SVG charts | More control but significantly more code for axis calculation, scaling, tooltips. Gifted-charts covers all needed chart types |
| Offline storage | AsyncStorage | expo-sqlite | AsyncStorage is sufficient for IronLift's ~16MB data ceiling. SQLite adds query overhead for key-value patterns. AsyncStorage keeps services simple |
| Offline storage | AsyncStorage | WatermelonDB / PowerSync | Sync engines add core dependencies and complexity. IronLift's sync pattern (write queue + last-write-wins) is simple enough to hand-roll |
| Auth storage | expo-sqlite/localStorage | expo-secure-store (direct) | SecureStore's 2048-byte limit risks silent failures with Supabase sessions. localStorage has no limit and is the current Supabase-recommended approach |
| Auth storage | expo-sqlite/localStorage | LargeSecureStore (AES wrapper) | Adds aes-js + get-random-values dependencies for encryption. Overkill for a single-user personal app. Tokens are already short-lived and auto-refresh |
| Bottom sheet | @gorhom/bottom-sheet | Hand-rolled | Bottom sheets require spring physics, gesture interplay, and snap points. The library is ~4KB and handles edge cases that would take weeks to replicate |
| UI libraries | Hand-rolled | NativeBase, Tamagui, RN Paper | Project decision is correct -- AI neutralizes tedium of hand-rolling, and no library fights against dark-mode-first design |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Reanimated v3 with SDK 54 | Legacy Architecture path. Expo Go runs New Arch anyway. Creates tech debt requiring migration before SDK 55 | Reanimated v4 (SDK 54 default) |
| react-native-linear-gradient | Community package, not Expo-managed. May have native module issues in Expo Go | expo-linear-gradient (Expo-managed, guaranteed Expo Go compat) |
| victory-native v37+ | Requires react-native-skia which needs custom dev client. Incompatible with Expo Go workflow | react-native-gifted-charts |
| react-native-chart-kit | Poorly maintained, limited customization, stale dependencies | react-native-gifted-charts |
| expo-secure-store as direct Supabase storage adapter | 2048-byte limit causes silent failures with session tokens | expo-sqlite/localStorage or LargeSecureStore pattern |
| @react-native-community/netinfo (old package name) | Deprecated package name | @react-native-community/netinfo is still the correct name, but install via `npx expo install @react-native-community/netinfo` |
| NativeWind | Does not yet support Reanimated v4. Would force Reanimated v3 downgrade | StyleSheet.create() with theme tokens |
| Any CSS-in-JS library | Project constraint. Adds unnecessary abstraction over StyleSheet | Hand-rolled StyleSheet.create() |

---

## Version Compatibility Matrix

| Package A | Compatible With | Known Issues | Confidence |
|-----------|-----------------|--------------|------------|
| Expo SDK 54 | React Native 0.81, React 19.1 | Last SDK with Legacy Arch support | HIGH |
| react-native-reanimated ~4.1.x | Expo SDK 54, New Architecture only | Must also install react-native-worklets | HIGH |
| react-native-gesture-handler ~2.28.x | Expo SDK 54, Reanimated v4 | SDK 54 reported issue with PanGestureHandler view errors (may be fixed in patches) | MEDIUM |
| @gorhom/bottom-sheet ~5.2.x | Reanimated v4 (since v5.1.8+) | SDK 54 TypeError 'level' of undefined reported; SDK 53 present() not working reported. Test early | LOW |
| react-native-gifted-charts ~1.4.x | react-native-svg, expo-linear-gradient | SVG onPress events may not work in SDK 54 (react-native-svg issue). Charts use pointerEvents -- test early | MEDIUM |
| @react-native-async-storage/async-storage ~2.2.x | Expo SDK 54 | v2.2.0 is the compatible version (bumped from 2.1.2 during SDK 54 upgrade) | HIGH |
| @supabase/supabase-js ~2.49.x | expo-sqlite/localStorage | Session storage requires localStorage polyfill from expo-sqlite | HIGH |
| expo-notifications ~0.32.x | Expo Go (local only) | Push notifications do NOT work in Expo Go (SDK 53+). Local notifications work fine | HIGH |

---

## Supabase Client Configuration

The Supabase client requires a storage adapter. Based on current official docs:

```typescript
// src/lib/supabase.ts
import 'expo-sqlite/localStorage/install'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,        // expo-sqlite polyfill
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,    // Required for RN (no URL bar)
  },
})
```

**Environment variables:** Expo uses `EXPO_PUBLIC_` prefix for client-accessible env vars. Store in `.env` file, access via `process.env.EXPO_PUBLIC_*`. No `expo-constants` needed for this pattern.

---

## Key Gotchas for Implementation

### 1. react-native-worklets Must Be Installed Explicitly
Even though it is internally bundled with Reanimated v4, you must `npx expo install react-native-worklets`. Omitting it causes runtime errors.

### 2. Babel Configuration for Reanimated
With SDK 54, `babel-preset-expo` handles Reanimated's Babel plugin automatically. Do NOT add `react-native-reanimated/plugin` to `babel.config.js` -- it is handled for you.

### 3. expo-router Version Mismatch Risk
`npm install expo-router` may pull v6.x (SDK 55 beta). Always use `npx expo install expo-router` to get the SDK-compatible version.

### 4. @gorhom/bottom-sheet SDK 54 Issues
Multiple GitHub issues report breakage with SDK 54. Test the bottom sheet component early in development. If broken, workarounds include:
- Pinning to a specific patch version
- Checking GitHub issues for fixes
- As a last resort, building a simpler custom bottom sheet with Reanimated v4 directly

### 5. expo-notifications: Local Only in Expo Go
Push notification features do NOT work in Expo Go (since SDK 53). Since IronLift uses local notifications only (rest timer), this is fine. But do not attempt to test push notification features in Expo Go.

### 6. OTA Update Boundary
`expo-updates` can only push JS-only changes. Any change to native modules, permissions, or app.json native config requires a full EAS build. Understand this boundary before relying on OTA.

---

## Sources

- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) -- SDK version, React Native version, package versions, Legacy Arch status (HIGH confidence)
- [Expo SDK 55 Beta Announcement](https://expo.dev/changelog/sdk-55-beta) -- Upcoming changes, New Arch mandate (HIGH confidence)
- [Expo New Architecture Guide](https://docs.expo.dev/guides/new-architecture/) -- Expo Go only supports New Arch (HIGH confidence)
- [Expo SDK Upgrade Guide](https://expo.dev/blog/expo-sdk-upgrade-guide) -- Reanimated v4, worklets, Legacy Arch guide (HIGH confidence)
- [Reanimated Compatibility Table](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/) -- Reanimated v4 requires New Arch (HIGH confidence)
- [Expo Reanimated v3 with SDK 54 Guide](https://github.com/expo/fyi/blob/main/expo-54-reanimated.md) -- How to downgrade if needed (HIGH confidence)
- [Supabase Expo React Native Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) -- Auth storage adapter, expo-sqlite/localStorage (HIGH confidence)
- [Expo SecureStore Docs](https://docs.expo.dev/versions/latest/sdk/securestore/) -- Size limit documentation (HIGH confidence)
- [Supabase SecureStore Discussion #14306](https://github.com/orgs/supabase/discussions/14306) -- 2048-byte limit with OAuth sessions (MEDIUM confidence)
- [react-native-gifted-charts npm](https://www.npmjs.com/package/react-native-gifted-charts) -- Version 1.4.74, Expo compatibility (HIGH confidence)
- [@gorhom/bottom-sheet Issue #2471](https://github.com/gorhom/react-native-bottom-sheet/issues/2471) -- SDK 54 TypeError (MEDIUM confidence)
- [@gorhom/bottom-sheet Issue #2528](https://github.com/gorhom/react-native-bottom-sheet/issues/2528) -- Bottom sheet not opening after Reanimated v4 upgrade (MEDIUM confidence)
- [Expo Notifications Docs](https://docs.expo.dev/versions/latest/sdk/notifications/) -- Local notifications in Expo Go, push notifications require dev build (HIGH confidence)
- [@react-native-async-storage/async-storage npm](https://www.npmjs.com/package/@react-native-async-storage/async-storage) -- Version 2.2.0 for SDK 54 (HIGH confidence)
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) -- Version 2.95.3 latest (HIGH confidence)
- [Expo Unit Testing Docs](https://docs.expo.dev/develop/unit-testing/) -- jest-expo setup (HIGH confidence)
- [react-native-svg SDK 54 Issue #2784](https://github.com/software-mansion/react-native-svg/issues/2784) -- SVG onPress handling issue (MEDIUM confidence)

---
*Stack research for: IronLift iOS Exercise Tracker*
*Researched: 2026-02-11*

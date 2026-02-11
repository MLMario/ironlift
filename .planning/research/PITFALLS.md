# Domain Pitfalls

**Domain:** Offline-capable iOS exercise tracker (Expo + Supabase + AsyncStorage)
**Researched:** 2026-02-11

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or architectural dead ends.

---

### Pitfall 1: expo-secure-store 2048-Byte Limit Breaks Supabase Session Storage

**What goes wrong:** The project constitution specifies storing Supabase auth tokens in iOS Keychain via `expo-secure-store`. However, a Supabase session object (access token + refresh token + user metadata) routinely exceeds 2048 bytes. Historically, some iOS releases reject SecureStore values above this threshold, and Expo SDK 35+ will throw an error on oversized values. Naively passing `expo-secure-store` as the Supabase `storage` adapter will cause auth to silently fail or crash on login.

**Why it happens:** The Supabase JS client serializes the entire session (including the JWT, refresh token, and user object) into a single string. Even with email/password auth (no OAuth provider metadata), the combined session string typically lands around 1500-2800 bytes depending on JWT claims and user metadata. Any user metadata growth (future profile fields, custom claims) pushes it over the limit.

**Consequences:** Users cannot log in, or sessions appear to persist but are actually lost. The app looks broken on first use. Silent failures are especially dangerous because they may pass developer testing (shorter tokens) but fail for users with longer metadata.

**Prevention:** Use the Supabase-documented `LargeSecureStore` pattern:
1. Generate an AES-256 encryption key and store it in `expo-secure-store` (the key itself is small, well under 2048 bytes).
2. Encrypt the full session string with that key.
3. Store the encrypted session in AsyncStorage (no size limit on iOS).
4. The storage adapter implements `getItem`/`setItem`/`removeItem` that transparently encrypt/decrypt.

Required dependencies: `aes-js` and `react-native-get-random-values` (for crypto). This is documented in the official Supabase Expo tutorial and should be implemented from the start.

**Detection:** Auth fails intermittently; "Value too large" errors in SecureStore; sessions not persisting across app restarts.

**Phase relevance:** Must be handled in the very first phase when the Supabase client is initialized. Retrofitting the storage adapter later requires migrating existing sessions.

**Confidence:** HIGH -- documented in official Supabase Expo tutorial and multiple GitHub discussions.

**Sources:**
- [Supabase Expo React Native Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native?auth-store=secure-store)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Supabase Discussion #14306](https://github.com/orgs/supabase/discussions/14306)
- [Supabase Issue #14523](https://github.com/supabase/supabase/issues/14523)

---

### Pitfall 2: AsyncStorage Race Conditions Corrupt Workout and Cache Data

**What goes wrong:** AsyncStorage operations are asynchronous and have no built-in transaction or locking mechanism. When the write queue, cache refresh, and active workout auto-save fire concurrently (which they will -- e.g., user finishes a set while a foreground sync is running), parallel `setItem` calls to overlapping keys can corrupt data. On Android (if ever targeted), parallel writes to large objects have been documented to crash the app with no visible error. On iOS, the sqlite-backed implementation can hit "database is locked" errors when concurrent `getDbAsync` calls create multiple connection instances.

**Why it happens:** The app has multiple independent write paths to AsyncStorage: (1) active workout auto-save on every state change, (2) write queue additions when workouts complete offline, (3) cache refresh after sync completes, (4) write queue drain during sync. Without coordination, these overlap.

**Consequences:** Lost workout data, corrupted cache requiring full cache rebuild, duplicated workouts after sync, or silent data loss where the user's last set disappears.

**Prevention:**
1. **Serialize all AsyncStorage writes through a single write coordinator** -- a queue or mutex that ensures only one write operation executes at a time per key namespace. A simple async queue (`Promise` chain per key prefix) prevents overlapping writes.
2. **Use `multiSet`/`multiGet`** for operations that touch multiple related keys atomically (e.g., updating both the active workout and the write queue).
3. **Never read-modify-write without guarding** -- always use the coordinator to prevent TOCTOU (time-of-check to time-of-use) races.
4. **Test concurrent write scenarios** in Jest using `useFakeTimers` and interleaved async operations.

**Detection:** Intermittent "data reverted to old state" bugs; user reports workout sets disappearing; write queue contains duplicate entries; "database is locked" errors in logs.

**Phase relevance:** Critical for any phase that implements the offline write queue or active workout auto-save. The write coordinator should be part of the foundation, not added later.

**Confidence:** HIGH -- documented in Expo issue #33754 (December 2024) and multiple AsyncStorage GitHub issues.

**Sources:**
- [Expo Issue #33754 - Race condition in AsyncStorage sqlite/kv-store](https://github.com/expo/expo/issues/33754)
- [AsyncStorage Issue #125 - Parallel setItem crashes](https://github.com/react-native-community/async-storage/issues/125)

---

### Pitfall 3: Write Queue Sync Creates Duplicate Workouts Without Proper Idempotency

**What goes wrong:** The offline write queue saves completed workouts locally and syncs them when connectivity returns. If the sync request succeeds on the server but the client does not receive the success response (network timeout, app backgrounded mid-request, iOS kills the connection), the queue item is not marked as synced. On the next sync attempt, the same workout is sent again, creating a duplicate in Supabase.

**Why it happens:** Network unreliability during sync is the norm, not the exception. Mobile networks drop connections mid-request frequently. The sync logic must be designed for "at-least-once" delivery and the server must handle deduplication.

**Consequences:** Duplicate workouts in history, corrupted chart data (double-counted volume/sets), user confusion seeing repeated entries. Manual cleanup is tedious and error-prone.

**Prevention:**
1. **Generate a UUID idempotency key client-side** when the workout is added to the write queue, before any sync attempt. Store this key in the queue entry and send it with every sync request.
2. **Server-side deduplication:** Add a `UNIQUE` constraint on the idempotency key column in the `workout_logs` table (or use `ON CONFLICT DO NOTHING` / upsert). The database rejects duplicates at the constraint level, which is more reliable than application-level checks.
3. **Mark queue items as "syncing" before the request** and only remove them on confirmed success. If the app crashes mid-sync, items in "syncing" state are retried on next launch.
4. **Implement exponential backoff** for retries to avoid hammering the server during outages.

**Detection:** Users report seeing the same workout twice in history; chart values suddenly jump (double-counted); write queue grows unexpectedly.

**Phase relevance:** Must be designed into the write queue from the start. Adding idempotency keys after users already have duplicate data requires a data migration and cleanup.

**Confidence:** HIGH -- this is a well-documented distributed systems pattern. Multiple sources confirm this is the primary risk with offline write queues.

**Sources:**
- [Advanced React Native Offline-Ready Apps (Medium)](https://medium.com/@theNewGenCoder/advanced-react-native-in-2025-building-completely-offline-ready-apps-with-seamless-sync-and-32b0569711d5)
- [wild.codes - Offline-First Sync in React Native](https://wild.codes/candidate-toolkit-question/how-do-you-manage-app-state-and-offline-first-sync-in-react-native)

---

### Pitfall 4: Supabase RLS Policies Missing or Misconfigured Expose All User Data

**What goes wrong:** Since IronLift uses direct Supabase access with no API layer, Row Level Security (RLS) is the **only** authorization barrier. If RLS is not enabled on a table, or if a policy has a logic error (e.g., missing `auth.uid() = user_id` check), the anon key embedded in the app gives any user full read/write access to all data in that table. The anon key is intentionally public and extractable from the app binary.

**Why it happens:** RLS is opt-in, not default. Creating a new table in Supabase leaves it open. Developers forget to enable RLS after schema changes, or write policies with subtle bugs (e.g., using `OR` instead of `AND`, forgetting to cover `DELETE` operations, or not restricting `INSERT` to set `user_id = auth.uid()`).

**Consequences:** Complete data breach -- any authenticated user can read/modify/delete other users' workouts, templates, and exercise data. Since the app exposes the Supabase URL and anon key in the client bundle, an attacker can craft direct API calls.

**Prevention:**
1. **Enable RLS on every table immediately after creation.** Never leave a public-schema table without RLS.
2. **Use a checklist for every table:** Does it have policies for SELECT, INSERT, UPDATE, DELETE? Does each policy filter by `auth.uid() = user_id`?
3. **INSERT policies must enforce `user_id = auth.uid()`** -- not just check it on SELECT. Otherwise users can insert records with another user's ID.
4. **Never use the `service_role` key in client code.** Only the `anon` key belongs in the app.
5. **Test RLS policies** by making Supabase API calls as different users and verifying data isolation. This can be manual but must be deliberate.
6. **Keep the SQL schema reference** (`sql/` directory) in sync with actual Supabase state and review policies during every schema change.

**Detection:** Data from other users appearing in the app; ability to see more data than expected when testing with multiple accounts; security audit findings.

**Phase relevance:** Must be validated in the first phase when the database is set up. Every subsequent phase that adds a table or modifies policies must re-verify.

**Confidence:** HIGH -- documented by Supabase themselves and confirmed by security research (170+ apps exposed by missing RLS).

**Sources:**
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Security Flaw: 170+ Apps Exposed (byteiota)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Supabase - Securing Your API](https://supabase.com/docs/guides/api/securing-your-api)

---

### Pitfall 5: Active Workout State Lost on iOS Process Termination

**What goes wrong:** iOS aggressively terminates backgrounded apps to reclaim memory. A user in the gym backgrounds the app to answer a text, iOS kills the process after a few minutes, and when the user returns, the active workout is gone -- all logged sets lost. The web app already handles crash recovery via localStorage, but the React Native implementation has different lifecycle semantics.

**Why it happens:** React Native's `AppState` API fires events for foreground/background transitions but NOT for process termination (the "killed" state). There is no callback for "app is about to be killed." If the workout state is only in React state (memory) and is persisted to AsyncStorage on a timer or on background transition, the last few interactions may be lost. Worse, if persist-on-background fires but AsyncStorage writes are still pending when the process is killed, data may be partially written.

**Consequences:** Users lose in-progress workout data -- potentially 30-60 minutes of logged sets. This is the most damaging UX failure for a workout tracker because it destroys the core value proposition. Users will abandon the app.

**Prevention:**
1. **Persist workout state to AsyncStorage on EVERY state change** -- every set logged, every weight entered, every exercise completed. AsyncStorage writes are fast for small payloads (<10KB). Do not batch or debounce.
2. **On app launch, always check for an in-progress workout** in AsyncStorage and offer to resume it.
3. **Use `AppState` background transition as a secondary save point**, not the primary one.
4. **Keep the persisted workout format identical to the in-memory format** so restoration is a simple read + setState.
5. **Test by force-killing the app** via iOS task switcher during an active workout and verifying full recovery.

**Detection:** Users report lost workouts after phone calls, switching to another app, or phone lock. QA testing: force-kill during workout and check recovery.

**Phase relevance:** Must be implemented in the active workout phase. This is not a nice-to-have -- it is the difference between a usable and unusable workout tracker.

**Confidence:** HIGH -- this is a well-known React Native lifecycle issue; the web app already handles it (the AsyncStorage equivalent is present in the constitution under "auto-save active workout locally").

**Sources:**
- [React Native AppState Documentation](https://reactnative.dev/docs/appstate)
- [Understanding App States in React Native (Medium)](https://medium.com/@vectoreman67/understanding-app-states-in-react-native-active-background-and-killed-c746afbdb554)

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded UX.

---

### Pitfall 6: @gorhom/bottom-sheet Does Not Auto-Dismiss on Navigation

**What goes wrong:** When the settings bottom sheet is open and the user navigates to a sub-screen (My Exercises, History), the bottom sheet remains visible behind the new screen or re-opens when navigating back. This is a documented interaction issue between `@gorhom/bottom-sheet` and Expo Router -- the bottom sheet's internal state is not tied to the navigation state.

**Why it happens:** `@gorhom/bottom-sheet` manages its own visibility state independently from Expo Router's navigation stack. The bottom sheet is a UI overlay on the dashboard, not a navigation screen. When a stack push occurs, the bottom sheet's `ref` still holds its expanded state.

**Consequences:** Visual glitches (bottom sheet visible behind pushed screen), confusing UX (bottom sheet reappears on back navigation), potential gesture conflicts (bottom sheet swipe-down interfering with screen swipe-back).

**Prevention:**
1. **Programmatically dismiss the bottom sheet before navigating.** When the user taps a settings option (e.g., "My Exercises"), call `bottomSheetRef.current?.close()` THEN `router.push('/settings/exercises')`. Use a small delay or `onClose` callback to ensure the sheet is fully dismissed before navigation.
2. **Listen to Expo Router navigation events** and dismiss the sheet on any `beforeRemove` or route change event.
3. **Set `enablePanDownToClose={true}`** and use the `onClose` callback to update local state tracking whether the sheet is open.
4. **Do NOT use `BottomSheetModal`** (the auto-managed variant) -- use the base `BottomSheet` with explicit `ref` control, which gives you full control over open/close timing.

**Detection:** Bottom sheet visible behind a pushed screen; bottom sheet reappears unexpectedly on back navigation; users unable to interact with the screen behind a phantom bottom sheet.

**Phase relevance:** Dashboard and settings navigation phases. Should be tested early when the bottom sheet and navigation are first integrated.

**Confidence:** MEDIUM -- documented in multiple GitHub issues (#1489, #1506, #2409) but may vary by version. The issues are real but workarounds exist.

**Sources:**
- [Issue #1489 - Bottom sheet doesn't close when route changed](https://github.com/gorhom/react-native-bottom-sheet/issues/1489)
- [Issue #1506 - BottomSheetModalInternalContext null error in expo-router](https://github.com/gorhom/react-native-bottom-sheet/issues/1506)
- [Issue #2409 - BottomSheet reopens after navigating back](https://github.com/gorhom/react-native-bottom-sheet/issues/2409)

---

### Pitfall 7: Supabase Auth Listener Leaks and Token Refresh Failures

**What goes wrong:** `onAuthStateChange` subscribers that are not properly cleaned up accumulate with each React component re-render or navigation event. The GoTrueClient has a documented memory leak where `setInterval` for token refresh persists even after the client is dereferenced. Additionally, token refresh can fail silently when the app is backgrounded for extended periods -- the refresh token expires (default 7 days for Supabase) and the user is logged out without warning.

**Why it happens:** React's `useEffect` cleanup is easy to forget for Supabase listeners. Each mount of a component that subscribes to auth state adds a new listener. In a hub-and-spoke navigation pattern where the dashboard mounts/unmounts as spokes push/pop, this can accumulate rapidly.

**Consequences:** Memory leaks causing sluggish performance over time; multiple conflicting auth state handlers causing race conditions; silent session expiry surprising users mid-workout.

**Prevention:**
1. **Set up `onAuthStateChange` in a single top-level AuthProvider** that wraps the entire app (in `_layout.tsx`). Never subscribe to auth state in individual screens.
2. **Always return the unsubscribe function** from the `useEffect` cleanup: `const { data: { subscription } } = supabase.auth.onAuthStateChange(...); return () => subscription.unsubscribe();`
3. **Call `supabase.auth.startAutoRefresh()` on app foreground** and `supabase.auth.stopAutoRefresh()` on background to conserve resources and prevent stale refresh intervals.
4. **Handle the `TOKEN_REFRESHED` and `SIGNED_OUT` events explicitly** -- on `SIGNED_OUT`, navigate to login; on `TOKEN_REFRESHED`, update any cached user data.
5. **Test long-background scenarios** -- leave the app backgrounded for hours, then return and verify the session is still valid.

**Detection:** Increasing memory usage over time; duplicate state change events in logs; user unexpectedly logged out after returning from background.

**Phase relevance:** Auth setup phase. The AuthProvider pattern must be established at the start and all subsequent code must use it rather than creating ad-hoc listeners.

**Confidence:** HIGH -- GoTrueClient memory leak is documented in auth-js Issue #856; Supabase official docs explicitly show the cleanup pattern.

**Sources:**
- [GoTrueClient Memory Leak - Issue #856](https://github.com/supabase/auth-js/issues/856)
- [Supabase Auth onAuthStateChange Documentation](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Supabase User Sessions Documentation](https://supabase.com/docs/guides/auth/sessions)

---

### Pitfall 8: OTA Updates Deployed for Native-Incompatible Changes

**What goes wrong:** `expo-updates` can only deliver JavaScript and asset changes. If an OTA update is pushed that references a native module, permission, or SDK feature not present in the currently installed binary, the app crashes on launch for all users who receive the update. There is no automatic rollback.

**Why it happens:** The boundary between "JS-only change" and "native change" is not always obvious. Adding a new Expo SDK module (even a JS-only wrapper), changing `app.json` configuration that affects the Info.plist, or updating a dependency that has native code all require a new binary build. Developers push an OTA update thinking it is JS-only when it actually depends on a native change.

**Consequences:** App crashes on launch for all users who receive the OTA update. Since there is no automatic rollback, affected users are stuck until a new OTA update or binary build is published.

**Prevention:**
1. **Understand the boundary explicitly:** OTA-safe changes = JS logic, component restructuring, style changes, asset swaps (images). NOT OTA-safe = new `expo-*` modules, `app.json` permission/config changes, new native dependencies, Expo SDK version upgrades.
2. **Use `expo-updates` runtime version pinning** to tie OTA updates to specific binary versions. OTA updates are only delivered to binaries with a matching runtime version.
3. **Test OTA updates against the production binary** (download from TestFlight, apply OTA, verify) before publishing to all users.
4. **Use EAS Update channels** (production, staging) to test updates on a staging channel before promoting to production.
5. **When in doubt, do a full build.** The cost of an unnecessary TestFlight build is far less than the cost of crashing all users.

**Detection:** Crash reports after OTA deployment; users reporting "app won't open"; `expo-updates` error logs showing module resolution failures.

**Phase relevance:** Relevant from the first production deployment onward. Must be part of the release process documentation.

**Confidence:** HIGH -- this is a fundamental `expo-updates` limitation documented by Expo.

**Sources:**
- [Expo Updates Documentation](https://docs.expo.dev/versions/latest/sdk/updates/)
- [OTA Updates with Expo Best Practices (Pagepro)](https://pagepro.co/blog/ota-updates-with-expo/)

---

### Pitfall 9: react-native-reanimated Version Mismatch Causes Expo Go Crashes

**What goes wrong:** Expo Go bundles a specific version of `react-native-reanimated`. If the project's `package.json` declares a different major/minor version, the app crashes on launch in Expo Go with no actionable error message. Since reanimated is a dependency of both `@gorhom/bottom-sheet` and `react-native-gifted-charts`, version conflicts are likely when updating any of these packages.

**Why it happens:** Expo Go is a pre-built binary with fixed native module versions. It cannot load a different version of reanimated than what was compiled into it. The JS-side API of reanimated may differ between versions, causing runtime crashes when the JS expects APIs that don't exist in the native module.

**Consequences:** The app crashes immediately on launch in Expo Go, blocking all development. Debugging is difficult because the error message often does not mention reanimated specifically.

**Prevention:**
1. **Always match the reanimated version to the current Expo SDK.** Check `npx expo install --check` which reports version mismatches.
2. **When upgrading Expo SDK, update all related packages together** -- reanimated, gesture-handler, bottom-sheet, and gifted-charts.
3. **Pin reanimated version in `package.json`** (exact version, not range) to prevent accidental updates.
4. **Run `npx expo install --fix`** to auto-resolve version mismatches after dependency updates.
5. **Test in Expo Go immediately after any dependency change** before writing new code.

**Detection:** App crashes on Expo Go launch after dependency update; "Native module not found" errors; reanimated-related crash logs.

**Phase relevance:** All phases. Every dependency update is a potential trigger.

**Confidence:** HIGH -- documented by Expo and Software Mansion (reanimated maintainers).

**Sources:**
- [Expo Reanimated Documentation](https://docs.expo.dev/versions/latest/sdk/reanimated/)
- [Reanimated Troubleshooting Guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting/)
- [Expo Issue #25041 - Expo Go crash with reanimated](https://github.com/expo/expo/issues/25041)

---

### Pitfall 10: react-native-gifted-charts Rendering Performance Degrades with Workout History Growth

**What goes wrong:** `react-native-gifted-charts` renders SVG elements for every data point. As the user accumulates months/years of workout history, charts with hundreds of data points become sluggish -- slow initial render, janky scroll on horizontally-scrollable charts, and increased memory usage. There is a documented crash on Android with 250+ data points (though this project targets iOS, the SVG rendering overhead applies to both platforms).

**Why it happens:** SVG-based charting creates a DOM node for every point, line segment, and label. Unlike canvas-based rendering (Chart.js on web), there is no virtualization -- all elements are rendered simultaneously. React Native's bridge amplifies this because each SVG element crosses the JS-native bridge.

**Consequences:** Charts become visibly slow to render after several months of consistent training (100+ workouts). Scrolling through chart data feels laggy. Memory pressure from SVG nodes can cause iOS to terminate the app.

**Prevention:**
1. **Limit data points at the data layer.** Before passing data to the chart component, slice to the most recent N data points (e.g., last 50 sessions or last 6 months). Provide a date-range filter in the UI.
2. **Aggregate data for long time ranges.** For "all time" views, aggregate by week or month instead of showing every individual session.
3. **Use `initialSpacing` and `endSpacing` props** to avoid rendering off-screen points.
4. **Defer chart rendering** -- do not render charts on the dashboard's initial mount. Use `InteractionManager.runAfterInteractions()` or lazy rendering so charts load after the screen transition completes.
5. **Profile early** -- test chart rendering with synthetic data (200+ points) before real user data accumulates.

**Detection:** Dashboard feels slow after months of use; chart scroll is janky; memory warnings in Xcode instruments; users with heavy training history report slowness.

**Phase relevance:** Charts phase. Data limiting should be designed into the chart computation service from the start.

**Confidence:** MEDIUM -- the Android crash is documented (Issue #437), and SVG rendering limits are well-understood, but the exact iOS threshold depends on device and data complexity.

**Sources:**
- [gifted-charts Issue #437 - App crash on large chunk of data](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/437)
- [Top React Native Chart Libraries 2025 (OpenReplay)](https://blog.openreplay.com/react-native-chart-libraries-2025/)

---

### Pitfall 11: Windows-to-iPhone Expo Go Development Network Issues

**What goes wrong:** The Expo dev server on Windows must be reachable by the physical iPhone on the same WiFi network. Windows Firewall blocks inbound connections by default. Corporate/shared/mesh WiFi networks often isolate clients. VPNs route traffic away from the local network. The result: Expo Go on the iPhone cannot connect to the dev server, or connections drop mid-session causing hot reload failures.

**Why it happens:** Windows Firewall, network isolation, and VPN are the three most common blockers. Unlike macOS which has relatively permissive default firewall settings for development, Windows actively blocks inbound traffic on the Metro bundler port (8081).

**Consequences:** Development is blocked entirely until network connectivity is established. If using tunnel mode as a workaround, development is significantly slower (all traffic routed through ngrok) and some features like hot reload may behave differently.

**Prevention:**
1. **Add a Windows Firewall exception** for the Expo CLI / Node.js process on TCP port 8081 (or whichever port Metro uses). Do this once during project setup.
2. **Ensure both devices are on the same WiFi network** and the router does not have client isolation enabled (common on guest networks).
3. **Disable VPN** during development, or configure split-tunneling to exclude local network traffic.
4. **Keep `npx expo start --tunnel` as a fallback** but do not use it as the primary workflow (slower, requires ngrok).
5. **Test the connection immediately** during project setup -- do not wait until deep into development to discover network issues.

**Detection:** Expo Go shows "Could not connect to development server"; hot reload stops working; long delays loading the JS bundle.

**Phase relevance:** Project setup / first phase. This must be resolved before any development begins.

**Confidence:** HIGH -- documented in multiple Expo issues and community reports; Windows firewall is a known blocker.

**Sources:**
- [Expo CLI Network Documentation](https://docs.expo.dev/more/expo-cli/)
- [Expo Issue #438 - Phone/Computer connection issues for Windows](https://github.com/expo/expo/issues/438)
- [When Expo Go Refuses to Load (Medium)](https://medium.com/code-sense/when-expo-go-refuses-to-load-my-unexpected-war-with-wi-fi-afb5c7ce8737)

---

## Minor Pitfalls

Mistakes that cause annoyance or minor rework but are straightforward to fix.

---

### Pitfall 12: Supabase Client detectSessionInUrl Must Be Disabled

**What goes wrong:** The Supabase JS client defaults to `detectSessionInUrl: true`, which attempts to parse auth tokens from the URL on initialization. In React Native, there is no URL bar, and this causes the client to make unnecessary/broken URL parsing attempts. It can also interfere with Expo Router's deep link handling for password reset flows.

**Why it happens:** The default is designed for web browsers where OAuth redirects include tokens in the URL fragment. React Native does not use this mechanism.

**Prevention:** Set `detectSessionInUrl: false` in the Supabase client configuration:
```typescript
const supabase = createClient(url, anonKey, {
  auth: {
    storage: customStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Phase relevance:** Supabase client initialization (first phase).

**Confidence:** HIGH -- explicitly documented in Supabase's React Native quickstart.

**Sources:**
- [Supabase React Native Auth Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)

---

### Pitfall 13: Email Verification Blocks Login by Default in Supabase

**What goes wrong:** Supabase Auth requires email verification before creating a session by default. In development, signing up with a test email sends a verification email that either goes nowhere (if using a fake email) or adds friction (checking email, clicking link). Without handling this, the sign-up flow appears broken -- the user creates an account but cannot log in.

**Why it happens:** Supabase enables email confirmation by default as a security measure. Developers often forget to either (a) disable it during development or (b) implement deep link handling for the confirmation email.

**Prevention:**
1. **During development:** Disable email confirmation in Supabase Dashboard > Authentication > Providers > Email > toggle off "Confirm email."
2. **For production:** Implement the email confirmation deep link flow (similar to password reset), or keep it disabled if the app is single-user / personal.
3. **Document the decision** in the project so future developers know whether confirmation is intentionally on or off.

**Phase relevance:** Auth phase. Must be decided during initial Supabase auth setup.

**Confidence:** HIGH -- documented in Supabase auth docs and the Expo quickstart.

**Sources:**
- [Supabase Auth React Native Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)

---

### Pitfall 14: EAS Build Requires Developer Mode on iOS 16+ for Device Installs

**What goes wrong:** When installing a development build (not TestFlight/production) on a physical iPhone running iOS 16+, the installation fails silently or the app crashes immediately. Developer Mode must be explicitly enabled in the device's Settings > Privacy & Security > Developer Mode. This is a one-time setup but it is not obvious to first-time iOS developers.

**Why it happens:** Apple introduced Developer Mode in iOS 16 as a security measure. It is disabled by default and only appears in Settings after connecting the device to Xcode or installing a developer-signed profile. Since IronLift development is on Windows (no Xcode), the Developer Mode toggle may not appear until after attempting to install a build.

**Prevention:**
1. **Enable Developer Mode early** -- before the first EAS build attempt. Settings > Privacy & Security > Developer Mode > toggle on > restart device.
2. **Register the device with EAS** using `eas device:create` which generates a provisioning profile.
3. **Document the one-time device setup** steps in the project README or setup guide.
4. **Note:** TestFlight builds do NOT require Developer Mode -- only ad-hoc / development builds.

**Phase relevance:** First EAS build attempt. One-time setup.

**Confidence:** HIGH -- documented in Expo's EAS tutorial.

**Sources:**
- [Expo EAS iOS Development Build Tutorial](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/)

---

### Pitfall 15: Expo Go SDK Version Pinning Causes Forced Upgrades

**What goes wrong:** Expo Go from the App Store only supports one SDK version at a time. When Expo releases a new SDK, the App Store version of Expo Go is updated and the old version is no longer installable. If the project uses an older SDK and the developer updates Expo Go on their iPhone, the project stops working in Expo Go until it is upgraded to the new SDK.

**Why it happens:** Expo Go is a single binary that must match the SDK version of the project. There is no version selection in Expo Go.

**Prevention:**
1. **Stay close to the latest Expo SDK** -- do not fall more than one version behind.
2. **Plan SDK upgrades** when new versions are released rather than deferring indefinitely.
3. **Before upgrading Expo Go on the device**, verify the project can be upgraded to the matching SDK (check breaking changes, dependency compatibility).
4. **Use `npx expo install --fix`** after SDK upgrades to resolve all dependency version conflicts.

**Detection:** Expo Go shows "SDK version mismatch" or refuses to load the project.

**Phase relevance:** Ongoing. Most impactful when Expo releases a new SDK during active development.

**Confidence:** HIGH -- fundamental Expo Go limitation, documented in Expo FAQ.

**Sources:**
- [Expo FAQ](https://docs.expo.dev/faq/)

---

### Pitfall 16: Notification Permission Denied Silently Breaks Rest Timer Background Alerts

**What goes wrong:** If the user denies notification permission on first launch (the constitution specifies requesting permission eagerly at first launch), the rest timer will appear to work in-foreground but will produce no alert when the app is backgrounded. There is no second prompt -- iOS does not allow re-requesting after denial. The user must manually go to Settings to re-enable.

**Why it happens:** iOS's permission model is one-shot for notifications. If denied, the API returns a non-granted status but does not throw an error. `scheduleNotificationAsync` silently succeeds but the notification is never delivered.

**Prevention:**
1. **Check the permission status** before scheduling notifications. If denied, show an in-app message explaining how to enable notifications in Settings, with a button that opens the Settings app (`Linking.openSettings()`).
2. **Do not block core functionality** on notification permission. The rest timer must still work visually in-foreground regardless of notification status.
3. **Consider deferring the permission request** to the first time the user starts a rest timer (contextual permission request), rather than on first launch. This increases the likelihood of acceptance because the user understands why the app is asking.
4. **Track permission status in app state** and display a subtle indicator if notifications are disabled.

**Phase relevance:** Rest timer / notification phase.

**Confidence:** HIGH -- standard iOS behavior, well-documented.

**Sources:**
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project Setup | Windows firewall blocks Expo Go connection (P11) | Add firewall exception for Node.js on port 8081 during setup |
| Project Setup | Expo Go SDK version mismatch (P15) | Verify SDK version match before starting development |
| Supabase Client Init | SecureStore 2048-byte limit breaks auth (P1) | Implement LargeSecureStore from day one |
| Supabase Client Init | detectSessionInUrl causes issues (P12) | Set to false in client config |
| Auth | Email verification blocks sign-up (P13) | Disable in dev, decide on production strategy |
| Auth | Auth listener memory leaks (P7) | Single AuthProvider with proper cleanup |
| Database Schema | Missing RLS policies expose data (P4) | Enable RLS on every table, verify policies per operation |
| Offline Cache / Storage | AsyncStorage race conditions (P2) | Build write coordinator before any concurrent writes |
| Active Workout | State loss on iOS process kill (P5) | Persist on every state change, not just on background |
| Write Queue / Sync | Duplicate workouts without idempotency (P3) | UUID idempotency keys + DB unique constraint |
| Dashboard + Settings | Bottom sheet navigation glitches (P6) | Dismiss sheet before navigation, listen to route changes |
| Charts | Gifted-charts performance with history growth (P10) | Limit data points, aggregate long ranges, defer rendering |
| Dependencies | Reanimated version mismatch crashes Expo Go (P9) | Pin versions, use `npx expo install --check` |
| Notifications | Permission denial breaks background alerts (P16) | Check status before scheduling, guide user to Settings |
| OTA Updates | Native-incompatible OTA crashes app (P8) | Runtime version pinning, test against production binary |
| First EAS Build | Developer Mode not enabled on device (P14) | Enable before first build attempt |

---

## Sources

### Official Documentation (HIGH confidence)
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo Reanimated Documentation](https://docs.expo.dev/versions/latest/sdk/reanimated/)
- [Expo Updates Documentation](https://docs.expo.dev/versions/latest/sdk/updates/)
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo FAQ](https://docs.expo.dev/faq/)
- [Expo EAS Build Tutorial](https://docs.expo.dev/tutorial/eas/ios-development-build-for-devices/)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth onAuthStateChange](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Supabase Expo React Native Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Supabase React Native Auth Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [React Native AppState](https://reactnative.dev/docs/appstate)
- [Reanimated Troubleshooting](https://docs.swmansion.com/react-native-reanimated/docs/guides/troubleshooting/)

### GitHub Issues (MEDIUM-HIGH confidence)
- [GoTrueClient Memory Leak #856](https://github.com/supabase/auth-js/issues/856)
- [Supabase Issue #14523 - Inconsistent store recommendations](https://github.com/supabase/supabase/issues/14523)
- [Expo Issue #33754 - AsyncStorage race condition](https://github.com/expo/expo/issues/33754)
- [AsyncStorage Issue #125 - Parallel setItem crashes](https://github.com/react-native-community/async-storage/issues/125)
- [gorhom/bottom-sheet Issue #1489 - No close on route change](https://github.com/gorhom/react-native-bottom-sheet/issues/1489)
- [gorhom/bottom-sheet Issue #2409 - Reopens after navigation](https://github.com/gorhom/react-native-bottom-sheet/issues/2409)
- [gifted-charts Issue #437 - Crash on large data](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/437)
- [Expo Issue #438 - Windows phone/computer connection](https://github.com/expo/expo/issues/438)

### Community / Blogs (MEDIUM confidence)
- [Supabase Security Flaw Report (byteiota)](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Advanced React Native Offline-Ready Apps (Medium)](https://medium.com/@theNewGenCoder/advanced-react-native-in-2025-building-completely-offline-ready-apps-with-seamless-sync-and-32b0569711d5)
- [OTA Updates Best Practices (Pagepro)](https://pagepro.co/blog/ota-updates-with-expo/)

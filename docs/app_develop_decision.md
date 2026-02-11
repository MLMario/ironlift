# IronLift: iOS Development Decisions

## Context

### Development Objective

IronLift is a web-based exercise tracker app (TypeScript/Preact, Supabase backend) that has reached a testable state on web. The next goal is to bring IronLift to iOS as a native mobile app, giving users a first-class experience on iPhone with capabilities beyond what the web offers (offline use, push notifications, biometrics, etc.).

### Document Objective

This document captures every critical decision required to take IronLift from web-only to iOS. Each dimension represents an area where a deliberate choice must be made before (or during) development. For each decision we record:

- **Intent** — why this decision matters and what it affects
- **Options considered** — the alternatives evaluated
- **Decision** — the chosen path and rationale
- **Implications** — downstream consequences, trade-offs, and follow-up actions

This is a living document. Decisions may be revisited as development progresses and new information surfaces.

### Current State (Web)

| Aspect | Detail |
|--------|--------|
| **Frontend** | Preact + TypeScript, Vite, deployed on Vercel |
| **Backend** | Supabase (PostgreSQL + Auth), no intermediary API |
| **Shared code** | `@ironlift/shared` package — services, types, hooks |
| **Monorepo** | pnpm workspace with `apps/web` and `packages/shared` |
| **Styling** | Plain CSS with custom properties, dark-mode only, mobile-first (480px max) |
| **State mgmt** | Preact hooks (no global store) |
| **Data persistence** | localStorage for active workout crash recovery only |
| **Auth** | Supabase Auth (email/password), session via `onAuthStateChange` |
| **Key features** | Exercise library (~200+), templates, active workout tracking, rest timer, workout history, charts |

---

## Status

| # | Dimension | Status |
|---|-----------|--------|
| 1 | Framework / Technology | Done |
| 2 | Code Sharing Strategy | Done |
| 3 | Offline-First & Data Sync | Done |
| 4 | Backend Architecture | Done |
| 5 | Auth on Mobile | Done |
| 6 | Navigation & UX Paradigm | Done |
| 7 | UI / Design System | Done |
| 8 | Push Notifications | Done |
| 9 | Distribution & CI/CD | Done |
| 10 | Testing Strategy | Done |

---

## Decisions

---

### 1. Framework / Technology

**Intent:** The foundational choice that determines the development language, tooling, available libraries, team skills required, and how much existing code can be reused. This is the highest-leverage decision — everything else follows from it.

**Options Considered:**

- **Expo (React Native)** — TypeScript-native, reuses `@ironlift/shared` directly, Expo handles builds/OTA/signing via EAS. Largest React Native ecosystem. Can eject to bare RN later.
- **React Native (bare)** — Same code reuse benefits but full control over native project. Higher maintenance burden, must manage Xcode/builds manually.
- **Swift / SwiftUI** — Best native performance and iOS integration. Requires learning Swift, zero code reuse from existing TypeScript codebase, two separate codebases going forward.
- **Capacitor (web wrapper)** — Wraps existing Preact web app in native shell. Minimal effort, but web-in-a-wrapper feel, weaker long-term quality.
- **PWA** — Zero native development. Limited iOS capabilities (no biometrics, limited background, no App Store presence).

**Decision:** Expo (React Native)

Expo provides the best balance of code reuse, developer experience, and iOS capability for IronLift. TypeScript carries over directly, `@ironlift/shared` (services, types, hooks) can be consumed as-is, and the Expo ecosystem covers all current feature needs. The team's existing TypeScript/React mental model transfers with minimal friction.

#### Sub-decisions

**1a. Development Workflow: Expo Go**

Start with Expo Go for development and testing. Expo Go is a pre-built app from the App Store that runs the JavaScript bundle over Wi-Fi — no build step needed. All current IronLift features (Supabase auth/queries, AsyncStorage, local notifications, secure storage, biometrics, haptics) are supported in Expo Go. Move to a Custom Dev Client only when features requiring custom native modules are added (HealthKit, widgets, Live Activities).

**1b. Minimum iOS Version: iOS 16**

~95% device coverage. All IronLift features work on iOS 16. No iOS 17+ APIs are needed for current functionality. Features that would justify a higher minimum (Interactive Widgets, StandBy mode, Control Center controls) all require native Swift code and a Custom Dev Client — the minimum can be raised at that point with a one-line config change.

**1c. React Native New Architecture: Yes (required by Expo Go)**

~~Original decision (2026-02-08): Classic architecture chosen to prioritize stability over performance gains. The classic architecture was battle-tested with broader library compatibility, and reducing risk from bleeding-edge runtime changes was more valuable than the performance benefits of Fabric/TurboModules.~~

**Superseded (2026-02-11):** Expo Go requires New Architecture since SDK 52, and SDK 55 removes the opt-out entirely. Reanimated v4 (SDK 54 default) also requires New Architecture. This is no longer a choice — New Architecture is the only supported path for Expo Go development.

**1d. Monorepo Tooling: Keep pnpm**

No package manager switch. The existing pnpm workspace works for the web app and Expo's Metro bundler now supports monorepos via `@expo/metro-config`. Requires some Metro configuration to handle pnpm symlinks, but this is well-documented. Avoiding the disruption of a package manager migration.

**1e. Development Machine: Windows PC + Expo Go on physical iPhone**

No Mac required for Phase 1. Code is written on Windows, Expo dev server runs locally, and the app is tested on a physical iPhone via Expo Go over Wi-Fi. This provides a fast dev loop and real-device testing (arguably better than simulator for a gym app). Cloud builds via EAS Build handle production/TestFlight builds. A Mac becomes valuable in Phase 2 when Custom Dev Client builds need faster local iteration — can be purchased at that point.

**Implications:**

- All development is in TypeScript/React Native — no Swift knowledge needed for Phase 1
- `@ironlift/shared` package is reused directly, but web-specific hooks (e.g., `useClickOutside`) won't apply and React Native equivalents will be needed
- Chart.js (web canvas library) will NOT work in React Native — a native chart library (e.g., `victory-native`, `react-native-gifted-charts`) must be chosen
- `@use-gesture/react` (web) must be replaced with `react-native-gesture-handler` (included in Expo Go)
- CSS design system cannot be ported directly — React Native uses StyleSheet objects, not CSS. Design system decisions follow in Dimension 7
- Phased approach: Expo Go now, Custom Dev Client + Mac later when native features are needed

---

### 2. Code Sharing Strategy

**Intent:** IronLift already has a `@ironlift/shared` package with services, types, and hooks. This decision determines how much of that investment carries over to iOS, what needs to be rewritten, and how shared code evolves going forward without diverging between platforms.

**Options Considered:**

- **Single shared package with compatibility shims** — Keep one `@ironlift/shared` consumed by both apps, add React/Preact compat layer and injectable interfaces for platform differences. Maximum reuse but shared package becomes complex.
- **Split into layers (core + platform adapters)** — Extract types and services into platform-agnostic core, hooks move to platform-specific code. Clean separation but requires monorepo restructuring.
- **Copy and diverge** — Fork reusable code into a new standalone iOS project, abandon the web app, no shared package.

**Decision:** Copy and diverge into a new standalone project

The web app is being abandoned. A new standalone Expo project is created at `C:\Users\MarioPC\Apps\ironlift\` with its own git repo. Reusable assets are copied from `exercise_tracker_app` rather than shared via a package. No monorepo — a single Expo project with organized internal folders.

#### Sub-decisions

**2a. What to Copy**

| Category | Assets | Action |
|----------|--------|--------|
| **Copy as-is** | Types (`database.ts`, `services.ts`), SQL schema files | Copied at project init — pure TypeScript, no framework deps |
| **Copy and adapt** | Services (`auth.ts`, `exercises.ts`, `templates.ts`, `charts.ts`, `logging.ts`) | Copied in a later phase — swap Supabase client import, adapt env vars, same business logic |
| **TBD (pending other decisions)** | Hooks (`useConfirmationModal`, `useTimerState`, `useWorkoutBackup`) | May rewrite for React or leave behind depending on decisions 3, 6, 7 |
| **Leave behind** | Web surfaces (`AuthSurface`, `DashboardSurface`, `TemplateEditorSurface`, `WorkoutSurface`), CSS stylesheets, Vite config, web-specific hooks (`useClickOutside`, `useAsyncOperation`), Chart.js integration, Preact components (`ConfirmationModal`, `ExercisePickerModal`, `InfoModal`) | iOS gets native equivalents built from scratch |

**2b. Project Structure: Organized src with internal layers (Option B)**

```
ironlift/
├── app/            # Expo Router screens (UI only)
├── src/
│   ├── types/      # database.ts, services.ts (copied as-is)
│   ├── services/   # auth, exercises, templates, etc.
│   ├── hooks/      # React Native hooks
│   ├── components/ # Reusable UI components
│   └── lib/        # Supabase client, utilities
├── sql/            # Schema reference (copied as-is)
├── assets/         # Images, fonts
├── package.json
└── app.json
```

Not a monorepo — just well-organized folders inside a single Expo project. Expo Go is unaffected by folder structure; Metro resolves imports from anywhere via path aliases in `tsconfig.json`. A monorepo was rejected because there is only one app with no shared consumers, making workspace tooling unnecessary overhead.

**2c. Supabase Client Initialization**

The current Supabase client uses Vite-specific env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). Expo uses a different mechanism (e.g., `expo-constants` or `.env` with `expo-env.d.ts`). This will be adapted when services are copied over — no architectural decision needed, just a noted implementation detail.

**Implications:**

- New project at `ironlift/` is fully independent — no dependency on `exercise_tracker_app`
- Types and SQL are the immediate starting point; services follow after Supabase client is set up
- Hook decisions are deferred — they depend on offline strategy (decision 3) and UX patterns (decision 6)
- Web app codebase (`exercise_tracker_app`) is preserved as reference but no longer actively developed

---

### 3. Offline-First & Data Sync

**Intent:** Mobile users expect the app to work without connectivity — in the gym, underground, on airplane mode. This decision defines how data is stored locally, how and when it syncs with Supabase, and how conflicts are resolved. Currently the web app only persists the active workout to localStorage.

**Options Considered:**

- **Online-only + active workout caching** — App requires internet for everything except crash-recovering an in-progress workout. Simplest, but poor UX in low-signal gyms.
- **Read cache + offline workout logging (Option B)** — Cache read-heavy data locally, allow workout logging offline with a write queue that syncs when connectivity returns. Good gym UX, moderate complexity.
- **Full offline-first with local SQLite** — Local DB is source of truth, background bidirectional sync. Best UX but highest complexity and conflict resolution burden.
- **Sync engine (PowerSync, WatermelonDB, etc.)** — Third-party library handles local DB + bidirectional sync automatically. Option C's UX with less custom code, but adds a core dependency.

**Decision:** Read cache + offline workout logging (Option B)

Cache frequently-read data (exercise library, templates, recent history) locally so the app opens instantly and works in poor signal. Allow starting and completing workouts offline using cached templates. Completed workouts save to a local write queue and sync to Supabase when connectivity returns. Template editing and other write operations still require connectivity.

This covers ~90% of gym scenarios (the user's core flow is: open app → pick template → log sets → finish) without the complexity of full bidirectional sync. IronLift's data is inherently small — a lifetime of training data is ~16 MB — so cache size and storage limits are not a practical concern.

#### Sub-decisions

**3a. Storage Mechanism: AsyncStorage**

Use AsyncStorage (key-value JSON store) for all local caching and the write queue. IronLift's data is small enough (~16 MB for a lifetime) that JSON serialization overhead is negligible. AsyncStorage is built into Expo, requires no additional dependencies, and is sufficient for the app's read/write patterns. SQLite would be over-engineered for this data volume.

**3b. Cache Scope**

| Data | Cached? | Scope |
|------|---------|-------|
| Exercise library (~200 system exercises) | Yes | All, always |
| User-created exercises | Yes | All non-deleted |
| Templates | Yes | All non-deleted |
| Workout history | Yes | All history cached locally |
| Chart data | Computed locally | Charts computed on-device from cached workout history — no separate chart data cache. Charts always reflect all workouts including unsynced ones. |

Deleted items are removed from cache on next sync. Cache is refreshed (not cleared) after each sync.

**3c. Sync Triggers**

Sync occurs on:
- App comes to foreground (pull fresh data from Supabase)
- User completes a write action: finish logging workout, create/update template, create/delete chart, create/delete user exercise
- Background fetch (iOS background app refresh, opportunistic)

No manual pull-to-refresh. No periodic polling while app is in foreground.

**3d. Conflict Handling: Last-write-wins**

Web app will not be public, so single-device usage is the expected scenario. No real conflict risk. In the unlikely event of a conflict, last-write-wins by timestamp. Workouts are append-only (created, never edited after completion), so the write queue is inherently conflict-free.

**Implications:**

- Core workout flow works fully offline — no blocked UX in the gym
- Template editing, chart creation, and account management still require connectivity
- Need a write queue with idempotency keys to prevent duplicate syncs
- Need clear UI indicators for sync status ("saved locally, will sync when online")
- Charts are computed locally from cached history — they work offline and always include unsynced workouts (no stale data)
- Chart computation logic from `charts.ts` service must be moved to run client-side against local data instead of Supabase queries
- Data loss risk is narrow: only unsynced workouts are at risk, and only if the user uninstalls the app or loses the phone before connectivity returns

---

### 4. Backend Architecture

**Intent:** The web app communicates directly with Supabase (no intermediary API). Moving to iOS introduces questions about whether this pattern scales across platforms, whether Row Level Security is sufficient, and whether a dedicated API layer is needed for push notifications, background sync, or future features.

**Options Considered:**

- **Direct Supabase (RLS only)** — iOS app talks to Supabase the same way the web app does. Supabase JS client in the app, Row Level Security handles authorization. No server code.
- **Direct Supabase + Edge Functions for server-side needs** — Keep direct Supabase for all CRUD, add Supabase Edge Functions (Deno) for operations requiring a server (push notification dispatch, write queue processing, scheduled jobs). Two communication patterns.
- **Full custom API layer** — All requests go through a custom API (Express/Fastify on VPS or serverless). Supabase becomes just a PostgreSQL database. Full control but significant new infrastructure.
- **Supabase Edge Functions for everything** — Route all client requests through Edge Functions. Single pattern but adds latency to every operation and works against Supabase's strengths.

**Decision:** Direct Supabase with RLS only (Option A)

IronLift's current and planned feature set (CRUD, auth, offline sync, charts) is fully served by direct Supabase with RLS. The only feature that would genuinely require server-side logic is data-dependent push notifications (e.g., "you haven't trained in 3 days" — requires querying data at trigger time). However, simpler scheduled reminders can use local notifications on-device. For a single-user personal app, introducing an API layer or Edge Functions now adds complexity with no current payoff.

If server-side needs arise later, Supabase Edge Functions can be added incrementally without rearchitecting — this decision does not close that door.

**Implications:**

- Services port from web to iOS with minimal change (swap Supabase client init only)
- RLS remains the sole authorization layer — no policy changes needed
- No server infrastructure to build, deploy, or maintain
- Push notification strategy (Decision 8) is constrained to local notifications or must revisit this decision if server-triggered push is needed
- Write queue sync (Decision 3) is handled entirely client-side with idempotency keys
- Edge Functions remain available as an incremental escape hatch

---

### 5. Auth on Mobile

**Intent:** Authentication on mobile has different constraints and opportunities than web — secure token storage (Keychain), biometric unlock (Face ID / Touch ID), deep links for password reset flows, and session lifecycle tied to app backgrounding. This decision shapes the login experience and security posture on iOS.

**Options Considered:**

- **Email/Password only (mirror web)** — Port existing auth as-is with secure storage. No biometrics, no social login. Simplest, fastest to ship.
- **Email/Password + Biometric unlock** — Add Face ID/Touch ID as convenience unlock after initial login. More implementation work.
- **Email/Password + Biometric + Apple Sign-In** — Full native auth with App Store compliance. Most complex, requires Apple Developer portal config.
- **Apple Sign-In only + Biometric** — Drop email/password entirely. Frictionless but loses continuity with existing web accounts.

**Decision:** Email/Password only (mirror web)

Simplest path. Same auth flow as the web app. No additional Supabase provider configuration needed. Biometrics and Apple Sign-In can be added later without rearchitecting.

#### Sub-decisions

**5a. Token Storage: `expo-sqlite/localStorage` adapter (Supabase-recommended)**

~~Original decision (2026-02-09): Supabase session tokens stored in the iOS Keychain via `expo-secure-store`. Chosen for OS-level encryption at rest and survival across app reinstalls.~~

**Superseded (2026-02-11):** `expo-secure-store` has a ~2048-byte limit that can break Supabase sessions (access + refresh tokens can exceed this). The Supabase official tutorial now recommends the `expo-sqlite/localStorage` adapter for token storage. Supabase JS client accepts a custom `storage` adapter at initialization — pass the `expo-sqlite/localStorage` adapter instead of the default `localStorage`.

**5b. Session Lifecycle: Persistent until explicit logout**

User logs in once, session auto-refreshes indefinitely via Supabase's refresh token. App open, background, kill, restart — all resume the session seamlessly. User only logs out when they tap "Log Out". Matches standard mobile app behavior.

**5c. Password Reset Flow: System browser with deep link return**

User taps "Forgot Password" in the app → enters email → Supabase sends a reset email. The reset link in the email opens in the user's default iOS browser (Safari). Supabase processes the token and redirects to the app via a deep link (e.g., `ironlift://reset-password#access_token=...`). The app intercepts the deep link, extracts the recovery token, and navigates to a native "Set New Password" screen. The existing `updateUser(password)` logic ports as-is.

Setup required:
- URL scheme (`ironlift://`) configured in `app.json`
- Deep link URL added to Supabase's allowed redirect URLs
- `resetPassword()` service updated to use the app's deep link as `redirectTo` instead of `window.location.origin`
- App entry point detects recovery token from deep link and routes to the password update screen

**Implications:**

- Auth services port from web with minimal change — swap Supabase client init to use `expo-sqlite/localStorage` storage adapter, swap `redirectTo` URL
- No new auth providers to configure in Supabase
- Session management is simpler than web (no tab/window concerns, just foreground/background)
- Deep link configuration (`ironlift://`) is a one-time setup that also benefits future features (e.g., shared workout links)
- No biometrics in v1 — can be layered on later as a gate before accessing the stored session
- Apple Sign-In deferred — only required by App Store if other third-party login providers are offered (email/password alone does not trigger this requirement)

---

### 6. Navigation & UX Paradigm

**Intent:** The web app uses a surface-switching pattern (auth / dashboard / workout / template editor). iOS users expect native navigation patterns — tab bars, stack navigation, swipe-back gestures, modal presentations. This decision defines how users move through the app and whether the information architecture changes.

**Options Considered:**

- **Tab Bar + Stack Navigation (Standard iOS)** — Bottom tab bar for top-level sections with stack navigation within each tab. Most common iOS pattern (Apple Fitness, Strong, Hevy). Persistent access to sections, swipe-back gestures within stacks.
- **Single Stack (Linear Flow)** — No tab bar. One navigation stack where the user pushes deeper and pops back. Simpler but limiting for jumping between sections.
- **Hub-and-Spoke (Dashboard-Centric)** — Central dashboard that branches out to full-screen flows (workout, template editor, history). Each spoke returns to the hub when done. Matches current web pattern with native transitions.
- **Drawer + Stack** — Side drawer for top-level navigation. Less common in modern iOS, more Android-native.

**Decision:** Hub-and-Spoke (Dashboard-Centric)

The dashboard is the single home screen. All flows (workout, template editing, settings) branch out from the dashboard as full-screen spokes and return to it on completion. This preserves the information architecture of the current web app — users already understand the dashboard-centric model — while adding native iOS transitions (stack pushes, modals, bottom sheets) for a first-class mobile feel.

No tab bar. The app's structure doesn't justify persistent bottom tabs — there is one primary screen (dashboard) and everything else is a transient flow launched from it.

**Design reference:** The web app at `Apps/exercise_tracker_app/` is the canonical reference for all navigation flows, screen layouts, and UX patterns. The iOS app should mirror the web app's screen organization, user flows, and interaction patterns — adapting only where iOS-native conventions demand it (e.g., swipe-back gestures, modal presentation styles, bottom sheets instead of dropdown menus). When in doubt about how a screen should be structured or how a flow should behave, defer to the web app's existing implementation.

#### Sub-decisions

**6a. Navigation Library: Expo Router (file-based)**

Use Expo Router for all navigation. Screens are defined by file/folder structure inside an `app/` directory — routes are automatic based on filenames. Expo Router is built on top of React Navigation but automates navigator setup, reducing boilerplate.

Chosen over raw React Navigation because:
- IronLift's navigation is simple (one hub, a few spokes) — the flexibility advantages of programmatic React Navigation aren't needed
- Deep linking comes free, which is required for the password reset flow (Decision 5c — `ironlift://reset-password`)
- Consistent with the rest of the Expo toolchain (Expo Go, EAS builds)
- Less code to write and maintain

**6b. Spoke Presentation Styles: Mixed by flow type**

Each spoke uses the presentation style that matches its purpose and duration:

| Flow | Presentation | Rationale |
|------|-------------|-----------|
| **Create / Edit Template** | Modal (slides up from bottom) | Short focused task — user saves or cancels, then returns to dashboard. Modal signals "temporary focused context." |
| **Active Workout** | Stack push (slides from right) | Long-lived session (30-60+ min). Stack push avoids accidental dismissal from swipe-down (modal risk). Swipe-back gesture disabled during active workout to prevent accidental exits — user must explicitly finish or cancel. |
| **Settings menu** | Bottom sheet (slides up from bottom) | Quick menu to pick a destination (My Exercises, Exercise History). Dismisses on tap outside or swipe down. Not a full screen — overlays the dashboard. |
| **My Exercises** | Stack push (from settings) | Browsing and managing a list of user-created exercises. Standard drill-down pattern. |
| **Exercise History** | Stack push (from settings) | Browsing a list of past workouts. Standard drill-down pattern. |
| **Exercise Detail** | Stack push (from history) | Drill-down from history list into a specific exercise's details. Natural stack depth: Dashboard → Settings → History → Detail. |

**6c. Screen Map (Expo Router file structure)**

```
app/
├── _layout.tsx              ← Root stack navigator
├── index.tsx                ← Dashboard (home screen)
├── workout.tsx              ← Active Workout (stack push)
├── template-editor.tsx      ← Create/Edit Template (modal)
└── settings/
    ├── exercises.tsx         ← My Exercises (stack push)
    ├── history.tsx           ← Exercise History (stack push)
    └── [exerciseId].tsx      ← Exercise Detail (stack push)
```

The `_layout.tsx` at the root defines the stack navigator and configures which screens present as modals vs standard stack pushes. The `settings/` folder groups settings-related screens but does not create a separate navigator — they are part of the same root stack.

**Implications:**

- Dashboard is the only persistent screen — all other screens are transient
- Expo Router's file-based routing means adding a new screen = adding a new file
- Deep linking URLs map directly to file paths (e.g., `/workout`, `/settings/history`)
- Password reset deep link (`ironlift://reset-password`) is handled by Expo Router's linking configuration
- Bottom sheet for settings requires a third-party library (e.g., `@gorhom/bottom-sheet`) — not a navigation screen, it's a UI component on the dashboard
- Modal and stack presentation types are configured in `_layout.tsx` per screen
- No tab bar means no persistent navigation state to manage across tabs

---

### 7. UI / Design System

**Intent:** The web app has a CSS-based design system (custom properties, dark mode, 8pt grid). iOS requires a different rendering approach. This decision determines whether to port the existing visual identity to native components, adopt a native component library, or build a cross-platform design system.

**Options Considered:**

- **Hand-rolled StyleSheet system (port tokens manually)** — Recreate design tokens as a TypeScript theme object. Build all components from scratch using `StyleSheet.create()` and React Native primitives. Full control, no dependency, lightest bundle. Every component built from scratch.
- **NativeWind (Tailwind CSS for React Native)** — Tailwind-style utility classes compiled to native styles. Rapid styling but adds build-time dependency and debugging is less transparent.
- **Component library (Tamagui, RN Paper, gluestack-ui)** — Pre-built themed components. Fast to ship but customization fights your design, bundle overhead, library lock-in.
- **Hand-rolled StyleSheet + targeted libraries for complex components** — Custom theme object and `StyleSheet.create()` for all standard components. Specialized libraries only for genuinely complex gesture/physics-driven components (bottom sheets, spring animations).

**Decision:** Hand-rolled StyleSheet + targeted libraries (Option D)

Hand-roll all standard components (buttons, inputs, cards, modals, lists, accordions) using `StyleSheet.create()` with a centralized TypeScript theme object. Use targeted libraries only for components where the complexity is genuinely in physics/gesture math — not tedium. AI handles the tedious-but-straightforward component work; libraries handle the complex-and-error-prone gesture work.

**Design reference:** The web app at `Apps/exercise_tracker_app/` is the canonical visual reference for all styling and UI design decisions. Every iOS component should mirror the web app's visual identity — colors, spacing, typography scale, border radii, shadows, component proportions, and layout patterns. The web app's CSS custom properties and stylesheets are the source of truth for design tokens (translated into the native theme object). When building any screen or component, the web app's existing implementation should be consulted first and matched as closely as the native platform allows.

Key rationale:
- AI neutralizes the main downside of hand-rolling (tedium of building every component)
- Full control over IronLift's dark visual identity without fighting a library's opinions
- Maximum debuggability — every style is a plain JS object
- `react-native-reanimated` and `react-native-gesture-handler` are already in Expo Go (zero added deps)
- `@gorhom/bottom-sheet` already committed in Decision 6 for the settings menu
- No UI library lock-in, lightest possible bundle
- Web app serves as a pixel-accurate reference — reduces design ambiguity to zero

#### Sub-decisions

**7a. Theme Architecture: React Context provider (Option 2)**

Theme object wrapped in a `ThemeProvider` context. Components access tokens via a `useTheme()` hook. This is ~30 lines of boilerplate (context, provider, hook) that AI generates trivially. Enables runtime theme switching if ever needed. Chosen over plain constants because the added complexity is negligible (standard React pattern) and it avoids a refactor if light mode is added later.

**7b. Dark Mode Strategy: Semantic tokens, dark-only at launch (Option 2)**

Dark-only at launch (matches web app), but tokens use semantic names (`surface`, `textPrimary`, `border`) rather than literal color names. A future light theme is a single file addition — define a `lightTheme` object with the same keys and different values, swap in the provider. Zero extra effort now, meaningful payoff later.

**7c. iOS Typography: System font — SF Pro (Option 1)**

Use React Native's default system font (SF Pro on iOS). The web app already uses `system-ui` / `-apple-system` which resolves to SF Pro on iPhone — so the iOS native app looks identical to the web app on iOS. Zero config, no font loading, no bundle size impact. Monospace (`SF Mono`) is also available as the system monospace, matching the web's `ui-monospace` / `SFMono-Regular` stack.

**7d. Targeted Libraries: Minimal set + chart library (Option 2)**

- `@gorhom/bottom-sheet` — already committed in Decision 6 for settings menu
- `react-native-reanimated` + `react-native-gesture-handler` — already included in Expo Go, used for gesture/animation primitives
- **Chart library** — Chart.js (web canvas) does not work in React Native. A native chart library is needed since charts are a core feature. Library choice is a sub-decision (see 7d-i below).

**7d-i. Chart Library: `react-native-gifted-charts` (Option A)**

Options considered:
- **`react-native-gifted-charts`** — Most popular RN chart library. Declarative API, built on `react-native-svg` + `react-native-reanimated` (both already in Expo Go). Supports line, bar, pie, area charts. Active maintenance, large community. Works in Expo Go out of the box.
- **`victory-native`** — Mature (Formidable Labs), composable API, strong theming. v37+ requires `react-native-skia` (custom dev client only, not Expo Go compatible). Staying on v36 (svg-based) works but won't receive new features.
- **`react-native-chart-kit`** — Simplest API but less maintained, limited customization for tooltips and axis control.
- **Custom charts with `react-native-svg` directly** — Total control, zero dependency, but more initial code for path calculation, axis ticks, scaling.

Decision: `react-native-gifted-charts`. Maps nearly 1:1 to the current Chart.js configuration — every property in use today (`fill`, `tension`, `pointRadius`, `borderColor`, grid colors, tooltip styling) has a direct equivalent prop. Built on `react-native-svg` + `react-native-reanimated` which are already in Expo Go. Supports smooth entry animations, horizontal scrolling for large datasets, and animated transitions when data changes (useful for future filtering features like date range or last X sessions). Filtering is handled at the data layer (array `.filter()` / `.slice()` before passing to the chart) — the library handles rendering transitions.

Requires adding: `react-native-gifted-charts`, `react-native-svg` (already in Expo Go), `react-native-linear-gradient` (or `expo-linear-gradient` for gradient fills).

**Implications:**

- All UI components are owned code — no third-party component library to update or migrate
- Theme accessed via `useTheme()` hook throughout the app — consistent pattern
- Semantic token names (`surface`, `textPrimary`) make styles self-documenting
- Dark-only at launch, but light mode is a single-file addition if ever needed
- System font means zero font-loading complexity and native iOS feel
- Targeted libraries: `@gorhom/bottom-sheet`, Expo Go built-ins (`reanimated`, `gesture-handler`), `react-native-gifted-charts` + `react-native-linear-gradient`
- Component building is the bulk of the UI work, but AI handles this efficiently
- The web app (`Apps/exercise_tracker_app/`) is the visual source of truth — consult its CSS and components when building any iOS screen
- Chart rendering code in `charts.ts` service will be rewritten — CRUD operations (getUserCharts, createChart, deleteChart, reorderCharts) port as-is, but `renderChart`/`destroyChart` (Chart.js-specific) are replaced by the `<LineChart>` component declaratively

---

### 8. Push Notifications

**Intent:** Push notifications unlock capabilities the web app cannot offer — rest timer alerts when the app is backgrounded, workout reminders, streak nudges. This decision covers the notification infrastructure, what triggers notifications, and how they interact with the backend.

**Options Considered:**

- **Local notifications only** — All notifications scheduled and triggered on-device via `expo-notifications`. No server involvement. Zero backend changes. Works in Expo Go.
- **Local + remote push via Supabase Edge Functions** — Local for on-device triggers, Edge Functions for server-triggered notifications (e.g., inactivity nudges from DB data). Requires APNs setup and revisiting Decision 4.
- **Local + third-party push service (Expo Push, OneSignal)** — Managed push service for remote notifications. Lower infra than raw APNs but adds third-party dependency.
- **No notifications (defer entirely)** — Ship v1 without notifications. Simplest but rest timer loses audibility when backgrounded.

**Decision:** Local notifications only (Option A)

All notifications are scheduled and triggered on-device using `expo-notifications`. No server involvement — fully aligned with Decision 4 (direct Supabase, no Edge Functions). Works in Expo Go out of the box.

#### Sub-decisions

**8a. Notification Use Cases: Rest timer alerts only**

The only notification in v1 is the rest timer expiry alert — notifying the user when their rest period ends while the app is backgrounded. No scheduled training reminders, no streak nudges, no inactivity nudges. These can be added later as additional local notification triggers without architectural changes.

**8b. Permission Prompt Timing: On first app launch (eager)**

Request notification permission immediately on first launch. Simple and predictable. The app's single notification use case (rest timer) is core enough to the workout experience that upfront permission is justified.

**8c. Rest Timer Background Behavior: Schedule notification at timer start**

When the user starts a rest timer, immediately schedule a local notification for X seconds later. If the user stays in the app and the timer completes in the foreground, the notification is cancelled before it fires. Cancellation logic for other cases (user ends rest early, skips rest, finishes workout) will be detailed during implementation — the general principle is that any action that invalidates the rest timer also cancels its scheduled notification.

**Implications:**

- Zero backend changes — no Edge Functions, no APNs keys, no device token storage
- `expo-notifications` is the only dependency — included in Expo Go, no custom dev client needed
- Notification permission requested once on first launch — no conditional permission flows
- Rest timer is the sole notification trigger — simple to implement and test
- Cancellation edge cases (early rest end, workout finish, app force-quit) are implementation details, not architectural decisions
- Reminders and streak nudges can be added later as additional local notification schedules without rearchitecting

---

### 9. Distribution & CI/CD

**Intent:** Shipping to iOS requires code signing, provisioning profiles, App Store review, and a release pipeline. This decision covers how builds are created, how beta testing is managed (TestFlight), whether over-the-air updates are used, and how the release cadence works.

**Options Considered:**

- **EAS Build + EAS Submit (fully managed by Expo)** — Expo's cloud handles building `.ipa`, code signing, provisioning profiles, and uploading to App Store Connect. CLI-driven from Windows. OTA updates via `expo-updates`.
- **EAS Build + manual App Store submission** — EAS builds the `.ipa`, but download and submit to App Store Connect manually via Transporter or web. More control over submission.
- **Local Xcode builds + manual submission** — Build locally on Mac, manage signing manually, submit via Xcode. Full control but requires Mac (conflicts with Phase 1 setup).
- **GitHub Actions CI/CD + EAS Build** — Automated pipeline triggered on push. Best for teams or frequent releases, more setup overhead for a solo project.

**Decision:** EAS Build + EAS Submit (fully managed by Expo)

EAS handles the entire pipeline from source to App Store Connect. Builds are triggered via CLI (`eas build`, `eas submit`) from Windows — no Mac required for Phase 1. Code signing and provisioning profiles are managed automatically by EAS. Apple Developer Program membership ($99/year) is required. In Phase 2, when a Mac is available, local Xcode builds become an option for faster Custom Dev Client iteration — EAS remains available for production releases.

#### Sub-decisions

**9a. OTA Updates: Yes, check on app launch**

Use `expo-updates` to push JS-only changes without App Store review. The app checks for updates each time it opens — if an update is available, it downloads and applies before the app renders. This ensures the user always runs the latest JS code. Native changes (new native modules, permission changes, icon/splash updates) still require a full EAS build + App Store review.

**9b. Release Workflow: TestFlight first, then production**

Every release goes through TestFlight before the App Store. EAS builds a TestFlight-targeted build, uploads to App Store Connect, and the build is available for beta testing on the developer's device via the TestFlight app. After testing, the same build is promoted to production via App Store Connect. This adds a step but catches issues before public release.

**9c. Versioning: Semver (major.minor.patch)**

Standard semantic versioning (1.0.0, 1.1.0, 1.2.0). Major for breaking changes, minor for features, patch for fixes. App Store requires this format. `app.json` holds the version string; EAS auto-increments the iOS build number (`buildNumber`) on each build.

**Implications:**

- No Mac needed for Phase 1 builds or submissions — entire pipeline runs from Windows CLI
- Apple Developer Program membership ($99/year) required before first build
- Free EAS tier: 30 builds/month, ~15-20 min build time — sufficient for Phase 1 (Expo Go handles daily dev, EAS only for TestFlight/release)
- Phase 2 pressure: Custom Dev Client builds are more frequent — may need paid EAS tier ($99/month) or local Mac builds
- OTA updates cover most iteration (bug fixes, UI tweaks) without App Store review — only native changes require full builds
- Must understand the JS-only vs native change boundary to avoid pushing incompatible OTA updates
- TestFlight adds a safety net — test on real device via TestFlight before promoting to production
- Semver in `app.json`, build number auto-incremented by EAS — no manual build number management

---

### 10. Testing Strategy

**Intent:** Mobile introduces new testing concerns — device-specific behavior, simulator vs real device differences, crash reporting, performance profiling, and App Store review compliance. This decision defines the testing approach across unit, integration, E2E, and device testing for the iOS app.

**Options Considered:**

- **Manual testing only** — Test on physical device via Expo Go and TestFlight. No automated tests. Fastest to ship, but fragile as app grows.
- **Unit tests only (Jest)** — Test services, hooks, and utility functions with Jest (included in Expo). No UI testing. Covers business logic with minimal setup. Manual testing handles UI.
- **Unit + Component tests (Jest + React Native Testing Library)** — Unit tests for logic + component render/interaction tests. No E2E. Covers business logic and UI behavior without device/simulator dependencies.
- **Full test pyramid (Jest + RNTL + E2E via Maestro or Detox)** — Unit → Component → E2E. Most comprehensive but highest setup cost — Detox requires Mac with Xcode, Maestro needs simulator or device.

**Decision:** Unit tests only (Jest), written during build. Manual testing for UI.

Unit tests for logic-heavy, high-risk code using Jest (bundled with Expo). Tests are written alongside feature code during development, not retrofitted after. All UI and interaction testing is done manually on a physical iPhone via Expo Go. Supabase query correctness is verified manually on-device.

#### Sub-decisions

**10a. What to Test: Prioritized by risk (Option B)**

Focus test effort on logic-heavy code where bugs are most likely and hardest to catch manually:

| Priority | Area | Rationale |
|----------|------|-----------|
| **High** | Write queue & sync logic | Stateful, async, network-dependent — hard to simulate edge cases manually (duplicate syncs, partial failures, ordering) |
| **High** | Cache layer (read/write/invalidation) | Stale data bugs are subtle and only surface in specific offline→online sequences |
| **High** | Chart computation | Pure functions with math — easy to test, high value since incorrect calculations are hard to spot visually |
| **Medium** | Timer logic | Scheduling + state transitions — Jest's `useFakeTimers()` makes this straightforward |
| **Medium** | Workout state management | Hook logic operating on local state + AsyncStorage |
| **Skip** | Thin CRUD services (fetch exercises, fetch templates) | Essentially Supabase pass-throughs — RLS validates authorization, manual testing catches query errors |

**10b. Test Runner Setup: Community mock for AsyncStorage + manual Supabase mocks (Option B)**

- **AsyncStorage:** Use the official mock package (`@react-native-async-storage/async-storage/jest/async-storage-mock`). Provides a working in-memory store out of the box — no reason to rewrite it.
- **Supabase client:** Manual Jest mocks. Mock the chainable query builder API (`.from().select().eq()`) to return controlled `{ data, error }` responses per test. No community mock package exists for app-specific query shapes.
- **Supabase query correctness:** Not tested in Jest. Verified manually on-device during development — wrong column names, missing filters, and RLS issues surface immediately in Expo Go.

**10c. Coverage Expectations: No formal threshold (Option A)**

No percentage target. Coverage is judged qualitatively — "did I test the important logic in the prioritized areas?" Low-value tests for thin CRUD wrappers are not written just to hit a number.

**10d. When Tests Run: Locally on-demand only (Option A)**

Tests run via `npm test` when the developer chooses. No pre-commit hooks, no pre-build gates, no CI enforcement. Keeps the development loop fast and friction-free for a solo project.

**Implications:**

- Jest is the only test dependency — bundled with Expo, zero additional setup
- Tests are written during feature development, not retrofitted — keeps code testable by design
- High-risk logic (sync, cache, charts) is protected by automated tests; UI and Supabase queries are verified manually
- No CI pipeline or automation overhead — appropriate for a solo developer
- If test discipline lapses, no automated safety net catches it — relies on developer habit
- Tests can be promoted to pre-commit hooks or CI gates later without rearchitecting
- Component tests (React Native Testing Library) and E2E (Maestro/Detox) remain available as future additions if the app grows in complexity

---

## Decision Log

| Date | Dimension | Decision Summary |
|------|-----------|-----------------|
| 2026-02-08 | 1. Framework / Technology | Expo (React Native), Expo Go workflow, iOS 16 min, New Architecture (required by Expo Go since SDK 52), keep pnpm, dev on Windows + physical iPhone |
| 2026-02-09 | 2. Code Sharing Strategy | Copy and diverge — new standalone project at `ironlift/`, abandon web app, copy types/SQL as-is, services adapted later, hooks TBD, organized `src/` with internal layers (no monorepo) |
| 2026-02-09 | 3. Offline-First & Data Sync | Read cache + offline workout logging — cache exercises/templates/history locally, write queue for offline workouts, sync on connectivity return, template editing requires online |
| 2026-02-09 | 4. Backend Architecture | Direct Supabase with RLS only — no API layer, no Edge Functions, services port as-is, Edge Functions available as incremental escape hatch if server-side needs arise |
| 2026-02-09 | 5. Auth on Mobile | Email/Password only (mirror web), tokens via `expo-sqlite/localStorage` adapter (Supabase-recommended), persistent session until explicit logout, password reset via system browser + deep link return to native "Set New Password" screen |
| 2026-02-10 | 6. Navigation & UX Paradigm | Hub-and-Spoke (dashboard-centric), Expo Router (file-based), mixed presentation: modals for template editor, stack push for workout (long session), bottom sheet for settings menu, stack push for settings sub-screens (My Exercises, History, Detail) |
| 2026-02-10 | 7. UI / Design System | Hand-rolled StyleSheet + targeted libraries. ThemeProvider context with `useTheme()` hook, semantic tokens (dark-only at launch, light-mode ready), system font (SF Pro), targeted libs: `@gorhom/bottom-sheet`, `react-native-gifted-charts` for charting, Expo Go built-ins for animation/gestures |
| 2026-02-10 | 8. Push Notifications | Local notifications only via `expo-notifications`. Rest timer alert is the sole use case. Permission requested on first launch. Notification scheduled at timer start, cancelled when invalidated. No server involvement, no APNs setup. |
| 2026-02-10 | 9. Distribution & CI/CD | EAS Build + EAS Submit (fully managed). OTA updates via `expo-updates` checked on app launch. TestFlight first, then production. Semver versioning with auto-incremented build numbers. No Mac needed for Phase 1. |
| 2026-02-10 | 10. Testing Strategy | Unit tests only (Jest), written during build. Prioritized by risk: sync/cache, chart computation, timer, workout state. Official AsyncStorage mock + manual Supabase mocks. No coverage threshold. Tests run locally on-demand only. Manual testing for UI and Supabase queries. |

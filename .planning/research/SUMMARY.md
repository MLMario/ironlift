# Project Research Summary

**Project:** IronLift iOS
**Domain:** Offline-capable iOS exercise tracker (Expo React Native + Supabase)
**Researched:** 2026-02-11
**Confidence:** MEDIUM-HIGH

## Executive Summary

IronLift is a native iOS workout tracker built with Expo SDK 54 (React Native 0.81, React 19.1) backed by Supabase PostgreSQL with Row Level Security. It is a direct port of an existing Preact web app, which means the data model, service interfaces, and many hooks transfer with minimal adaptation. The dominant architectural challenge is not building the features themselves -- the web app proves the design works -- but layering offline capability onto a direct-Supabase client that was originally online-only. The recommended approach is to build the four-layer architecture (Presentation > Hooks > Services > Data Access) with the offline infrastructure (CacheManager, WriteQueue, SyncManager) as a core foundation, not an afterthought. Services remain thin Supabase wrappers (ported from web), while hooks add the cache-aware, offline-capable behavior on top.

The stack is stable and well-understood with two notable corrections to the project constitution: (1) the New Architecture should be accepted, not avoided -- Expo Go already runs it, SDK 55 mandates it, and Reanimated v4 requires it; (2) auth token storage should use `expo-sqlite/localStorage` instead of direct `expo-secure-store`, because Supabase sessions can exceed SecureStore's 2048-byte limit. Feature research reveals three table-stakes gaps that must be added to v1: inline previous workout values during logging, workout duration tracking, and personal record detection. These are LOW-to-MEDIUM complexity and HIGH user value -- every competitor (Strong, Hevy, JEFIT, FitNotes) ships them.

The top risks are: (1) AsyncStorage race conditions corrupting workout/cache data when concurrent writes overlap -- mitigated by a write coordinator built into the foundation; (2) duplicate workouts from write queue sync failures -- mitigated by UUID idempotency keys with a database UNIQUE constraint; (3) active workout state lost on iOS process termination -- mitigated by persisting to AsyncStorage on every state change, not just on background. The `@gorhom/bottom-sheet` library has reported SDK 54 compatibility issues and should be tested in the first phase that uses it, with a hand-rolled fallback plan ready.

## Key Findings

### Recommended Stack

The stack is Expo SDK 54 with React Native 0.81 and TypeScript ~5.7. All Expo packages should be installed via `npx expo install` to ensure SDK-compatible versions. The Supabase client uses `expo-sqlite/localStorage` as its storage adapter (not `expo-secure-store` directly). Reanimated v4 is the default and requires New Architecture, which is the correct path. `react-native-worklets` must be installed explicitly alongside Reanimated v4. See `STACK.md` for the full version compatibility matrix and installation commands.

**Core technologies:**
- **Expo SDK 54** (~54.0.33): App framework and build system -- latest stable, includes RN 0.81 and React 19.1
- **Expo Router v4**: File-based navigation -- handles hub-and-spoke pattern, modal/stack presentation, deep links
- **Supabase JS v2** (~2.49.x): Direct database client with RLS -- no API layer, auth with `expo-sqlite/localStorage` adapter
- **AsyncStorage** (~2.2.x): Local cache, write queue, workout backup -- the offline backbone
- **react-native-reanimated v4** (~4.1.x): Animations -- requires New Architecture (Expo Go default)
- **@gorhom/bottom-sheet v5** (~5.2.x): Settings bottom sheet -- LOW confidence on SDK 54 compatibility, test early
- **react-native-gifted-charts** (~1.4.x): Line/bar charts -- works in Expo Go, SVG-based

**Critical version notes:**
- `expo-router`: MUST install via `npx expo install expo-router` (npm may pull v6.x for SDK 55 beta)
- `react-native-worklets`: MUST install explicitly even though Reanimated v4 depends on it internally
- Do NOT add `react-native-reanimated/plugin` to babel.config.js -- SDK 54's `babel-preset-expo` handles it

### Expected Features

**Must have (table stakes):**
- Set logging with weight/reps/done -- the core product
- Workout templates with full CRUD -- routine management
- Rest timer with background local notification -- universal in competitors
- Exercise library (~1000 system) + custom exercise CRUD -- foundation for all features
- Progress charts (total sets, max volume, date/session x-axis) -- the motivational hook
- Workout history with paginated timeline and drill-down detail -- proof of saved data
- Offline workout logging with write queue sync -- gym reliability
- **Previous workout values shown inline during logging** -- GAP, must add to v1 (every competitor has this)
- **Workout duration tracking** (add `finished_at` to workout_logs) -- GAP, must add to v1 (LOW complexity)
- **Personal record detection** (auto-detect new bests on workout save) -- GAP, must add to v1 (table stakes in 2026)

**Should have (differentiators):**
- True offline-first with cached reads -- stronger than Hevy, matches Strong
- Template change detection on workout finish -- unique feature, no competitor does this well
- Hub-and-spoke navigation without tab bar -- opinionated simplicity

**Defer (v1.x):**
- Supersets/exercise grouping -- common but not blocking for MVP
- 1RM estimation -- pure calculation, low effort
- Workout notes, set type labels, RPE/RIR -- enrichments
- CSV data export -- data portability

**Defer (v2+, requires custom dev client):**
- Apple Health integration -- HealthKit needs custom dev client
- Apple Watch companion -- requires watchOS development
- Biometric unlock, Apple Sign-In -- require native modules

### Architecture Approach

The architecture is a strict four-layer system: Presentation (Expo Router screens) > Hooks (state + cache awareness) > Services (thin Supabase wrappers ported from web) > Data Access (CacheManager, WriteQueue, SyncManager wrapping AsyncStorage and Supabase). Screens contain zero business logic. Services contain zero offline logic. The offline capability lives entirely in the hooks and data access layers, which means services port directly from the web app with only import path changes. The active workout is managed as an in-memory discriminated union state machine with continuous AsyncStorage backup for crash recovery.

**Major components:**
1. **CacheManager** (src/lib/cache.ts) -- typed cache-aside reads with staleness tracking, 5-minute threshold
2. **WriteQueue** (src/lib/writeQueue.ts) -- UUID-keyed offline write entries, FIFO processing, retry with backoff
3. **SyncManager** (src/lib/sync.ts) -- two-phase sync: flush write queue (sequential), then refresh caches (parallel). Triggered on foreground via AppState
4. **useWorkout** (src/hooks/useWorkout.ts) -- active workout state machine with discriminated union (`idle | active | finishing | error`), continuous AsyncStorage backup
5. **AuthProvider** (app/_layout.tsx) -- single top-level auth listener with proper cleanup, session lifecycle management

### Critical Pitfalls

1. **SecureStore 2048-byte limit breaks auth** (P1) -- Use `expo-sqlite/localStorage` as Supabase storage adapter from day one. Do not use raw `expo-secure-store` for session storage.
2. **AsyncStorage race conditions corrupt data** (P2) -- Build a write coordinator (async mutex per key namespace) into the foundation before any concurrent writes. Use `multiSet`/`multiGet` for related keys.
3. **Write queue creates duplicate workouts** (P3) -- Generate UUID idempotency keys client-side when enqueuing. Add `UNIQUE` constraint on idempotency column in `workout_logs`. Mark entries as "syncing" before request.
4. **Active workout lost on iOS process kill** (P5) -- Persist workout state to AsyncStorage on EVERY state change (every set, every weight entry). Check for in-progress workout on app launch and offer resume.
5. **RLS policies missing or misconfigured** (P4) -- Enable RLS on every table immediately. Verify SELECT/INSERT/UPDATE/DELETE policies filter by `auth.uid() = user_id`. Test with multiple accounts.

## Implications for Roadmap

Based on dependency analysis, architecture layering, and pitfall ordering, here is the suggested phase structure:

### Phase 1: Project Foundation and Auth
**Rationale:** Everything depends on the Supabase client, auth flow, and theme system. Windows-to-iPhone dev environment must be validated first. The auth storage decision (expo-sqlite/localStorage) must be made before any code is written.
**Delivers:** Working Expo project connected to Supabase, authenticated user, root layout with AuthProvider and ThemeProvider, empty dashboard shell.
**Addresses:** Authentication (email/password, persistent session, password reset deep link)
**Avoids:** P1 (SecureStore limit), P7 (auth listener leaks), P11 (Windows firewall), P12 (detectSessionInUrl), P13 (email verification), P15 (Expo Go SDK mismatch)
**Stack setup:** Expo SDK 54, all dependencies installed, Expo Go validated on physical iPhone

### Phase 2: Data Layer Foundation
**Rationale:** The cache, write queue, and sync infrastructure must exist before any feature screen is built. Building these as isolated, tested modules prevents the offline architecture from being bolted on later.
**Delivers:** CacheManager, WriteQueue (with idempotency keys), SyncManager, connectivity hook, write coordinator for AsyncStorage. All with Jest tests.
**Addresses:** Offline cache layer, write queue, sync orchestration
**Avoids:** P2 (AsyncStorage races), P3 (duplicate workouts)
**Implements:** Data Access Layer from architecture (cache.ts, writeQueue.ts, sync.ts, connectivity.ts)

### Phase 3: Exercise Library and Templates
**Rationale:** Exercises and templates are prerequisites for the active workout. The services port directly from web. Hooks add cache awareness on top.
**Delivers:** Exercise library browsing, custom exercise CRUD, template CRUD (create/edit/delete with ordered exercises and default sets), template cards on dashboard.
**Addresses:** Exercise library, custom exercises, templates, template editor (modal presentation)
**Uses:** CacheManager from Phase 2, exercises + templates services ported from web

### Phase 4: Active Workout
**Rationale:** The core product. Depends on templates (Phase 3) and write queue (Phase 2). This is the most state-heavy phase and the most critical for user retention.
**Delivers:** Full workout flow: pick template, log sets (weight/reps/done), rest timer with background notification, add/remove exercises mid-workout, crash recovery via continuous backup, workout save (online or offline via write queue), template change detection on finish.
**Addresses:** Set logging, rest timer, workout save, template change detection, previous workout values inline, workout duration tracking
**Avoids:** P5 (state loss on process kill), P16 (notification permission denial)
**Implements:** useWorkout state machine, useRestTimer, useWorkoutBackup

### Phase 5: History, Charts, and PR Detection
**Rationale:** Charts and history require logged workouts (Phase 4). PR detection requires historical data. These features close the feedback loop that makes the app motivating.
**Delivers:** Workout history list with pagination, workout detail drill-down, per-exercise progress charts (gifted-charts), personal record detection on workout save, exercise detail screen with history + chart.
**Addresses:** Workout history, progress charts, PR detection (gap), exercise detail
**Avoids:** P10 (chart performance -- limit data points, defer rendering)
**Uses:** react-native-gifted-charts, logging service, charts service

### Phase 6: Settings, Polish, and Production Build
**Rationale:** Settings screens are low-risk and independent. EAS Build setup and OTA configuration are production prerequisites that should not be deferred.
**Delivers:** Settings bottom sheet on dashboard, My Exercises management, history access from settings, logout, EAS Build configuration, first TestFlight build, OTA update configuration.
**Addresses:** Settings screens, bottom sheet navigation, EAS Build, expo-updates
**Avoids:** P6 (bottom sheet navigation glitches), P8 (OTA native-incompatible changes), P14 (Developer Mode), P9 (Reanimated version mismatch)

### Phase Ordering Rationale

- **Phase 1 before everything:** Auth gates all data. The dev environment must work. Constitutional corrections (New Architecture, auth storage) are decided here.
- **Phase 2 before features:** The offline infrastructure is foundational. Every feature hook depends on CacheManager. The write queue must be designed with idempotency from the start, not retrofitted.
- **Phase 3 before Phase 4:** Active workout requires exercises and templates to be browsable and selectable. Templates define the workout structure.
- **Phase 4 is the core:** This is where the product lives or dies. It depends on Phases 1-3 but nothing after it depends on Phase 4 being complete before Phase 5 begins (history can show mock data during parallel development if needed).
- **Phase 5 after Phase 4:** Charts and history are empty without logged workouts. PR detection needs historical data. These close the value loop.
- **Phase 6 last:** Settings are low-risk. EAS Build can happen anytime but is most useful after the core product works. Bottom sheet SDK 54 issues make it sensible to push this later (more time for community fixes).

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Data Layer):** The AsyncStorage write coordinator pattern needs implementation research. No standard library exists -- must be hand-rolled with async mutex/queue. Also: UUID generation in React Native (crypto.randomUUID vs uuid package vs expo-crypto) needs verification.
- **Phase 4 (Active Workout):** The most complex state management in the app. The web app's useWorkoutBackup and useTimerState transfer, but the iOS notification scheduling (expo-notifications local) and background behavior need phase-specific research.
- **Phase 5 (Charts):** react-native-gifted-charts API for line/bar charts needs research. The web app used Chart.js -- the component API is completely different. Data point limiting and performance profiling needed.
- **Phase 6 (Bottom Sheet):** @gorhom/bottom-sheet v5 has LOW confidence on SDK 54. May need to evaluate alternatives or build a simpler custom solution.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation + Auth):** Well-documented Expo project setup, Supabase client init, and auth flow. Official tutorials cover this exactly.
- **Phase 3 (Exercises + Templates):** Services port from web. Cache-aside pattern is standard. Template editor modal is standard Expo Router.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Core versions verified via official changelogs. @gorhom/bottom-sheet SDK 54 compat is LOW. gifted-charts Expo Go compat is MEDIUM. |
| Features | HIGH | Competitor analysis thorough (Strong, Hevy, JEFIT, FitNotes). Gaps identified with clear priority. Web app provides exact feature reference. |
| Architecture | HIGH | Four-layer pattern is standard. Cache-aside, write queue, sync manager are well-established patterns. Web app code confirms service interfaces. |
| Pitfalls | HIGH | 16 pitfalls identified with official sources. Top 5 critical pitfalls have HIGH confidence with documented prevention strategies. |

**Overall confidence:** MEDIUM-HIGH

The MEDIUM-HIGH (not HIGH) overall rating is due to two specific unknowns: (1) @gorhom/bottom-sheet compatibility with SDK 54 / Reanimated v4 -- multiple unresolved GitHub issues, and (2) the constitution specified "classic architecture" which research shows is the wrong path. The New Architecture correction is HIGH confidence but requires explicit acknowledgment from the project owner.

### Gaps to Address

- **@gorhom/bottom-sheet SDK 54 compatibility:** Test immediately in Phase 1 project setup. If broken, prepare a hand-rolled alternative using Reanimated v4 animated views. Decision needed before Phase 6.
- **UUID generation in React Native:** `crypto.randomUUID()` availability in Hermes engine needs verification. Fallback: `expo-crypto` or `uuid` package. Decision needed in Phase 2.
- **New Architecture acceptance:** Constitution says "classic architecture." Research says this is outdated and counterproductive. Needs explicit project decision before Phase 1.
- **Auth storage approach:** Constitution says `expo-secure-store`. Research recommends `expo-sqlite/localStorage`. Needs explicit project decision before Phase 1.
- **@react-native-community/netinfo in Expo Go:** Confirmed included in Expo Go, but not listed in the constitution's approved libraries. Needs to be added to approved list.
- **PR detection scope:** Research flags this as table stakes but it is currently not in the v1 plan. The roadmap includes it in Phase 5 but the schema may need an `idempotency_key` column and potentially a `personal_records` table -- this should be designed in Phase 1's schema review.
- **Chart performance with large datasets:** Theoretical concern -- gifted-charts degrades with 250+ data points. Not testable until Phase 5 with real or synthetic data. Mitigation (data point limiting) should be designed into the chart computation service from the start.

## Sources

### Primary (HIGH confidence)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) -- SDK versions, package versions, New Arch status
- [Expo New Architecture Guide](https://docs.expo.dev/guides/new-architecture/) -- Expo Go only supports New Arch
- [Supabase Expo React Native Tutorial](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native) -- Auth storage, client setup
- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/) -- 2048-byte limit
- [Supabase Row Level Security Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) -- RLS patterns
- [React Native AppState](https://reactnative.dev/docs/appstate) -- Lifecycle events
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/) -- Local notifications in Expo Go
- IronLift web app source code (`Apps/exercise_tracker_app/`) -- Canonical feature/design reference
- IronLift constitution (`docs/constitution.md`) and decisions (`docs/app_develop_decision.md`) -- Binding constraints

### Secondary (MEDIUM confidence)
- [Strong App Store](https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577), [Hevy Features](https://www.hevyapp.com/features/), [JEFIT](https://www.jefit.com), [FitNotes](https://getfitnotes.com/) -- Competitor analysis
- [GoTrueClient Memory Leak #856](https://github.com/supabase/auth-js/issues/856) -- Auth listener cleanup
- [Expo Issue #33754](https://github.com/expo/expo/issues/33754) -- AsyncStorage race conditions
- [@gorhom/bottom-sheet #2471](https://github.com/gorhom/react-native-bottom-sheet/issues/2471) -- SDK 54 TypeError
- [gifted-charts #437](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/437) -- Large data crash

### Tertiary (LOW confidence)
- @gorhom/bottom-sheet full SDK 54 compatibility -- multiple conflicting reports, needs hands-on testing
- `crypto.randomUUID()` availability in Hermes (SDK 54) -- not directly verified, needs runtime test
- Exact chart performance threshold on iOS -- varies by device and data complexity, needs profiling

---
*Research completed: 2026-02-11*
*Ready for roadmap: yes*

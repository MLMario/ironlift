# IronLift

## What This Is

IronLift is a native iOS exercise tracker app built with Expo (React Native) + TypeScript, backed by Supabase (PostgreSQL + Auth + RLS). It's a full port of the abandoned IronFactor web app (`Apps/exercise_tracker_app/`, Preact/TypeScript) to a standalone iOS app. The web app is preserved as the canonical reference for screen layouts, user flows, visual design, and design tokens. Users create workout templates, log workouts against them, track progress via charts, and manage their exercise library — all with offline support for the core workout flow.

## Core Value

The core workout loop — pick a template, log sets with weight/reps, finish and save — must work flawlessly, including fully offline. Everything else (charts, exercise management, history browsing) supports this loop.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Email/password authentication with secure token storage (Keychain)
- [ ] Password reset via deep link (system browser → app)
- [ ] Persistent session until explicit logout
- [ ] Dashboard as central hub showing templates and charts
- [ ] Create, edit, delete workout templates with ordered exercises and default sets
- [ ] Exercise picker with search/filter by category and inline custom exercise creation
- [ ] Active workout tracking: weight/reps inputs, done checkbox, set add/remove
- [ ] Rest timer with visual countdown, +/-10s adjustment, background notification
- [ ] Swipe-to-delete on set rows during workout
- [ ] Template change detection — prompt to update template on workout finish
- [ ] Auto-save active workout locally (restore on app relaunch)
- [ ] Offline workout logging with write queue and sync on reconnect
- [ ] Cache exercise library, user exercises, templates, and workout history locally
- [ ] Custom exercise management (create, edit, delete)
- [ ] Workout history with paginated timeline and summary stats
- [ ] Workout detail view (drill into a specific past workout)
- [ ] Custom exercise progress charts (total sets, max volume, by date or session)
- [ ] Chart CRUD (add, delete, reorder)
- [ ] Settings bottom sheet with navigation to My Exercises, History, Logout
- [ ] Hub-and-spoke navigation — dashboard is sole persistent screen
- [ ] Dark mode only with semantic theme tokens matching web app design
- [ ] Hand-rolled UI components with StyleSheet.create()

### Out of Scope

- Light mode — token structure supports it, but dark-only at launch
- Tab bar navigation — hub-and-spoke only
- Social/sharing features — single-user personal app
- Biometric unlock (Face ID/Touch ID) — can layer on later
- Apple Sign-In — not required when only email/password is offered
- Server-side push notifications — local only for rest timer
- Pull-to-refresh / polling — sync on foreground and after writes only
- Custom fonts — system font (SF Pro) only
- New Architecture (Fabric/TurboModules) — classic architecture for stability
- API layer / Edge Functions — direct Supabase with RLS
- Onboarding screens — straight to login

## Context

**Port context:** This is a port of the IronFactor web app. The web app's CSS custom properties are the source of truth for design tokens. Screen layouts, user flows, and interaction patterns should mirror the web app, adapted for native iOS conventions (stack pushes, modals, bottom sheets, swipe gestures).

**Brand:** Rebranded from "IronFactor" (web) to "IronLift" (iOS). New brand identity.

**Data model:** 8 tables in Supabase — exercises (system + user), templates (with nested exercises and sets), workout_logs (with nested exercises and sets), user_charts. All accessed via RLS. ~1000 system exercises pre-populated.

**Web app design tokens:**
- Backgrounds: `#0f0f0f` (primary), `#1a1a1a` (surface), `#27272a` (elevated)
- Accent: `#4f9eff` (blue), Success: `#4ade80`, Warning: `#fbbf24`, Danger: `#f87171`
- Text: `#ffffff` (primary), `#a1a1aa` (secondary), `#71717a` (muted)
- Spacing: 4/8/16/24/32/48px scale
- Radius: 4/8/12/9999px
- Container max: 480px, min tap target: 44px

**Key UX patterns from web app:**
- Swipe-to-delete on workout set rows (port from @use-gesture to react-native-gesture-handler)
- Rest timer: inline horizontal bar with countdown, auto-starts on set completion
- Template change detection: snapshot on workout start, compare on finish, prompt to update
- Active workout auto-save to local storage with restore on relaunch
- Settings panel: bottom sheet on iOS (was slide-in panel on web)
- Exercise picker: searchable/filterable modal with inline create form
- Charts: line charts with gradient fill, per-exercise metrics

**Development environment:** Windows PC, Expo Go on physical iPhone over Wi-Fi. No simulator, no Mac for Phase 1. EAS Build for production/TestFlight. pnpm package manager.

## Constraints

- **Expo Go compatibility**: All code must run in Expo Go — no custom native modules, no custom dev client in Phase 1
- **iOS 16 minimum**: ~95% device coverage, no iOS 17+ APIs needed
- **No UI libraries**: Hand-roll all components with StyleSheet.create() — no Tamagui, NativeBase, NativeWind, etc.
- **Approved third-party only**: @gorhom/bottom-sheet, react-native-reanimated (built-in), react-native-gesture-handler (built-in), react-native-gifted-charts, react-native-svg (built-in), expo-linear-gradient
- **Direct Supabase**: No API layer, no Edge Functions, no middleware
- **Classic architecture**: No New Architecture (Fabric/TurboModules)
- **System font only**: SF Pro via React Native defaults — no custom font loading
- **Single standalone project**: No monorepo structure

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Expo (React Native) over Swift/Capacitor | TypeScript reuse, Expo Go dev workflow, EAS cloud builds from Windows | — Pending |
| Copy-and-diverge from web app | Web app abandoned, standalone project simpler than shared package | — Pending |
| AsyncStorage over SQLite for caching | Data volume ~16MB lifetime, JSON key-value sufficient | — Pending |
| Hub-and-spoke over tab bar | Matches web app IA, dashboard-centric model, app doesn't justify tabs | — Pending |
| Hand-rolled UI over component library | AI handles tedium, full control over dark theme, no lock-in | — Pending |
| react-native-gifted-charts over victory-native | Works in Expo Go (no Skia), maps 1:1 to Chart.js config | — Pending |
| Local notifications only | No server involvement, rest timer is sole use case | — Pending |
| Email/password only (no biometrics/Apple) | Mirror web app, simplest path, can layer on later | — Pending |
| Full feature parity for v1 | All web app features in scope — auth, templates, workouts, charts, exercises, history | — Pending |
| IronLift rebrand | New brand identity for iOS app, distinct from abandoned web app | — Pending |

---
*Last updated: 2026-02-11 after initialization*

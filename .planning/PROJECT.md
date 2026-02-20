# IronLift

## What This Is

IronLift is a native iOS exercise tracker app built with Expo (React Native) + TypeScript, backed by Supabase (PostgreSQL + Auth + RLS). It's a full port of the abandoned IronFactor web app to a standalone iOS app with offline-capable workout logging, template management, progress charts, workout history, and custom exercise support. Users create workout templates, log workouts against them, track progress via charts, and manage their exercise library — all with full offline support for the core workout flow.

## Core Value

The core workout loop — pick a template, log sets with weight/reps, finish and save — must work flawlessly, including fully offline. Everything else (charts, exercise management, history browsing) supports this loop.

## Requirements

### Validated

- AUTH-01 through AUTH-08 — v0.1 (email/password auth, session persistence, password reset deep link)
- DASH-01 through DASH-07 — v0.1 (template cards, chart cards, brand header, settings gear)
- EXER-01 through EXER-09 — v0.1 (~1000 system exercises, custom CRUD, picker modal with search/filter)
- TMPL-01 through TMPL-10 — v0.1 (template CRUD, exercise ordering, set configuration, modal editor)
- WORK-01 through WORK-20 — v0.1 (full workout loop, rest timer, swipe-to-delete, offline, crash recovery)
- CHRT-01 through CHRT-07 — v0.1 (chart CRUD, line charts with gradient, client-side computation)
- HIST-01 through HIST-05 — v0.1 (paginated timeline, summary stats, workout detail drill-down)
- SETT-01 through SETT-06 — v0.1 (settings navigation, My Exercises, History, Logout)
- UI-01 through UI-06 — v0.1 (dark mode, theme tokens, hand-rolled UI, system font, 44px tap targets)

### Active

**v0.1.1 — Bug Fixes & Architecture:**

- [ ] Silent save of modified weight/reps to template when exercise is completed during workout (FIX-01)

**v0.2 — Table Stakes Gaps (deferred):**

- [ ] Previous workout values displayed inline during active workout logging (GAP-01)
- [ ] Workout duration tracking with finished_at timestamp and duration display in history (GAP-02)
- [ ] Personal record (PR) detection on workout save (GAP-03)
- [ ] Service layer implementation of templates per user, customer exercise per user, charts per user, exercise per template and set per exercise.
- [ ] Migrate auth email trampoline to Supabase Edge Function — currently a static HTML page on the Vercel web app at /auth-callback that redirects email tokens to the app's deep link scheme (GAP-04)

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
- Supersets / exercise grouping — deferred to future milestone
- 1RM estimation — deferred to future milestone
- Workout notes — deferred to future milestone
- Set type labels (warmup, working, drop, failure) — deferred to future milestone
- CSV data export — deferred to future milestone
- RPE/RIR tracking — deferred to future milestone
- Apple Health / Watch / Biometrics / Apple Sign-In — requires custom dev client

## Context

Shipped v0.1 MVP with 14,849 LOC TypeScript across 238 files.
Tech stack: Expo SDK 54, React Native, TypeScript, Supabase (PostgreSQL + Auth + RLS), AsyncStorage, react-native-gifted-charts, react-native-gesture-handler, react-native-reanimated.

Built in 6 days (2026-02-10 → 2026-02-16) across 10 phases, 42 plans, 78 requirements.

**Port context:** All web app features faithfully ported. Web app CSS custom properties translated to TypeScript theme tokens. Screen layouts and user flows mirror the web app, adapted for native iOS conventions (stack pushes, modals, gestures).

**Brand:** Rebranded from "IronFactor" (web) to "IronLift" (iOS). Split-color brand text (Iron=white, Lift=blue).

**Data model:** 8 tables in Supabase — exercises (system + user), templates (with nested exercises and sets), workout_logs (with nested exercises and sets), user_charts. All accessed via RLS. ~1000 system exercises pre-populated.

**Known issues:**

- No automated tests (manual testing on physical device only)
- Sound asset directory uses .gitkeep placeholder (no real MP3 sourced)
- Supabase Dashboard manual configuration still needed (redirect URL, email confirmation, password length)

**Development environment:** Windows PC, Expo Go on physical iPhone over Wi-Fi. No simulator, no Mac. EAS Build for production/TestFlight. pnpm package manager.

## Constraints

- **Expo Go compatibility**: All code must run in Expo Go — no custom native modules, no custom dev client in v0.x
- **iOS 16 minimum**: ~95% device coverage, no iOS 17+ APIs needed
- **No UI libraries**: Hand-roll all components with StyleSheet.create()
- **Approved third-party only**: react-native-reanimated (built-in), react-native-gesture-handler (built-in), react-native-gifted-charts, react-native-svg (built-in), expo-linear-gradient
- **Direct Supabase**: No API layer, no Edge Functions, no middleware
- **System font only**: SF Pro via React Native defaults
- **Single standalone project**: No monorepo structure

## Key Decisions

| Decision                                       | Rationale                                                                             | Outcome                                          |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Expo (React Native) over Swift/Capacitor       | TypeScript reuse, Expo Go dev workflow, EAS cloud builds from Windows                 | Good — shipped full app in 6 days                |
| Copy-and-diverge from web app                  | Web app abandoned, standalone project simpler than shared package                     | Good — clean port, no dependency management      |
| AsyncStorage over SQLite for caching           | Data volume ~16MB lifetime, JSON key-value sufficient                                 | Good — simple, reliable, sufficient for scale    |
| Hub-and-spoke over tab bar                     | Matches web app IA, dashboard-centric model, app doesn't justify tabs                 | Good — clean single-hub UX                       |
| Hand-rolled UI over component library          | AI handles tedium, full control over dark theme, no lock-in                           | Good — full design control, no library conflicts |
| react-native-gifted-charts over victory-native | Works in Expo Go (no Skia), maps 1:1 to Chart.js config                               | Good — worked well with adjustToWidth            |
| Local notifications only                       | No server involvement, rest timer is sole use case                                    | Good — simple, reliable                          |
| Email/password only (no biometrics/Apple)      | Mirror web app, simplest path, can layer on later                                     | Good — sufficient for MVP                        |
| Full feature parity for v1                     | All web app features in scope — auth, templates, workouts, charts, exercises, history | Good — complete port achieved                    |
| IronLift rebrand                               | New brand identity for iOS app, distinct from abandoned web app                       | Good — clean brand separation                    |
| @gorhom/bottom-sheet → stack navigation        | Bottom sheet had gesture conflicts; stack nav cleaner for settings                    | Good — simpler, more native feel                 |
| Wall-clock timer (not tick counting)           | Immune to iOS background suspension                                                   | Good — reliable timer                            |
| Fit-to-width charts (adjustToWidth)            | Horizontal scrolling poor UX for trend visualization                                  | Good — all data visible at a glance              |

## Current Milestone: v0.1.1 Bug Fixes & Architecture

**Goal:** Fix behavioral gaps and improve architecture in the core workout loop, added incrementally as issues are discovered.

**First target:** Silent save of weight/reps to template when exercise is finished during workout — matching existing rest timer silent save behavior.

---

_Last updated: 2026-02-16 after v0.1.1 milestone start_

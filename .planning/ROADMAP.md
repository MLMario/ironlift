# Roadmap: IronLift iOS

## Overview

IronLift is a native iOS exercise tracker ported from the IronFactor web app. The roadmap progresses from project foundation and theming through authentication, exercise library, template management, the core workout loop, progress charts, and finally history browsing with settings -- each phase delivering a complete, verifiable capability. The core workout loop (Phase 5) is the product's centerpiece; everything before it builds prerequisites, everything after it closes the feedback loop.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation and Theme** - Expo project scaffolding, theme system, navigation skeleton, Supabase client
- [x] **Phase 2: Authentication** - Email/password auth, session persistence, password reset with deep link
- [x] **Phase 3: Exercise Library** - System exercises, custom exercise CRUD, exercise picker modal
- [x] **Phase 4: Templates and Dashboard** - Template CRUD, template editor modal, dashboard with template cards
- [x] **Phase 5: Active Workout** - Core workout loop with set logging, rest timer, offline support, crash recovery
- [ ] **Phase 6: Charts** - Exercise progress charts, chart CRUD, dashboard chart display
- [ ] **Phase 7: History and Settings** - Workout history timeline, settings bottom sheet, My Exercises screen

## Phase Details

### Phase 1: Foundation and Theme
**Goal**: App runs on a physical iPhone via Expo Go with a working theme system, navigation structure, and Supabase connection -- the substrate every subsequent screen is built on
**Depends on**: Nothing (first phase)
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06
**Success Criteria** (what must be TRUE):
  1. App launches in Expo Go on physical iPhone and renders a placeholder screen with correct dark theme colors
  2. Theme tokens (colors, spacing, radii, typography) are accessible via useTheme() hook and match the web app's CSS custom properties
  3. All interactive elements meet the 44px minimum tap target
  4. Navigation skeleton exists with Expo Router -- root layout, auth layout, and main layout are in place (even if screens are empty placeholders)
  5. Supabase client initializes and connects successfully (verified by a test query or auth ping)
**Web App Port**:
  - Copy as-is: `sql/` schema files for database reference
  - Copy as-is: `src/types/database.ts` and `src/types/services.ts` (TypeScript types)
  - Translate: Web app CSS custom properties (colors, spacing, radii, typography) -> TypeScript theme object
  - Reference: Web app stylesheets for exact design token values
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Project scaffolding, dependency installation, web app file port
- [x] 01-02-PLAN.md — Theme system (tokens, provider, hook) and Supabase client
- [x] 01-03-PLAN.md — Navigation skeleton with placeholder screens and device verification

### Phase 2: Authentication
**Goal**: Users can create accounts, log in, maintain persistent sessions, and recover forgotten passwords -- gating all personalized data access
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, AUTH-08
**Success Criteria** (what must be TRUE):
  1. User can create a new account with email and password and receives a verification email
  2. User can log in with email and password and is taken to the dashboard
  3. User's session survives app kill and restart without requiring re-login
  4. User can log out from the app and local cached data is cleared
  5. User can request a password reset email, tap the deep link, and set a new password within the app
**Web App Port**:
  - Copy and adapt: `auth.ts` service — swap Supabase client import, change `redirectTo` URL for password reset deep link (`ironlift://reset-password`), replace `expo-secure-store` with `expo-sqlite/localStorage` adapter
  - Reference: Auth surface for login/register/reset UI layout and flows
**Plans**: 5 plans

Plans:
- [x] 02-01-PLAN.md — Auth service, AuthProvider, root layout rewiring with splash screen
- [x] 02-02-PLAN.md — Reusable auth UI components (TextInputField, ErrorBox, SuccessBox, SubmitButton, AuthCard, AuthTabs)
- [x] 02-03-PLAN.md — Sign-in screen with login/register/reset sub-views and email verification modal
- [x] 02-04-PLAN.md — Reset password deep link screen and end-to-end auth verification
- [x] 02-05-PLAN.md — Gap closure: fix login routing to dashboard (reset-password screen declaration order)

### Phase 3: Exercise Library
**Goal**: Users can browse the full exercise catalog, search and filter it, and manage their own custom exercises -- the building blocks for templates and workouts
**Depends on**: Phase 2
**Requirements**: EXER-01, EXER-02, EXER-03, EXER-04, EXER-05, EXER-06, EXER-07, EXER-08, EXER-09
**Success Criteria** (what must be TRUE):
  1. App loads and displays ~1000 system exercises with metadata (name, category, equipment)
  2. User can search exercises by name and filter by category in the exercise picker modal
  3. User can create a custom exercise with name and category (duplicate names rejected)
  4. User can edit and delete their custom exercises
  5. Exercise picker with inline "Create New Exercise" form is available and functional (reusable across template editor, active workout, and My Exercises contexts)
**Web App Port**:
  - Copy and adapt: `exercises.ts` service — swap Supabase client import
  - Reference: Exercise picker modal for search/filter UI layout and inline create form behavior
  - Reference: My Exercises screen for custom exercise list/edit/delete UI
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Exercise service port + AsyncStorage cache layer
- [x] 03-02-PLAN.md — useExercises hook + CategoryChips + ExerciseListItem components
- [x] 03-03-PLAN.md — ExercisePickerModal assembly + dashboard test hookup

### Phase 4: Templates and Dashboard
**Goal**: Users can create, edit, and delete workout templates from a dashboard that serves as the app's central hub -- the launch point for every workout
**Depends on**: Phase 3
**Requirements**: TMPL-01, TMPL-02, TMPL-03, TMPL-04, TMPL-05, TMPL-06, TMPL-07, TMPL-08, TMPL-09, TMPL-10, DASH-01, DASH-02, DASH-05, DASH-06
**Success Criteria** (what must be TRUE):
  1. Dashboard displays the user's workout templates as tappable cards in a grid with name, edit icon, delete icon, and "Start" button
  2. Dashboard header shows IronLift brand and settings gear icon
  3. Tapping "+ New Template" opens the template editor as a modal that slides up from the bottom
  4. User can build a template by naming it, adding exercises via picker, configuring default rest times and sets (weight/reps), reordering and removing exercises, and saving
  5. User can delete a template from the dashboard
**Web App Port**:
  - Copy and adapt: `templates.ts` service — swap Supabase client import
  - Reference: Dashboard surface for template card grid layout, header design, mini-card proportions
  - Reference: Template editor surface for exercise list, set configuration, reorder controls, save/cancel flow
**Plans**: 6 plans

Plans:
- [x] 04-01-PLAN.md — Template service port, cache extension, useTemplates hook, GestureHandlerRootView
- [x] 04-02-PLAN.md — Template editor sub-components (SetRow, RestTimerInline, ExerciseEditorCard)
- [x] 04-03-PLAN.md — Dashboard screen with header, template grid, swipeable cards
- [x] 04-04-PLAN.md — Template editor modal assembly with full create/edit/delete flow
- [x] 04-05-PLAN.md — Gap closure: dashboard layout overhaul (single column, section header, refresh on focus)
- [x] 04-06-PLAN.md — Gap closure: brand split-color, decimal weight input, remove rest timer progress bar

### Phase 5: Active Workout
**Goal**: Users can start a workout from a template, log sets with weight and reps, use a rest timer, and finish -- including fully offline with crash recovery -- delivering the core product experience
**Depends on**: Phase 4
**Requirements**: WORK-01, WORK-02, WORK-03, WORK-04, WORK-05, WORK-06, WORK-07, WORK-08, WORK-09, WORK-10, WORK-11, WORK-12, WORK-13, WORK-14, WORK-15, WORK-16, WORK-17, WORK-18, WORK-19, WORK-20
**Success Criteria** (what must be TRUE):
  1. User can start a workout from a template card, see all exercises with weight/reps inputs and done checkboxes, add/remove sets (including swipe-to-delete), and add/remove exercises mid-workout
  2. Completing a set triggers a rest timer that displays as an inline horizontal bar with countdown, supports +/-10s adjustment, and sends a local notification when the timer completes while the app is backgrounded
  3. User can finish a workout and all logged sets are saved to the database; if template structure changed, the app prompts to update the template
  4. User can start and complete a workout fully offline using cached templates, with the workout queued for sync when connectivity returns
  5. If the app is killed mid-workout and relaunched, the user is prompted to resume the in-progress workout with all previously entered data intact
**Web App Port**:
  - Copy and adapt: `logging.ts` service — swap Supabase client import, add write queue integration for offline saves
  - Reference: Workout surface for exercise card layout, set row inputs, rest timer bar design, finish/cancel modals
  - Reference: `useTimerState` hook for rest timer state machine logic
  - Reference: `useWorkoutBackup` hook for crash recovery pattern (adapt localStorage -> AsyncStorage)
  - Reference: Template change detection logic (snapshot comparison on finish)
  - Rebuild: Swipe-to-delete gesture (web uses @use-gesture -> iOS uses react-native-gesture-handler)
**Plans**: 7 plans

Plans:
- [x] 05-01-PLAN.md — Dependencies, logging service port, write queue, notification config
- [x] 05-02-PLAN.md — Core hooks: useWorkoutState, useRestTimer, useWorkoutBackup
- [x] 05-03-PLAN.md — Small components: ProgressRing, RestTimerBar, ConfirmationModal, ResumeWorkoutModal
- [x] 05-04-PLAN.md — Complex components: WorkoutSetRow (swipe-to-delete), WorkoutExerciseCard (accordion)
- [x] 05-05-PLAN.md — Workout screen assembly with finish/cancel flows and offline save
- [x] 05-06-PLAN.md — Dashboard integration (Start button, crash recovery) and human verification
- [x] 05-07-PLAN.md — Gap closure: fix useWorkoutState initialization race condition

### Phase 6: Charts
**Goal**: Users can create per-exercise progress charts that visualize their training history on the dashboard -- closing the feedback loop that makes consistent training motivating
**Depends on**: Phase 5
**Requirements**: CHRT-01, CHRT-02, CHRT-03, CHRT-04, CHRT-05, CHRT-06, CHRT-07, DASH-03, DASH-04, DASH-07
**Success Criteria** (what must be TRUE):
  1. User can create a chart by selecting an exercise, a metric type (total sets or max volume), and an x-axis mode (by date or by session number)
  2. Charts render as line charts with gradient fill on the dashboard below templates, showing exercise name and metric type
  3. Chart data is computed client-side from cached workout history (no separate server endpoint)
  4. User can delete a chart from the dashboard
**Web App Port**:
  - Copy and adapt: `charts.ts` service CRUD operations (getUserCharts, createChart, deleteChart, reorderCharts) — swap Supabase client import
  - Discard: `renderChart`/`destroyChart` (Chart.js-specific imperative code)
  - Rebuild: Chart rendering — replace Chart.js `<canvas>` with react-native-gifted-charts `<LineChart>` declarative components
  - Reference: Chart computation logic for total_sets and max_volume_set metrics
  - Reference: Add Chart modal for exercise/metric/axis selection UI
  - Reference: Dashboard chart card layout
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

### Phase 7: History and Settings
**Goal**: Users can review past workouts in a paginated timeline, manage their custom exercises, and access app settings -- completing the full feature set for release
**Depends on**: Phase 5
**Requirements**: HIST-01, HIST-02, HIST-03, HIST-04, HIST-05, SETT-01, SETT-02, SETT-03, SETT-04, SETT-05, SETT-06
**Success Criteria** (what must be TRUE):
  1. User can open the settings bottom sheet from the dashboard gear icon and navigate to My Exercises, Workout History, or log out
  2. My Exercises screen shows the user's custom exercises with the ability to edit, delete, and create new ones
  3. Workout History screen shows a paginated timeline with summary stats (total workouts, total sets, total volume)
  4. User can tap a workout entry to see full detail -- all exercises, sets, weights, and reps for that session
  5. Settings sub-screens (My Exercises, History, Workout Detail) present as stack pushes from the bottom sheet
**Web App Port**:
  - Reference: Settings panel for menu layout and navigation pattern (web slide-in -> iOS bottom sheet)
  - Reference: Workout History screen for timeline layout, date markers, metric badges, pagination pattern
  - Reference: Workout Detail screen for exercise/set display layout
  - Reference: My Exercises screen for custom exercise list, edit/delete UI (exercise service already ported in Phase 3)
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation and Theme | 3/3 | Complete | 2026-02-13 |
| 2. Authentication | 5/5 | Complete | 2026-02-12 |
| 3. Exercise Library | 3/3 | Complete | 2026-02-13 |
| 4. Templates and Dashboard | 6/6 | Complete | 2026-02-13 |
| 5. Active Workout | 7/7 | Complete | 2026-02-14 |
| 6. Charts | 0/TBD | Not started | - |
| 7. History and Settings | 0/TBD | Not started | - |

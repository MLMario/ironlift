# Requirements: IronLift

**Defined:** 2026-02-11
**Core Value:** The core workout loop -- pick a template, log sets with weight/reps, finish and save -- must work flawlessly, including fully offline.

## v1 Requirements

Requirements for initial release. Faithful port of the IronFactor web app to native iOS via Expo.

### Authentication

- [x] **AUTH-01**: User can create account with email and password
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can log in with email and password
- [x] **AUTH-04**: User session persists across app kills and restarts (auto-refresh via refresh token)
- [x] **AUTH-05**: User can log out from settings (local cache is cleared on logout)
- [x] **AUTH-06**: On login, app fetches and caches user's data from Supabase
- [x] **AUTH-07**: User can request password reset via email
- [x] **AUTH-08**: Password reset deep link (`ironlift://reset-password`) returns user to native password update screen

### Dashboard

- [x] **DASH-01**: Dashboard displays user's workout templates as tappable cards in a grid
- [x] **DASH-02**: Each template card shows template name, edit icon, delete icon, and "Start" button
- [ ] **DASH-03**: Dashboard displays user's exercise charts below templates
- [ ] **DASH-04**: Each chart card shows exercise name, metric type, and rendered chart
- [x] **DASH-05**: Dashboard header shows IronLift brand and settings gear icon
- [x] **DASH-06**: Tapping "+ New Template" navigates to template editor (modal)
- [ ] **DASH-07**: Tapping "+ Add Chart" opens add chart modal

### Exercise Library

- [x] **EXER-01**: App ships with ~1000 system exercises with metadata (name, category, equipment, instructions, level, force, mechanic)
- [x] **EXER-02**: User can create custom exercises with name and category
- [x] **EXER-03**: Creating a custom exercise rejects duplicate names (against user's existing custom exercises)
- [x] **EXER-04**: User can edit custom exercise name and category
- [x] **EXER-05**: User can delete custom exercises
- [x] **EXER-06**: Exercise picker modal shows all exercises (system + custom) with search by name
- [x] **EXER-07**: Exercise picker modal filters exercises by category (Chest, Back, Shoulders, Legs, Arms, Core, Other)
- [x] **EXER-08**: Exercise picker includes "Create New Exercise" option that extends the modal to show name + category form inline
- [x] **EXER-09**: Exercise creation via picker is available in all contexts: template editor, active workout, and My Exercises

### Templates

- [x] **TMPL-01**: User can create a new workout template with a name
- [x] **TMPL-02**: User can add exercises to a template via the exercise picker
- [x] **TMPL-03**: Each template exercise has a configurable default rest time (seconds)
- [x] **TMPL-04**: Each template exercise has configurable default sets with weight and reps
- [x] **TMPL-05**: User can reorder exercises within a template (up/down)
- [x] **TMPL-06**: User can remove exercises from a template
- [x] **TMPL-07**: User can add/remove sets within a template exercise
- [x] **TMPL-08**: User can save a template (create or update)
- [x] **TMPL-09**: User can delete a template from the dashboard
- [x] **TMPL-10**: Template editor presents as a modal (slides up from bottom)

### Active Workout

- [ ] **WORK-01**: User can start a workout by tapping "Start" on a template card
- [ ] **WORK-02**: Workout screen shows template name and start timestamp
- [ ] **WORK-03**: Each exercise card shows exercise name and category
- [ ] **WORK-04**: Each set row has weight input, reps input, and done checkbox
- [ ] **WORK-05**: Tapping done checkbox marks the set as complete and triggers rest timer
- [ ] **WORK-06**: User can add sets to any exercise during the workout
- [ ] **WORK-07**: User can remove sets via swipe-to-delete gesture (left swipe reveals delete)
- [ ] **WORK-08**: User can add exercises mid-workout via exercise picker
- [ ] **WORK-09**: User can remove exercises during the workout
- [ ] **WORK-10**: Rest timer displays as inline horizontal bar with countdown and time remaining
- [ ] **WORK-11**: Rest timer supports +10s and -10s adjustment buttons
- [ ] **WORK-12**: Rest timer sends local notification when complete (app backgrounded)
- [ ] **WORK-13**: Rest timer auto-cancels when exercise removed or workout ends
- [ ] **WORK-14**: User can finish workout -- saves all logged sets to database
- [ ] **WORK-15**: On finish, app detects structural template changes (added/removed exercises, changed set counts) and prompts to update template
- [ ] **WORK-16**: User can cancel workout with confirmation modal (warns about losing progress)
- [ ] **WORK-17**: Active workout screen presents as stack push (swipe-back disabled)
- [ ] **WORK-18**: Active workout state auto-saves to AsyncStorage on every change (crash recovery)
- [ ] **WORK-19**: On app relaunch, user is prompted to resume an in-progress workout if one exists
- [ ] **WORK-20**: User can start and complete a workout fully offline using cached templates

### Charts

- [ ] **CHRT-01**: User can create a chart by selecting an exercise, metric type, and x-axis mode
- [ ] **CHRT-02**: Metric types: total sets per workout, max volume (weight x reps) per workout
- [ ] **CHRT-03**: X-axis modes: by date, by session number
- [ ] **CHRT-04**: Charts render as line charts with gradient fill
- [ ] **CHRT-05**: Chart data is computed client-side from cached workout history
- [ ] **CHRT-06**: User can delete a chart
- [ ] **CHRT-07**: Charts display on dashboard below templates

### History

- [ ] **HIST-01**: User can view workout history as a paginated timeline
- [ ] **HIST-02**: History shows summary stats (total workouts, total sets, total volume)
- [ ] **HIST-03**: Each workout entry shows date and key metrics
- [ ] **HIST-04**: User can tap a workout to see full detail (all exercises, sets, weights, reps)
- [ ] **HIST-05**: History is accessible from Settings

### Settings

- [ ] **SETT-01**: Settings menu presents as bottom sheet overlay on dashboard
- [ ] **SETT-02**: Settings menu shows: My Exercises, Workout History, Logout
- [ ] **SETT-03**: My Exercises screen shows user's custom exercises with edit/delete
- [ ] **SETT-04**: My Exercises allows creating new custom exercises
- [ ] **SETT-05**: Workout History screen navigable from settings
- [ ] **SETT-06**: Settings sub-screens (My Exercises, History, Detail) present as stack push

### Theme & UI

- [x] **UI-01**: App uses dark mode only with semantic theme tokens matching web app design
- [x] **UI-02**: Theme accessed via ThemeProvider context and useTheme() hook
- [x] **UI-03**: All components hand-rolled with StyleSheet.create() -- no UI libraries
- [x] **UI-04**: System font (SF Pro) only -- no custom fonts
- [x] **UI-05**: Colors, spacing, typography, border radii match web app CSS custom properties
- [x] **UI-06**: Minimum tap target of 44px on all interactive elements

## v2 Requirements

Deferred to future release. Not in current roadmap.

### Table Stakes Gaps (v1.x)

- **GAP-01**: Previous workout values displayed inline during active workout logging
- **GAP-02**: Workout duration tracking (finished_at timestamp, duration display in history)
- **GAP-03**: Personal record (PR) detection on workout save

### Enrichments (v1.x)

- **ENRC-01**: Supersets / exercise grouping in templates and active workout
- **ENRC-02**: 1RM estimation from logged data (Epley/Brzycki formula)
- **ENRC-03**: Workout notes (per-workout and per-exercise free text)
- **ENRC-04**: Set type labels (warmup, working, drop, failure)
- **ENRC-05**: CSV data export
- **ENRC-06**: RPE/RIR tracking per set

### Platform (v2+, requires custom dev client)

- **PLAT-01**: Apple Health integration (HealthKit)
- **PLAT-02**: Apple Watch companion app
- **PLAT-03**: Biometric unlock (Face ID / Touch ID)
- **PLAT-04**: Apple Sign-In
- **PLAT-05**: Light mode theme

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Social feed / community | Massive scope, solo project, IronLift is a personal tool |
| AI workout generation | Requires ML infrastructure, out of domain |
| Calorie / nutrition tracking | Completely different domain, existing apps do it better |
| Gamification (streaks, badges) | Research shows it loses motivational power quickly |
| Video exercise demonstrations | Requires hosting video content, text instructions suffice |
| Tab bar navigation | Hub-and-spoke architecture decision, simpler UX |
| Server-side push notifications | Local only for rest timer, no APNs setup |
| Pull-to-refresh / polling | Sync on foreground and after writes only |
| Custom fonts | System font (SF Pro) only for zero config |
| Real-time multiplayer workouts | Not applicable for personal tracker |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| AUTH-07 | Phase 2 | Complete |
| AUTH-08 | Phase 2 | Complete |
| DASH-01 | Phase 4 | Complete |
| DASH-02 | Phase 4 | Complete |
| DASH-03 | Phase 6 | Pending |
| DASH-04 | Phase 6 | Pending |
| DASH-05 | Phase 4 | Complete |
| DASH-06 | Phase 4 | Complete |
| DASH-07 | Phase 6 | Pending |
| EXER-01 | Phase 3 | Complete |
| EXER-02 | Phase 3 | Complete |
| EXER-03 | Phase 3 | Complete |
| EXER-04 | Phase 3 | Complete |
| EXER-05 | Phase 3 | Complete |
| EXER-06 | Phase 3 | Complete |
| EXER-07 | Phase 3 | Complete |
| EXER-08 | Phase 3 | Complete |
| EXER-09 | Phase 3 | Complete |
| TMPL-01 | Phase 4 | Complete |
| TMPL-02 | Phase 4 | Complete |
| TMPL-03 | Phase 4 | Complete |
| TMPL-04 | Phase 4 | Complete |
| TMPL-05 | Phase 4 | Complete |
| TMPL-06 | Phase 4 | Complete |
| TMPL-07 | Phase 4 | Complete |
| TMPL-08 | Phase 4 | Complete |
| TMPL-09 | Phase 4 | Complete |
| TMPL-10 | Phase 4 | Complete |
| WORK-01 | Phase 5 | Pending |
| WORK-02 | Phase 5 | Pending |
| WORK-03 | Phase 5 | Pending |
| WORK-04 | Phase 5 | Pending |
| WORK-05 | Phase 5 | Pending |
| WORK-06 | Phase 5 | Pending |
| WORK-07 | Phase 5 | Pending |
| WORK-08 | Phase 5 | Pending |
| WORK-09 | Phase 5 | Pending |
| WORK-10 | Phase 5 | Pending |
| WORK-11 | Phase 5 | Pending |
| WORK-12 | Phase 5 | Pending |
| WORK-13 | Phase 5 | Pending |
| WORK-14 | Phase 5 | Pending |
| WORK-15 | Phase 5 | Pending |
| WORK-16 | Phase 5 | Pending |
| WORK-17 | Phase 5 | Pending |
| WORK-18 | Phase 5 | Pending |
| WORK-19 | Phase 5 | Pending |
| WORK-20 | Phase 5 | Pending |
| CHRT-01 | Phase 6 | Pending |
| CHRT-02 | Phase 6 | Pending |
| CHRT-03 | Phase 6 | Pending |
| CHRT-04 | Phase 6 | Pending |
| CHRT-05 | Phase 6 | Pending |
| CHRT-06 | Phase 6 | Pending |
| CHRT-07 | Phase 6 | Pending |
| HIST-01 | Phase 7 | Pending |
| HIST-02 | Phase 7 | Pending |
| HIST-03 | Phase 7 | Pending |
| HIST-04 | Phase 7 | Pending |
| HIST-05 | Phase 7 | Pending |
| SETT-01 | Phase 7 | Pending |
| SETT-02 | Phase 7 | Pending |
| SETT-03 | Phase 7 | Pending |
| SETT-04 | Phase 7 | Pending |
| SETT-05 | Phase 7 | Pending |
| SETT-06 | Phase 7 | Pending |
| UI-01 | Phase 1 | Complete |
| UI-02 | Phase 1 | Complete |
| UI-03 | Phase 1 | Complete |
| UI-04 | Phase 1 | Complete |
| UI-05 | Phase 1 | Complete |
| UI-06 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 78 total
- Mapped to phases: 78
- Unmapped: 0

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-13 after Phase 4 completion*

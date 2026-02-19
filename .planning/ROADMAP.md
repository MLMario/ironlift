# Roadmap: IronLift iOS

## Milestones

- SHIPPED **v0.1 MVP** — Phases 1-10 (shipped 2026-02-16) — [archive](milestones/v0.1-ROADMAP.md)
- ACTIVE **v0.1.1 Bug Fixes & Architecture** — Phases 11+ (incremental)

## Phases

<details>
<summary>SHIPPED v0.1 MVP (Phases 1-10) — SHIPPED 2026-02-16</summary>

- [x] Phase 1: Foundation and Theme (3/3 plans) — completed 2026-02-13
- [x] Phase 2: Authentication (5/5 plans) — completed 2026-02-12
- [x] Phase 3: Exercise Library (3/3 plans) — completed 2026-02-13
- [x] Phase 4: Templates and Dashboard (6/6 plans) — completed 2026-02-13
- [x] Phase 5: Active Workout (9/9 plans) — completed 2026-02-13
- [x] Phase 6: Charts (6/6 plans) — completed 2026-02-15
- [x] Phase 7: History and Settings (5/5 plans) — completed 2026-02-16
- [x] Phase 8: Chart Fit-to-Width Display (1/1 plan) — completed 2026-02-15
- [x] Phase 9: Timer Fixes (3/3 plans) — completed 2026-02-16
- [x] Phase 10: Settings Stack Navigation (1/1 plan) — completed 2026-02-16

</details>

### v0.1.1 Bug Fixes & Architecture

- [x] Phase 11: Silent Save of Weight/Reps to Template (1/1 plan) — completed 2026-02-16
- [x] Phase 12: Database Creation Limits via Triggers (1/1 plan) — completed 2026-02-17
- [x] Phase 13: Test Harness for Unit Testing (2/2 plans) — completed 2026-02-18

**Plans:**
- [x] 11-01-PLAN.md — Silent save service, hook detection, and workout finish wiring
- [x] 12-01-PLAN.md — SQL migration with 7 trigger functions + error documentation
- [x] 13-01-PLAN.md — Install test dependencies, create Jest config and global setup
- [x] 13-02-PLAN.md — Proof-of-concept tests (utilities + component render)

## Phase Details

### Phase 11: Silent Save of Weight/Reps to Template

**Goal:** When a user modifies weight/reps during an active workout and finishes the workout, silently save completed set values back to the template — matching existing rest timer silent save behavior.

**Plans:** 1 plan

Plans:
- [x] 11-01-PLAN.md — Add updateTemplateExerciseSetValues service, getWeightRepsChanges hook, wire into workout finish flow

**Requirements:** FIX-01

**Preserved behavior:** Weight/reps changes do NOT trigger the template update confirmation modal. This is correct and must remain unchanged.

**Success criteria:**
1. User changes weight on a set during workout, completes all sets for that exercise -> template reflects new weight
2. User changes reps on a set during workout, completes all sets for that exercise -> template reflects new reps
3. Silent save does not trigger the template update confirmation modal
4. Silent save works offline (best-effort, matching rest timer pattern)
5. Existing rest timer silent save behavior is unaffected

### Phase 12: Database Creation Limits via Triggers

**Goal:** Implement BEFORE INSERT trigger functions on Supabase to enforce max row counts as a database-level safety net. Service-layer count-before-insert checks and user-facing error messages are deferred to the next milestone — this phase is DB protection only.

**Limits:**
- Templates per user: 20
- Custom exercises per user: 50
- Charts per user: 25
- Exercises per template/workout: 15
- Sets per exercise in template/workout: 10

**Plans:** 1 plan

Plans:
- [x] 12-01-PLAN.md — SQL migration with 7 trigger functions (advisory locks, P0001 ERRCODE) + error documentation + Supabase deploy

**Deliverables:**
- Full migration SQL for Supabase SQL Editor
- Migration file added to `sql/` for version tracking

**Success criteria:**
1. Each trigger counts existing rows by relevant parent/owner column and RAISE EXCEPTION if limit exceeded
2. All five limits enforced at database level
3. Migration SQL runs cleanly in Supabase SQL Editor
4. Migration file tracked in `sql/`

### Phase 13: Test Harness for Unit Testing

**Goal:** Set up a React Native/Expo-compatible unit test harness using Jest and @testing-library/react-native, enabling reliable unit and component testing across the codebase.

**Depends on:** Phase 12
**Plans:** 2 plans

Plans:
- [x] 13-01-PLAN.md — Install test dependencies, create Jest config and global setup
- [x] 13-02-PLAN.md — Proof-of-concept tests (utilities + component render)

**Success criteria:**
1. jest-expo, @testing-library/react-native, and supporting packages installed
2. Jest configuration with jest-expo preset, global mocks for Reanimated/GestureHandler/AsyncStorage/Supabase
3. Pure utility tests (formatters, timeUtils) pass
4. Component render test (SubmitButton with ThemeProvider) passes
5. `npm test` exits with code 0

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation and Theme | v0.1 | 3/3 | Complete | 2026-02-13 |
| 2. Authentication | v0.1 | 5/5 | Complete | 2026-02-12 |
| 3. Exercise Library | v0.1 | 3/3 | Complete | 2026-02-13 |
| 4. Templates and Dashboard | v0.1 | 6/6 | Complete | 2026-02-13 |
| 5. Active Workout | v0.1 | 9/9 | Complete | 2026-02-13 |
| 6. Charts | v0.1 | 6/6 | Complete | 2026-02-15 |
| 7. History and Settings | v0.1 | 5/5 | Complete | 2026-02-16 |
| 8. Chart Fit-to-Width Display | v0.1 | 1/1 | Complete | 2026-02-15 |
| 9. Timer Fixes | v0.1 | 3/3 | Complete | 2026-02-16 |
| 10. Settings Stack Navigation | v0.1 | 1/1 | Complete | 2026-02-16 |
| 11. Silent Save Weight/Reps | v0.1.1 | 1/1 | Complete | 2026-02-16 |
| 12. DB Creation Limits | v0.1.1 | 1/1 | Complete | 2026-02-17 |
| 13. Test Harness | v0.1.1 | 2/2 | Complete | 2026-02-18 |

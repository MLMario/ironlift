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

- [ ] Phase 11: Silent Save of Weight/Reps to Template

## Phase Details

### Phase 11: Silent Save of Weight/Reps to Template

**Goal:** When a user modifies weight/reps during an active workout and completes the exercise, silently save those values back to the template — matching existing rest timer silent save behavior.

**Requirements:** FIX-01

**Implementation note:** Research whether to leverage the existing rest timer silent save implementation or create separate save logic. The rest timer already silently persists changes — weight/reps should follow the same pattern for consistency.

**Preserved behavior:** Weight/reps changes do NOT trigger the template update confirmation modal. This is correct and must remain unchanged.

**Success criteria:**
1. User changes weight on a set during workout, completes all sets for that exercise → template reflects new weight
2. User changes reps on a set during workout, completes all sets for that exercise → template reflects new reps
3. Silent save does not trigger the template update confirmation modal
4. Silent save works offline (queued for sync like other writes)
5. Existing rest timer silent save behavior is unaffected

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
| 11. Silent Save Weight/Reps | v0.1.1 | 0/? | Pending | — |

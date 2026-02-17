# Requirements: IronLift v0.1.1

**Defined:** 2026-02-16
**Core Value:** The core workout loop must work flawlessly, including fully offline.

## v0.1.1 Requirements

### Workout Behavior Fixes

- [x] **FIX-01**: When user completes all sets of an exercise during an active workout with modified weight/reps values, those changes are silently saved to the template (matching rest timer silent save behavior)

### Preserved Behavior

Weight/reps changes during a workout do NOT trigger the template update confirmation modal. This is correct existing behavior and must remain consistent.

## Future Requirements

### v0.2 — Table Stakes Gaps

- **GAP-01**: Previous workout values displayed inline during active workout logging
- **GAP-02**: Workout duration tracking with finished_at timestamp and duration display in history
- **GAP-03**: Personal record (PR) detection on workout save

## Out of Scope

| Feature | Reason |
|---------|--------|
| Structural template changes during workout | Handled by existing confirmation modal |
| Batch save of all exercises on workout finish | Silent save should happen per-exercise on completion, not deferred |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 11 | Complete |

**Coverage:**
- v0.1.1 requirements: 1 total
- Mapped to phases: 1
- Unmapped: 0

---
*Requirements defined: 2026-02-16*
*Last updated: 2026-02-16 after phase 11 completion*

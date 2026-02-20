# Project Milestones: IronLift

## v0.1.1 Bug Fixes & Architecture (Shipped: 2026-02-20)

**Delivered:** Silent save of weight/reps to templates, database creation limits via triggers, and a full Jest + RNTL test harness — plus expanded unit test coverage and deep linking fixes.

**Phases completed:** 11-13 (4 plans total)

**Key accomplishments:**

- Silent save of modified weight/reps values to template when exercise completed during active workout
- 7 BEFORE INSERT database triggers with advisory locks enforcing creation limits across all tables
- Jest + RNTL test harness with jest-expo preset, global mocks, and 21 proof-of-concept tests
- Expanded unit test suite covering services (auth, cache, exercises, templates, logging, writeQueue) and hooks
- Deep linking fix for signup and password reset flows

**Stats:**

- 59 source files created/modified
- 23,128 lines of TypeScript (up from 14,849 at v0.1)
- 3 phases, 4 plans
- 4 days from v0.1 ship to v0.1.1 ship (2026-02-16 → 2026-02-20)

**Git range:** `feat(11-01)` → `feat(13-02)`

**What's next:** v0.2 — Table Stakes Gaps (previous workout values, workout duration, PR detection)

---

## v0.1 MVP (Shipped: 2026-02-16)

**Delivered:** Full iOS port of the IronFactor web app — a complete exercise tracker with authentication, template management, active workout logging (offline-capable with crash recovery), progress charts, workout history, and settings navigation.

**Phases completed:** 1-10 (42 plans total)

**Key accomplishments:**

- User authentication with email/password, session persistence, and deep-link password reset
- Exercise library with ~1000 system exercises, custom exercise CRUD, and reusable picker modal with search/filter
- Template management with ordered exercises, configurable sets/rest times, and dashboard display
- Active workout experience with set logging, inline rest timer (tap-to-edit, +/-10s), swipe-to-delete, crash recovery, and full offline support
- Progress charts computed client-side from cached workout history with fit-to-width display
- Workout history timeline with paginated drill-down and full-screen settings stack navigation

**Stats:**

- 238 files created/modified
- 14,849 lines of TypeScript
- 10 phases, 42 plans, 78 requirements
- 6 days from project init to ship (2026-02-10 → 2026-02-16)

**Git range:** `feat(01-01)` → `feat(10-01)`

**What's next:** v0.1.1 — bug fixes and architecture improvements

---

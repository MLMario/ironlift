# Project Milestones: IronLift

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

**What's next:** v0.2 — table stakes gaps (previous workout values, workout duration, PR detection) and enrichments

---

# Phase 12: Database Creation Limits via Triggers - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement BEFORE INSERT trigger functions on Supabase to enforce max row counts as a database-level safety net. Service-layer count-before-insert checks and user-facing error messages are deferred to the next milestone -- this phase is DB protection only.

**Limits:**
- Templates per user: 20
- Custom exercises per user: 50
- Charts per user: 25
- Exercises per template/workout: 15
- Sets per exercise in template/workout: 10

</domain>

<decisions>
## Implementation Decisions

### Error message format
- Structured, parseable format: `LIMIT_EXCEEDED:{entity}:{max_limit}`
- Example: `LIMIT_EXCEEDED:templates:20`
- Include entity name and limit value only (no current count)
- Each trigger uses a unique custom Postgres ERRCODE for programmatic detection
- Error codes follow pattern: LIM01, LIM02, LIM03, etc. (one per entity/table)

### Error code documentation
- Create `docs/error_documentation.md` documenting all custom error codes
- Each entry includes: code, entity, limit value, trigger function name, and table
- Include test INSERT queries for each limit so manual verification is straightforward

### Counting logic
- Count all rows (no soft-delete filtering -- soft deletes don't exist in the schema)
- For exercises: only count rows with `source = 'user'` (system exercises excluded from the 50 limit)
- For templates: count all templates WHERE user_id matches (no archive concept exists)
- For charts: single limit of 25 across all chart types

### Trigger scope
- Triggers on BOTH template and workout tables for per-parent limits:
  - `template_exercises` AND `workout_exercises` (15 exercise limit)
  - `template_exercise_sets` AND `workout_exercise_sets` (10 set limit)
- Same limits for template-side and workout-side (no higher workout caps)
- Per-user triggers on: `templates`, `exercises`, `charts`

### Concurrency
- Add advisory lock if complexity is low; otherwise defer as a known gap and note in roadmap
- Single-user mobile app makes race conditions extremely unlikely

### Claude's Discretion
- Trigger function naming convention (consistent pattern -- Claude decides)
- Advisory lock implementation decision (based on complexity assessment)
- Exact SQL structure and ordering within the migration file

</decisions>

<specifics>
## Specific Ideas

- User explicitly wants custom ERRCODE pattern starting from LIM01 (not generic Postgres codes)
- Error documentation must live at `docs/error_documentation.md` with test queries per limit
- Migration must be idempotent (CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS) so it's safe to re-run
- Single migration file in `sql/` (not split per table)

</specifics>

<deferred>
## Deferred Ideas

- Service-layer count-before-insert checks (pre-check before attempting insert) -- next milestone
- User-facing "limit reached" error messages in the UI -- next milestone
- UI prevention (disable "add" buttons when at limit) -- next milestone

</deferred>

---

*Phase: 12-db-creation-limits*
*Context gathered: 2026-02-16*

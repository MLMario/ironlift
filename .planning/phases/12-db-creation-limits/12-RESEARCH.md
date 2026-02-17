# Phase 12: Database Creation Limits via Triggers - Research

**Researched:** 2026-02-16
**Domain:** PostgreSQL trigger functions, BEFORE INSERT enforcement, custom ERRCODE
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Error message format:** Structured, parseable format: `LIMIT_EXCEEDED:{entity}:{max_limit}` (e.g., `LIMIT_EXCEEDED:templates:20`). Include entity name and limit value only (no current count). Each trigger uses a unique custom Postgres ERRCODE for programmatic detection. Error codes follow pattern: LIM01, LIM02, LIM03, etc. (one per entity/table).
- **Error code documentation:** Create `docs/error_documentation.md` documenting all custom error codes. Each entry includes: code, entity, limit value, trigger function name, and table. Include test INSERT queries for each limit so manual verification is straightforward.
- **Counting logic:** Count all rows (no soft-delete filtering). For exercises: only count rows with `is_system = false` (system exercises excluded from the 50 limit). For templates: count all templates WHERE user_id matches. For charts: single limit of 25 across all chart types.
- **Trigger scope:** Triggers on BOTH template-side and workout-side tables for per-parent limits: `template_exercises` AND `workout_log_exercises` (15 exercise limit), `template_exercise_sets` AND `workout_log_sets` (10 set limit). Same limits for template-side and workout-side. Per-user triggers on: `templates`, `exercises`, `user_charts`.
- **Concurrency:** Add advisory lock if complexity is low; otherwise defer as a known gap and note in roadmap.
- **Idempotency:** Migration must be idempotent (CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS) so it's safe to re-run.
- **Single migration file:** Single migration file in `sql/` (not split per table).

### Claude's Discretion

- Trigger function naming convention (consistent pattern -- Claude decides)
- Advisory lock implementation decision (based on complexity assessment)
- Exact SQL structure and ordering within the migration file

### Deferred Ideas (OUT OF SCOPE)

- Service-layer count-before-insert checks (pre-check before attempting insert) -- next milestone
- User-facing "limit reached" error messages in the UI -- next milestone
- UI prevention (disable "add" buttons when at limit) -- next milestone
</user_constraints>

## Summary

This phase implements BEFORE INSERT trigger functions on seven PostgreSQL tables in Supabase to enforce maximum row count limits. The triggers serve as a database-level safety net, ensuring no user can exceed defined limits regardless of client behavior. No application-layer changes are needed -- this is purely SQL migration work.

The standard approach is well-established PostgreSQL: create PL/pgSQL trigger functions that COUNT existing rows, compare against a hard-coded limit, and RAISE EXCEPTION with a custom SQLSTATE code if exceeded. The trigger functions use `CREATE OR REPLACE FUNCTION` for idempotency, and triggers use `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` since `CREATE OR REPLACE TRIGGER` (PostgreSQL 14+) is available on Supabase but the DROP+CREATE pattern was explicitly requested.

Advisory locks add minimal complexity (one extra line per trigger function) and are recommended as included, using `pg_advisory_xact_lock` with a hash of the user/parent ID. This prevents the theoretical race condition where two concurrent inserts both pass the count check before either commits.

**Primary recommendation:** Write a single idempotent SQL migration with 7 trigger functions (one per table), 7 triggers, and use transaction-scoped advisory locks for concurrency safety. Use the `LI` SQLSTATE class prefix (unused by PostgreSQL) for custom error codes `LIM01` through `LIM07`.

## Critical Schema Corrections

**IMPORTANT:** The CONTEXT.md uses shorthand table names that do not match the actual schema. The planner MUST use the correct table names:

| CONTEXT.md Says | Actual Table Name | Parent FK Column |
|----------------|-------------------|------------------|
| `templates` | `templates` | `user_id` (direct) |
| `exercises` | `exercises` | `user_id` (direct) |
| `charts` | `user_charts` | `user_id` (direct) |
| `template_exercises` | `template_exercises` | `template_id` -> `templates.user_id` |
| `workout_exercises` | **`workout_log_exercises`** | `workout_log_id` -> `workout_logs.user_id` |
| `template_exercise_sets` | `template_exercise_sets` | `template_exercise_id` -> parent |
| `workout_exercise_sets` | **`workout_log_sets`** | `workout_log_exercise_id` -> parent |

Also, CONTEXT.md says `source = 'user'` for filtering exercises, but the actual column is **`is_system boolean`**. The correct filter is `is_system = false` (not `source = 'user'`).

## Standard Stack

This phase is pure SQL -- no npm packages or libraries involved.

### Core

| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| PostgreSQL PL/pgSQL | 15+ (Supabase) | Trigger function language | Built-in, zero dependencies |
| Supabase SQL Editor | N/A | Run migration | Direct SQL execution on the database |

### Supporting

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `pg_advisory_xact_lock()` | Transaction-scoped advisory lock | Inside each trigger function to prevent race conditions |

## Architecture Patterns

### Recommended File Structure

```
sql/
  migration_creation_limits.sql     # Single migration file (all 7 triggers)

docs/
  error_documentation.md            # Error code reference with test queries
```

### Pattern 1: Per-User Count Trigger (Direct user_id)

**What:** BEFORE INSERT trigger on tables that have a direct `user_id` column (`templates`, `exercises`, `user_charts`).
**When to use:** Tables where the row being inserted contains the user_id directly.

```sql
CREATE OR REPLACE FUNCTION enforce_max_templates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Advisory lock prevents race condition on concurrent inserts
  PERFORM pg_advisory_xact_lock(hashtext('templates_' || NEW.user_id::text));

  SELECT COUNT(*) INTO current_count
  FROM templates
  WHERE user_id = NEW.user_id;

  IF current_count >= 20 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:templates:20'
      USING ERRCODE = 'LIM01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_templates ON templates;
CREATE TRIGGER trg_enforce_max_templates
  BEFORE INSERT ON templates
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_templates();
```

### Pattern 2: Per-Parent Count Trigger (Join required)

**What:** BEFORE INSERT trigger on child tables where user_id must be resolved through a parent join (`template_exercises`, `workout_log_exercises`).
**When to use:** Tables where the parent entity owns the limit scope.

```sql
CREATE OR REPLACE FUNCTION enforce_max_template_exercises()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Lock on the parent_id to prevent concurrent inserts to same parent
  PERFORM pg_advisory_xact_lock(hashtext('tmpl_ex_' || NEW.template_id::text));

  SELECT COUNT(*) INTO current_count
  FROM template_exercises
  WHERE template_id = NEW.template_id;

  IF current_count >= 15 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:template_exercises:15'
      USING ERRCODE = 'LIM04';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_template_exercises ON template_exercises;
CREATE TRIGGER trg_enforce_max_template_exercises
  BEFORE INSERT ON template_exercises
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_template_exercises();
```

### Pattern 3: Filtered Count Trigger (exercises with is_system filter)

**What:** BEFORE INSERT trigger where the COUNT must filter by a column value.
**When to use:** The `exercises` table, where system exercises are excluded from the user limit.

```sql
CREATE OR REPLACE FUNCTION enforce_max_user_exercises()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  -- Only enforce limit on user-created exercises
  IF NEW.is_system = true THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('exercises_' || NEW.user_id::text));

  SELECT COUNT(*) INTO current_count
  FROM exercises
  WHERE user_id = NEW.user_id
    AND is_system = false;

  IF current_count >= 50 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:exercises:50'
      USING ERRCODE = 'LIM02';
  END IF;

  RETURN NEW;
END;
$$;
```

### Trigger Function Naming Convention (Claude's Discretion)

**Recommendation:** `enforce_max_{entity}` for functions, `trg_enforce_max_{entity}` for triggers.

| Table | Function Name | Trigger Name |
|-------|--------------|-------------|
| `templates` | `enforce_max_templates` | `trg_enforce_max_templates` |
| `exercises` | `enforce_max_user_exercises` | `trg_enforce_max_user_exercises` |
| `user_charts` | `enforce_max_user_charts` | `trg_enforce_max_user_charts` |
| `template_exercises` | `enforce_max_template_exercises` | `trg_enforce_max_template_exercises` |
| `workout_log_exercises` | `enforce_max_workout_exercises` | `trg_enforce_max_workout_exercises` |
| `template_exercise_sets` | `enforce_max_template_sets` | `trg_enforce_max_template_sets` |
| `workout_log_sets` | `enforce_max_workout_sets` | `trg_enforce_max_workout_sets` |

### Error Code Assignment

| Code | Entity | Table | Limit |
|------|--------|-------|-------|
| `LIM01` | templates | `templates` | 20 |
| `LIM02` | exercises | `exercises` | 50 |
| `LIM03` | charts | `user_charts` | 25 |
| `LIM04` | template_exercises | `template_exercises` | 15 |
| `LIM05` | workout_exercises | `workout_log_exercises` | 15 |
| `LIM06` | template_sets | `template_exercise_sets` | 10 |
| `LIM07` | workout_sets | `workout_log_sets` | 10 |

### Anti-Patterns to Avoid

- **Using SECURITY DEFINER on trigger functions:** In Supabase, trigger functions created via SQL Editor run as the `postgres` superuser by default, which already bypasses RLS. The COUNT queries will see all rows regardless. The WHERE clauses on `user_id` / parent_id are essential to scope the count correctly. Do NOT add `SECURITY DEFINER` -- it is unnecessary and reduces security.
- **Counting rows with `SELECT COUNT(*) FROM table` (no WHERE clause):** This counts ALL rows in the table across all users. Always scope by `user_id` or parent FK.
- **Using `>` instead of `>=` in the comparison:** The count is of existing rows BEFORE the insert. If count is already at the limit (e.g., 20), the insert should be blocked. Use `>= limit`, not `> limit`.
- **Forgetting to RETURN NEW:** A BEFORE INSERT trigger MUST return NEW to allow the insert to proceed. Returning NULL cancels the insert silently.

## Advisory Lock Recommendation (Claude's Discretion)

**Decision: INCLUDE advisory locks.** Complexity is minimal (one line per function).

### Why Include

- Each trigger function adds exactly one line: `PERFORM pg_advisory_xact_lock(hashtext('prefix_' || id::text));`
- `pg_advisory_xact_lock` is transaction-scoped -- automatically released on commit/rollback, no cleanup needed
- `hashtext()` converts a string key to a bigint, providing human-readable lock keys
- While the single-user mobile app makes race conditions extremely unlikely, the lock costs near-zero in normal operation and provides correctness guarantees

### How It Works

1. Two concurrent INSERTs for the same user/parent arrive
2. First transaction acquires advisory lock, counts rows (e.g., 19), proceeds with insert
3. Second transaction blocks on advisory lock until first commits
4. Second transaction counts rows (now 20), raises exception
5. Without the lock, both transactions could count 19 and both proceed, exceeding the limit

### Lock Key Strategy

Use `hashtext('prefix_' || parent_id::text)` where prefix is a short identifier for the table. The `hashtext` function converts a string to a 32-bit integer, which is promoted to bigint for `pg_advisory_xact_lock`. Different prefixes ensure locks for different tables never collide.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Concurrency control | Custom locking mechanism | `pg_advisory_xact_lock()` | Built-in, transaction-scoped, automatic cleanup |
| Error code namespacing | Reuse existing PG error codes | Custom `LIMxx` SQLSTATE codes | Avoids collision with PostgreSQL's standard codes |
| Idempotent DDL | Conditional logic in app code | `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` | PostgreSQL native idempotency patterns |

## Common Pitfalls

### Pitfall 1: RLS Affecting COUNT Inside Triggers

**What goes wrong:** Trigger functions in Supabase run as the `postgres` superuser (when created via SQL Editor), which bypasses RLS entirely. The COUNT query sees ALL rows across all users.
**Why it happens:** Developers assume RLS filters the trigger's internal queries automatically.
**How to avoid:** Always include explicit `WHERE user_id = NEW.user_id` (or appropriate FK filter) in every COUNT query. Never rely on RLS inside trigger functions.
**Warning signs:** Trigger seems to fire too early (counts other users' rows) or too late (misses rows).

### Pitfall 2: Wrong Comparison Operator

**What goes wrong:** Using `> limit` instead of `>= limit` allows one extra row beyond the intended limit.
**Why it happens:** The COUNT is of rows that exist BEFORE the new row is inserted. If there are already 20 templates and you use `> 20`, the 21st insert passes the check.
**How to avoid:** Always use `IF current_count >= MAX_LIMIT THEN RAISE EXCEPTION`.
**Warning signs:** Users have limit + 1 rows in a table.

### Pitfall 3: Forgetting RETURN NEW

**What goes wrong:** The insert is silently cancelled without any error.
**Why it happens:** PL/pgSQL trigger functions must explicitly return NEW for BEFORE INSERT triggers. If the function returns NULL (or has no RETURN), the row is silently discarded.
**How to avoid:** Always end the function with `RETURN NEW;` after the limit check passes.
**Warning signs:** Inserts succeed (no error) but rows don't appear in the table.

### Pitfall 4: Incorrect Table Names

**What goes wrong:** Migration references non-existent tables.
**Why it happens:** The CONTEXT.md uses informal names (e.g., "workout_exercises") while the actual schema uses `workout_log_exercises` and `workout_log_sets`.
**How to avoid:** Always reference the actual schema in `sql/current_schema.sql`. The correct names are: `workout_log_exercises` (not `workout_exercises`), `workout_log_sets` (not `workout_exercise_sets`), `user_charts` (not `charts`).
**Warning signs:** SQL migration fails with "relation does not exist" error.

### Pitfall 5: Custom ERRCODE Format

**What goes wrong:** Using codes that conflict with PostgreSQL's standard error codes.
**Why it happens:** Choosing a prefix that overlaps with an existing PostgreSQL error class.
**How to avoid:** The `LI` prefix is safe -- PostgreSQL uses no error class starting with `LI`. The codes `LIM01` through `LIM07` are all valid 5-character SQLSTATE codes (uppercase letters and digits only, not `00000`, not ending in three zeros).
**Warning signs:** Error handlers in the app match unintended PostgreSQL errors.

### Pitfall 6: Exercises Trigger Firing for System Exercises

**What goes wrong:** System exercise bulk imports are blocked by the 50-exercise limit.
**Why it happens:** The trigger doesn't check `is_system` before counting.
**How to avoid:** Early-return (`IF NEW.is_system = true THEN RETURN NEW; END IF;`) before the count check. System exercises have `user_id = NULL` and `is_system = true`.
**Warning signs:** Seeding the ~800 system exercises fails after 50 rows.

## Code Examples

### Complete Per-User Trigger (templates)

```sql
-- Source: PostgreSQL docs + project schema analysis
CREATE OR REPLACE FUNCTION enforce_max_templates()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('templates_' || NEW.user_id::text));

  SELECT COUNT(*) INTO current_count
  FROM templates
  WHERE user_id = NEW.user_id;

  IF current_count >= 20 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:templates:20'
      USING ERRCODE = 'LIM01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_templates ON templates;
CREATE TRIGGER trg_enforce_max_templates
  BEFORE INSERT ON templates
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_templates();
```

### Complete Per-Parent Trigger with Join (workout_log_sets)

```sql
-- Source: PostgreSQL docs + project schema analysis
-- workout_log_sets.workout_log_exercise_id -> workout_log_exercises
-- Limit: 10 sets per exercise in a workout
CREATE OR REPLACE FUNCTION enforce_max_workout_sets()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('wk_sets_' || NEW.workout_log_exercise_id::text)
  );

  SELECT COUNT(*) INTO current_count
  FROM workout_log_sets
  WHERE workout_log_exercise_id = NEW.workout_log_exercise_id;

  IF current_count >= 10 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:workout_sets:10'
      USING ERRCODE = 'LIM07';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_workout_sets ON workout_log_sets;
CREATE TRIGGER trg_enforce_max_workout_sets
  BEFORE INSERT ON workout_log_sets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_workout_sets();
```

### Error Object in Supabase JS Client

When a trigger raises an exception, the Supabase JS client returns it in the error object:

```typescript
// Source: Existing codebase pattern (exercises.ts line 149)
const { data, error } = await supabase
  .from('templates')
  .insert({ user_id: userId, name: 'My Template' });

if (error) {
  // error.code contains the SQLSTATE/ERRCODE (e.g., 'LIM01')
  // error.message contains the exception message (e.g., 'LIMIT_EXCEEDED:templates:20')
  // error.details contains additional details (if provided)
  // error.hint contains hint text (if provided)
  console.log(error.code);    // 'LIM01'
  console.log(error.message); // 'LIMIT_EXCEEDED:templates:20'
}
```

This is confirmed by the existing codebase which already checks `error.code === '23505'` for unique constraint violations in `exercises.ts`.

### Verification Query Example

```sql
-- Test that template limit works by inserting 21 templates
-- (for docs/error_documentation.md)
DO $$
DECLARE
  test_user_id uuid := 'YOUR_TEST_USER_UUID';
  i integer;
BEGIN
  -- Clean up any existing test templates
  DELETE FROM templates WHERE user_id = test_user_id AND name LIKE 'Limit Test %';

  -- Insert 20 templates (should succeed)
  FOR i IN 1..20 LOOP
    INSERT INTO templates (user_id, name) VALUES (test_user_id, 'Limit Test ' || i);
  END LOOP;

  -- This 21st insert should fail with LIMIT_EXCEEDED:templates:20
  INSERT INTO templates (user_id, name) VALUES (test_user_id, 'Limit Test 21');

EXCEPTION
  WHEN SQLSTATE 'LIM01' THEN
    RAISE NOTICE 'SUCCESS: Template limit enforced correctly (LIM01)';
    -- Clean up
    DELETE FROM templates WHERE user_id = test_user_id AND name LIKE 'Limit Test %';
END;
$$;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER` | `CREATE OR REPLACE TRIGGER` | PostgreSQL 14 (2021) | Simpler idempotent migrations |
| `pg_advisory_lock` (session-scoped) | `pg_advisory_xact_lock` (transaction-scoped) | Long-standing, both available | Transaction-scoped is safer for triggers (auto-release) |

**Note:** The user explicitly requested `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`, which is perfectly valid and works on all PostgreSQL versions. This is the pattern to use.

## Open Questions

1. **Supabase PostgreSQL version for this project**
   - What we know: Supabase currently supports PostgreSQL 15 and 17. Both support all features needed.
   - What's unclear: Which exact version this project's Supabase instance runs.
   - Recommendation: The migration uses only standard PL/pgSQL features available since PostgreSQL 9.x. No version concern.

2. **Batch inserts and trigger behavior**
   - What we know: The `FOR EACH ROW` trigger fires once per row in a batch insert. If `supabase.from('template_exercise_sets').insert([set1, set2, set3])` is called, the trigger fires 3 times.
   - What's unclear: Whether any service functions currently insert more rows in a single batch than the limit allows (e.g., inserting 11+ sets at once).
   - Recommendation: Review service functions to ensure no batch insert exceeds limits. The templates service inserts 3 default sets (well under 10), so this is safe. The `createTemplate` function inserts exercises individually per template (well under 15).

3. **Error message field in Supabase PostgREST response**
   - What we know: The `error.code` field contains the SQLSTATE code. The `error.message` field contains the exception message text. This is confirmed by existing code that checks `error.code === '23505'`.
   - What's unclear: Whether the full `LIMIT_EXCEEDED:templates:20` message is returned verbatim or wrapped/truncated by PostgREST.
   - Recommendation: Test one trigger manually after deployment to confirm the exact error format. HIGH confidence that it works based on existing codebase patterns.

## Sources

### Primary (HIGH confidence)
- [PostgreSQL 18: Errors and Messages](https://www.postgresql.org/docs/current/plpgsql-errors-and-messages.html) - RAISE EXCEPTION syntax, custom ERRCODE format
- [PostgreSQL 18: Error Codes Appendix](https://www.postgresql.org/docs/current/errcodes-appendix.html) - SQLSTATE class allocation, `LI` prefix is unused
- [PostgreSQL 18: Advisory Locks](https://www.postgresql.org/docs/current/functions-admin.html#FUNCTIONS-ADVISORY-LOCKS) - `pg_advisory_xact_lock` function reference
- [PostgreSQL 18: CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html) - Trigger syntax, FOR EACH ROW
- [Supabase Triggers Documentation](https://supabase.com/docs/guides/database/postgres/triggers) - Trigger creation in Supabase context
- [PostgREST Error Reference](https://docs.postgrest.org/en/v12/references/errors.html) - Error response format from triggers
- Project schema: `sql/current_schema.sql` - Actual table names and column structures
- Existing codebase: `src/services/exercises.ts` line 149 - Confirms `error.code` contains SQLSTATE

### Secondary (MEDIUM confidence)
- [Supabase Discussion #7061](https://github.com/orgs/supabase/discussions/7061) - Trigger error propagation to JS client

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PostgreSQL PL/pgSQL triggers are extremely well-documented, stable since PostgreSQL 9.x
- Architecture: HIGH - Pattern is standard COUNT + RAISE EXCEPTION, verified against official docs
- Pitfalls: HIGH - Based on schema analysis, PostgreSQL documentation, and Supabase security model
- Advisory locks: HIGH - `pg_advisory_xact_lock` is well-documented, minimal complexity
- Error code format: HIGH - Custom SQLSTATE codes verified against PostgreSQL error code appendix, `LI` prefix confirmed unused

**Research date:** 2026-02-16
**Valid until:** 2026-06-16 (PostgreSQL trigger patterns are extremely stable)

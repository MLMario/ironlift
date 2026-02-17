# Database Error Code Reference

Custom PostgreSQL error codes used by IronLift's database triggers. These enforce creation limits as a database-level safety net.

**Important:** These are database-level limits only. Service-layer count-before-insert checks and user-facing error messages are planned for a future milestone.

---

## Quick Reference

| Code | Entity | Table | Limit | Scope | Error Message |
|------|--------|-------|-------|-------|---------------|
| LIM01 | templates | `templates` | 20 | per user | `LIMIT_EXCEEDED:templates:20` |
| LIM02 | exercises | `exercises` | 50 | per user (user-created only) | `LIMIT_EXCEEDED:exercises:50` |
| LIM03 | charts | `user_charts` | 25 | per user | `LIMIT_EXCEEDED:charts:25` |
| LIM04 | template_exercises | `template_exercises` | 15 | per template | `LIMIT_EXCEEDED:template_exercises:15` |
| LIM05 | workout_exercises | `workout_log_exercises` | 15 | per workout log | `LIMIT_EXCEEDED:workout_exercises:15` |
| LIM06 | template_sets | `template_exercise_sets` | 10 | per template exercise | `LIMIT_EXCEEDED:template_sets:10` |
| LIM07 | workout_sets | `workout_log_sets` | 10 | per workout log exercise | `LIMIT_EXCEEDED:workout_sets:10` |

---

## Detailed Error Codes

### LIM01 -- Templates per User

- **Code:** `LIM01`
- **Entity:** templates
- **Limit:** 20 per user
- **Trigger function:** `enforce_max_templates()`
- **Table:** `templates`
- **Scope column:** `user_id`
- **Error message:** `LIMIT_EXCEEDED:templates:20`

### LIM02 -- User-Created Exercises per User

- **Code:** `LIM02`
- **Entity:** exercises
- **Limit:** 50 per user (system exercises with `is_system = true` bypass this trigger entirely)
- **Trigger function:** `enforce_max_user_exercises()`
- **Table:** `exercises`
- **Scope column:** `user_id`
- **Count filter:** `is_system = false`
- **Error message:** `LIMIT_EXCEEDED:exercises:50`

### LIM03 -- Charts per User

- **Code:** `LIM03`
- **Entity:** charts
- **Limit:** 25 per user
- **Trigger function:** `enforce_max_user_charts()`
- **Table:** `user_charts`
- **Scope column:** `user_id`
- **Error message:** `LIMIT_EXCEEDED:charts:25`

### LIM04 -- Exercises per Template

- **Code:** `LIM04`
- **Entity:** template_exercises
- **Limit:** 15 per template
- **Trigger function:** `enforce_max_template_exercises()`
- **Table:** `template_exercises`
- **Scope column:** `template_id`
- **Error message:** `LIMIT_EXCEEDED:template_exercises:15`

### LIM05 -- Exercises per Workout Log

- **Code:** `LIM05`
- **Entity:** workout_exercises
- **Limit:** 15 per workout log
- **Trigger function:** `enforce_max_workout_exercises()`
- **Table:** `workout_log_exercises`
- **Scope column:** `workout_log_id`
- **Error message:** `LIMIT_EXCEEDED:workout_exercises:15`

### LIM06 -- Sets per Template Exercise

- **Code:** `LIM06`
- **Entity:** template_sets
- **Limit:** 10 per template exercise
- **Trigger function:** `enforce_max_template_sets()`
- **Table:** `template_exercise_sets`
- **Scope column:** `template_exercise_id`
- **Error message:** `LIMIT_EXCEEDED:template_sets:10`

### LIM07 -- Sets per Workout Log Exercise

- **Code:** `LIM07`
- **Entity:** workout_sets
- **Limit:** 10 per workout log exercise
- **Trigger function:** `enforce_max_workout_sets()`
- **Table:** `workout_log_sets`
- **Scope column:** `workout_log_exercise_id`
- **Error message:** `LIMIT_EXCEEDED:workout_sets:10`

---

## Supabase JS Client Error Format

When a trigger fires and raises an exception, the Supabase JS client returns an error object with:

- `error.code` -- contains the custom ERRCODE (e.g., `'LIM01'`)
- `error.message` -- contains the exception message (e.g., `'LIMIT_EXCEEDED:templates:20'`)

**Example usage in service code:**

```typescript
const { data, error } = await supabase
  .from('templates')
  .insert({ user_id: userId, name: 'New Template' });

if (error) {
  if (error.code === 'LIM01') {
    // Template limit reached -- error.message is 'LIMIT_EXCEEDED:templates:20'
    console.error('Maximum templates reached');
    return { data: null, error: 'LIMIT_REACHED' };
  }
  // Handle other errors
}
```

**Existing pattern:** The codebase already checks `error.code === '23505'` for unique constraint violations in `src/services/exercises.ts`. The limit error codes follow the same pattern.

**Parsing the error message:**

```typescript
// error.message = 'LIMIT_EXCEEDED:templates:20'
const parts = error.message.split(':');
// parts[0] = 'LIMIT_EXCEEDED'
// parts[1] = 'templates'       (entity name)
// parts[2] = '20'              (max limit)
```

---

## Test Queries

Run these in the Supabase SQL Editor to verify each trigger works correctly. Each test inserts rows up to the limit, attempts one more (which should fail), and cleans up.

**Before running:** Replace `YOUR_TEST_USER_UUID` with an actual user ID from your `auth.users` table.

### Test LIM01 -- Templates (20 per user)

```sql
DO $$
DECLARE
  test_user_id uuid := 'YOUR_TEST_USER_UUID';
  i integer;
BEGIN
  -- Insert 20 templates (should succeed)
  FOR i IN 1..20 LOOP
    INSERT INTO templates (user_id, name)
    VALUES (test_user_id, 'Test Template ' || i);
  END LOOP;

  -- Attempt 21st insert (should fail with LIM01)
  BEGIN
    INSERT INTO templates (user_id, name)
    VALUES (test_user_id, 'Test Template 21');
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN SQLSTATE 'LIM01' THEN
      RAISE NOTICE 'SUCCESS: LIM01 triggered -- LIMIT_EXCEEDED:templates:20';
  END;

  -- Cleanup
  DELETE FROM templates WHERE user_id = test_user_id AND name LIKE 'Test Template %';
END;
$$;
```

### Test LIM02 -- User Exercises (50 per user)

```sql
DO $$
DECLARE
  test_user_id uuid := 'YOUR_TEST_USER_UUID';
  i integer;
BEGIN
  -- Insert 50 user exercises (should succeed)
  FOR i IN 1..50 LOOP
    INSERT INTO exercises (user_id, name, category, is_system)
    VALUES (test_user_id, 'Test Exercise ' || i, 'Other', false);
  END LOOP;

  -- Attempt 51st insert (should fail with LIM02)
  BEGIN
    INSERT INTO exercises (user_id, name, category, is_system)
    VALUES (test_user_id, 'Test Exercise 51', 'Other', false);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN SQLSTATE 'LIM02' THEN
      RAISE NOTICE 'SUCCESS: LIM02 triggered -- LIMIT_EXCEEDED:exercises:50';
  END;

  -- Verify system exercises bypass the trigger
  INSERT INTO exercises (name, category, is_system)
  VALUES ('System Exercise Test', 'Other', true);
  RAISE NOTICE 'SUCCESS: System exercise bypassed trigger';
  DELETE FROM exercises WHERE name = 'System Exercise Test' AND is_system = true;

  -- Cleanup
  DELETE FROM exercises WHERE user_id = test_user_id AND name LIKE 'Test Exercise %';
END;
$$;
```

### Test LIM03 -- Charts (25 per user)

```sql
DO $$
DECLARE
  test_user_id uuid := 'YOUR_TEST_USER_UUID';
  test_exercise_id uuid;
  i integer;
BEGIN
  -- Create a test exercise to reference
  INSERT INTO exercises (user_id, name, category, is_system)
  VALUES (test_user_id, 'Chart Test Exercise', 'Other', false)
  RETURNING id INTO test_exercise_id;

  -- Insert 25 charts (should succeed)
  FOR i IN 1..25 LOOP
    INSERT INTO user_charts (user_id, exercise_id, metric_type, x_axis_mode, "order")
    VALUES (test_user_id, test_exercise_id, 'total_sets', 'date', i);
  END LOOP;

  -- Attempt 26th insert (should fail with LIM03)
  BEGIN
    INSERT INTO user_charts (user_id, exercise_id, metric_type, x_axis_mode, "order")
    VALUES (test_user_id, test_exercise_id, 'total_sets', 'date', 26);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN SQLSTATE 'LIM03' THEN
      RAISE NOTICE 'SUCCESS: LIM03 triggered -- LIMIT_EXCEEDED:charts:25';
  END;

  -- Cleanup
  DELETE FROM user_charts WHERE user_id = test_user_id AND exercise_id = test_exercise_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

### Test LIM04 -- Template Exercises (15 per template)

```sql
DO $$
DECLARE
  test_user_id uuid := 'YOUR_TEST_USER_UUID';
  test_template_id uuid;
  test_exercise_id uuid;
  i integer;
BEGIN
  -- Create parent records
  INSERT INTO templates (user_id, name)
  VALUES (test_user_id, 'Limit Test Template')
  RETURNING id INTO test_template_id;

  INSERT INTO exercises (user_id, name, category, is_system)
  VALUES (test_user_id, 'Limit Test Exercise', 'Other', false)
  RETURNING id INTO test_exercise_id;

  -- Insert 15 template exercises (should succeed)
  FOR i IN 1..15 LOOP
    INSERT INTO template_exercises (template_id, exercise_id, "order")
    VALUES (test_template_id, test_exercise_id, i);
  END LOOP;

  -- Attempt 16th insert (should fail with LIM04)
  BEGIN
    INSERT INTO template_exercises (template_id, exercise_id, "order")
    VALUES (test_template_id, test_exercise_id, 16);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN SQLSTATE 'LIM04' THEN
      RAISE NOTICE 'SUCCESS: LIM04 triggered -- LIMIT_EXCEEDED:template_exercises:15';
  END;

  -- Cleanup
  DELETE FROM template_exercises WHERE template_id = test_template_id;
  DELETE FROM templates WHERE id = test_template_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

### Test LIM05 -- Workout Log Exercises (15 per workout log)

```sql
DO $$
DECLARE
  test_user_id uuid := 'YOUR_TEST_USER_UUID';
  test_workout_id uuid;
  test_exercise_id uuid;
  i integer;
BEGIN
  -- Create parent records
  INSERT INTO workout_logs (user_id, started_at)
  VALUES (test_user_id, now())
  RETURNING id INTO test_workout_id;

  INSERT INTO exercises (user_id, name, category, is_system)
  VALUES (test_user_id, 'WK Limit Test Exercise', 'Other', false)
  RETURNING id INTO test_exercise_id;

  -- Insert 15 workout log exercises (should succeed)
  FOR i IN 1..15 LOOP
    INSERT INTO workout_log_exercises (workout_log_id, exercise_id, rest_seconds, "order")
    VALUES (test_workout_id, test_exercise_id, 60, i);
  END LOOP;

  -- Attempt 16th insert (should fail with LIM05)
  BEGIN
    INSERT INTO workout_log_exercises (workout_log_id, exercise_id, rest_seconds, "order")
    VALUES (test_workout_id, test_exercise_id, 60, 16);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN SQLSTATE 'LIM05' THEN
      RAISE NOTICE 'SUCCESS: LIM05 triggered -- LIMIT_EXCEEDED:workout_exercises:15';
  END;

  -- Cleanup
  DELETE FROM workout_log_exercises WHERE workout_log_id = test_workout_id;
  DELETE FROM workout_logs WHERE id = test_workout_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

### Test LIM06 -- Template Exercise Sets (10 per template exercise)

```sql
DO $$
DECLARE
  test_user_id uuid := 'YOUR_TEST_USER_UUID';
  test_template_id uuid;
  test_exercise_id uuid;
  test_template_exercise_id uuid;
  i integer;
BEGIN
  -- Create parent records
  INSERT INTO templates (user_id, name)
  VALUES (test_user_id, 'Sets Limit Test Template')
  RETURNING id INTO test_template_id;

  INSERT INTO exercises (user_id, name, category, is_system)
  VALUES (test_user_id, 'Sets Limit Test Exercise', 'Other', false)
  RETURNING id INTO test_exercise_id;

  INSERT INTO template_exercises (template_id, exercise_id, "order")
  VALUES (test_template_id, test_exercise_id, 1)
  RETURNING id INTO test_template_exercise_id;

  -- Insert 10 sets (should succeed)
  FOR i IN 1..10 LOOP
    INSERT INTO template_exercise_sets (template_exercise_id, set_number)
    VALUES (test_template_exercise_id, i);
  END LOOP;

  -- Attempt 11th insert (should fail with LIM06)
  BEGIN
    INSERT INTO template_exercise_sets (template_exercise_id, set_number)
    VALUES (test_template_exercise_id, 11);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN SQLSTATE 'LIM06' THEN
      RAISE NOTICE 'SUCCESS: LIM06 triggered -- LIMIT_EXCEEDED:template_sets:10';
  END;

  -- Cleanup
  DELETE FROM template_exercise_sets WHERE template_exercise_id = test_template_exercise_id;
  DELETE FROM template_exercises WHERE id = test_template_exercise_id;
  DELETE FROM templates WHERE id = test_template_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

### Test LIM07 -- Workout Log Sets (10 per workout log exercise)

```sql
DO $$
DECLARE
  test_user_id uuid := 'YOUR_TEST_USER_UUID';
  test_workout_id uuid;
  test_exercise_id uuid;
  test_workout_exercise_id uuid;
  i integer;
BEGIN
  -- Create parent records
  INSERT INTO workout_logs (user_id, started_at)
  VALUES (test_user_id, now())
  RETURNING id INTO test_workout_id;

  INSERT INTO exercises (user_id, name, category, is_system)
  VALUES (test_user_id, 'WK Sets Limit Test Exercise', 'Other', false)
  RETURNING id INTO test_exercise_id;

  INSERT INTO workout_log_exercises (workout_log_id, exercise_id, rest_seconds, "order")
  VALUES (test_workout_id, test_exercise_id, 60, 1)
  RETURNING id INTO test_workout_exercise_id;

  -- Insert 10 sets (should succeed)
  FOR i IN 1..10 LOOP
    INSERT INTO workout_log_sets (workout_log_exercise_id, set_number)
    VALUES (test_workout_exercise_id, i);
  END LOOP;

  -- Attempt 11th insert (should fail with LIM07)
  BEGIN
    INSERT INTO workout_log_sets (workout_log_exercise_id, set_number)
    VALUES (test_workout_exercise_id, 11);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN SQLSTATE 'LIM07' THEN
      RAISE NOTICE 'SUCCESS: LIM07 triggered -- LIMIT_EXCEEDED:workout_sets:10';
  END;

  -- Cleanup
  DELETE FROM workout_log_sets WHERE workout_log_exercise_id = test_workout_exercise_id;
  DELETE FROM workout_log_exercises WHERE id = test_workout_exercise_id;
  DELETE FROM workout_logs WHERE id = test_workout_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

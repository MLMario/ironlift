# Database Error Code Reference

Custom PostgreSQL trigger errors used by IronLift's database triggers. These enforce creation limits as a database-level safety net.

**Important:** These are database-level limits only. Service-layer count-before-insert checks and user-facing error messages are planned for a future milestone.

---

## Quick Reference

All triggers use standard SQLSTATE `P0001` (raise_exception). Identify the specific limit by parsing the structured error message.

| Entity | Table | Limit | Scope | Error Message |
|--------|-------|-------|-------|---------------|
| templates | `templates` | 20 | per user | `LIMIT_EXCEEDED:templates:20` |
| exercises | `exercises` | 50 | per user (user-created only) | `LIMIT_EXCEEDED:exercises:50` |
| charts | `user_charts` | 25 | per user | `LIMIT_EXCEEDED:charts:25` |
| template_exercises | `template_exercises` | 15 | per template | `LIMIT_EXCEEDED:template_exercises:15` |
| workout_exercises | `workout_log_exercises` | 15 | per workout log | `LIMIT_EXCEEDED:workout_exercises:15` |
| template_sets | `template_exercise_sets` | 10 | per template exercise | `LIMIT_EXCEEDED:template_sets:10` |
| workout_sets | `workout_log_sets` | 10 | per workout log exercise | `LIMIT_EXCEEDED:workout_sets:10` |

---

## Detailed Error Codes

### Templates per User

- **Limit:** 20 per user
- **Trigger function:** `enforce_max_templates()`
- **Table:** `templates`
- **Scope column:** `user_id`
- **Error message:** `LIMIT_EXCEEDED:templates:20`

### User-Created Exercises per User

- **Limit:** 50 per user (system exercises with `is_system = true` bypass this trigger entirely)
- **Trigger function:** `enforce_max_user_exercises()`
- **Table:** `exercises`
- **Scope column:** `user_id`
- **Count filter:** `is_system = false`
- **Error message:** `LIMIT_EXCEEDED:exercises:50`

### Charts per User

- **Limit:** 25 per user
- **Trigger function:** `enforce_max_user_charts()`
- **Table:** `user_charts`
- **Scope column:** `user_id`
- **Error message:** `LIMIT_EXCEEDED:charts:25`

### Exercises per Template

- **Limit:** 15 per template
- **Trigger function:** `enforce_max_template_exercises()`
- **Table:** `template_exercises`
- **Scope column:** `template_id`
- **Error message:** `LIMIT_EXCEEDED:template_exercises:15`

### Exercises per Workout Log

- **Limit:** 15 per workout log
- **Trigger function:** `enforce_max_workout_exercises()`
- **Table:** `workout_log_exercises`
- **Scope column:** `workout_log_id`
- **Error message:** `LIMIT_EXCEEDED:workout_exercises:15`

### Sets per Template Exercise

- **Limit:** 10 per template exercise
- **Trigger function:** `enforce_max_template_sets()`
- **Table:** `template_exercise_sets`
- **Scope column:** `template_exercise_id`
- **Error message:** `LIMIT_EXCEEDED:template_sets:10`

### Sets per Workout Log Exercise

- **Limit:** 10 per workout log exercise
- **Trigger function:** `enforce_max_workout_sets()`
- **Table:** `workout_log_sets`
- **Scope column:** `workout_log_exercise_id`
- **Error message:** `LIMIT_EXCEEDED:workout_sets:10`

---

## Supabase JS Client Error Format

When a trigger fires and raises an exception, the Supabase JS client returns an error object with:

- `error.code` -- contains `'P0001'` (standard raise_exception SQLSTATE)
- `error.message` -- contains the structured message (e.g., `'LIMIT_EXCEEDED:templates:20'`)

**Detecting limit errors by message prefix:**

```typescript
const { data, error } = await supabase
  .from('templates')
  .insert({ user_id: userId, name: 'New Template' });

if (error) {
  if (error.message?.startsWith('LIMIT_EXCEEDED:')) {
    // Parse: LIMIT_EXCEEDED:{entity}:{max_limit}
    const parts = error.message.split(':');
    const entity = parts[1];  // 'templates'
    const limit = parts[2];   // '20'
    console.error(`Maximum ${entity} reached (limit: ${limit})`);
    return { data: null, error: 'LIMIT_REACHED' };
  }
  // Handle other errors
}
```

**Existing pattern:** The codebase already checks `error.code === '23505'` for unique constraint violations in `src/services/exercises.ts`. Limit errors use a different detection approach -- check `error.message` prefix instead of `error.code`, since all limits share the same `P0001` SQLSTATE.

---

## Test Queries

Run these in the Supabase SQL Editor to verify each trigger works correctly. Each test inserts rows up to the limit, attempts one more (which should fail), and cleans up.

**Before running:** Replace `YOUR_TEST_USER_UUID` with an actual user ID from your `auth.users` table.

### Test Templates (20 per user)

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

  -- Attempt 21st insert (should fail)
  BEGIN
    INSERT INTO templates (user_id, name)
    VALUES (test_user_id, 'Test Template 21');
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'LIMIT_EXCEEDED:templates:%' THEN
        RAISE NOTICE 'SUCCESS: Template limit enforced -- %', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  -- Cleanup
  DELETE FROM templates WHERE user_id = test_user_id AND name LIKE 'Test Template %';
END;
$$;
```

### Test User Exercises (50 per user)

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

  -- Attempt 51st insert (should fail)
  BEGIN
    INSERT INTO exercises (user_id, name, category, is_system)
    VALUES (test_user_id, 'Test Exercise 51', 'Other', false);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'LIMIT_EXCEEDED:exercises:%' THEN
        RAISE NOTICE 'SUCCESS: Exercise limit enforced -- %', SQLERRM;
      ELSE
        RAISE;
      END IF;
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

### Test Charts (25 per user)

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

  -- Attempt 26th insert (should fail)
  BEGIN
    INSERT INTO user_charts (user_id, exercise_id, metric_type, x_axis_mode, "order")
    VALUES (test_user_id, test_exercise_id, 'total_sets', 'date', 26);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'LIMIT_EXCEEDED:charts:%' THEN
        RAISE NOTICE 'SUCCESS: Chart limit enforced -- %', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  -- Cleanup
  DELETE FROM user_charts WHERE user_id = test_user_id AND exercise_id = test_exercise_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

### Test Template Exercises (15 per template)

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

  -- Attempt 16th insert (should fail)
  BEGIN
    INSERT INTO template_exercises (template_id, exercise_id, "order")
    VALUES (test_template_id, test_exercise_id, 16);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'LIMIT_EXCEEDED:template_exercises:%' THEN
        RAISE NOTICE 'SUCCESS: Template exercise limit enforced -- %', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  -- Cleanup
  DELETE FROM template_exercises WHERE template_id = test_template_id;
  DELETE FROM templates WHERE id = test_template_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

### Test Workout Log Exercises (15 per workout log)

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

  -- Attempt 16th insert (should fail)
  BEGIN
    INSERT INTO workout_log_exercises (workout_log_id, exercise_id, rest_seconds, "order")
    VALUES (test_workout_id, test_exercise_id, 60, 16);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'LIMIT_EXCEEDED:workout_exercises:%' THEN
        RAISE NOTICE 'SUCCESS: Workout exercise limit enforced -- %', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  -- Cleanup
  DELETE FROM workout_log_exercises WHERE workout_log_id = test_workout_id;
  DELETE FROM workout_logs WHERE id = test_workout_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

### Test Template Exercise Sets (10 per template exercise)

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

  -- Attempt 11th insert (should fail)
  BEGIN
    INSERT INTO template_exercise_sets (template_exercise_id, set_number)
    VALUES (test_template_exercise_id, 11);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'LIMIT_EXCEEDED:template_sets:%' THEN
        RAISE NOTICE 'SUCCESS: Template set limit enforced -- %', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  -- Cleanup
  DELETE FROM template_exercise_sets WHERE template_exercise_id = test_template_exercise_id;
  DELETE FROM template_exercises WHERE id = test_template_exercise_id;
  DELETE FROM templates WHERE id = test_template_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

### Test Workout Log Sets (10 per workout log exercise)

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

  -- Attempt 11th insert (should fail)
  BEGIN
    INSERT INTO workout_log_sets (workout_log_exercise_id, set_number)
    VALUES (test_workout_exercise_id, 11);
    RAISE NOTICE 'FAIL: Insert should have been rejected';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM LIKE 'LIMIT_EXCEEDED:workout_sets:%' THEN
        RAISE NOTICE 'SUCCESS: Workout set limit enforced -- %', SQLERRM;
      ELSE
        RAISE;
      END IF;
  END;

  -- Cleanup
  DELETE FROM workout_log_sets WHERE workout_log_exercise_id = test_workout_exercise_id;
  DELETE FROM workout_log_exercises WHERE id = test_workout_exercise_id;
  DELETE FROM workout_logs WHERE id = test_workout_id;
  DELETE FROM exercises WHERE id = test_exercise_id;
END;
$$;
```

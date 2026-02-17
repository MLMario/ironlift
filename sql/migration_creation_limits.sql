-- Migration: Database Creation Limits
-- Description: Enforces maximum row counts via BEFORE INSERT triggers
-- Date: 2026-02-17
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- This migration creates 7 trigger functions and 7 triggers that enforce
-- creation limits as a database-level safety net.
--
-- Idempotent: Uses CREATE OR REPLACE FUNCTION + DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- Safe to re-run at any time.
--
-- Limits enforced:
--   templates              20 per user
--   exercises (user-only)  50 per user (system exercises bypass)
--   user_charts            25 per user
--   template_exercises     15 per template
--   workout_log_exercises  15 per workout log
--   template_exercise_sets 10 per template exercise
--   workout_log_sets       10 per workout log exercise
--
-- Error format: LIMIT_EXCEEDED:{entity}:{max_limit}
-- All triggers use ERRCODE P0001 (raise_exception); identify by message prefix

-- ============================================
-- 1. Table: templates
-- Limit: 20 per user
-- Error: LIMIT_EXCEEDED:templates:20 (ERRCODE: P0001)
-- ============================================

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
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_templates ON templates;
CREATE TRIGGER trg_enforce_max_templates
  BEFORE INSERT ON templates
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_templates();

-- ============================================
-- 2. Table: exercises
-- Limit: 50 user-created exercises per user
-- Error: LIMIT_EXCEEDED:exercises:50 (ERRCODE: P0001)
-- Note: System exercises (is_system = true) bypass this trigger entirely
-- ============================================

CREATE OR REPLACE FUNCTION enforce_max_user_exercises()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  IF NEW.is_system = true THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('exercises_' || NEW.user_id::text));

  SELECT COUNT(*) INTO current_count
  FROM exercises
  WHERE user_id = NEW.user_id AND is_system = false;

  IF current_count >= 50 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:exercises:50'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_user_exercises ON exercises;
CREATE TRIGGER trg_enforce_max_user_exercises
  BEFORE INSERT ON exercises
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_user_exercises();

-- ============================================
-- 3. Table: user_charts
-- Limit: 25 per user
-- Error: LIMIT_EXCEEDED:charts:25 (ERRCODE: P0001)
-- ============================================

CREATE OR REPLACE FUNCTION enforce_max_user_charts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('charts_' || NEW.user_id::text));

  SELECT COUNT(*) INTO current_count
  FROM user_charts
  WHERE user_id = NEW.user_id;

  IF current_count >= 25 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:charts:25'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_user_charts ON user_charts;
CREATE TRIGGER trg_enforce_max_user_charts
  BEFORE INSERT ON user_charts
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_user_charts();

-- ============================================
-- 4. Table: template_exercises
-- Limit: 15 per template
-- Error: LIMIT_EXCEEDED:template_exercises:15 (ERRCODE: P0001)
-- ============================================

CREATE OR REPLACE FUNCTION enforce_max_template_exercises()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tmpl_ex_' || NEW.template_id::text));

  SELECT COUNT(*) INTO current_count
  FROM template_exercises
  WHERE template_id = NEW.template_id;

  IF current_count >= 15 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:template_exercises:15'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_template_exercises ON template_exercises;
CREATE TRIGGER trg_enforce_max_template_exercises
  BEFORE INSERT ON template_exercises
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_template_exercises();

-- ============================================
-- 5. Table: workout_log_exercises
-- Limit: 15 per workout log
-- Error: LIMIT_EXCEEDED:workout_exercises:15 (ERRCODE: P0001)
-- ============================================

CREATE OR REPLACE FUNCTION enforce_max_workout_exercises()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('wk_ex_' || NEW.workout_log_id::text));

  SELECT COUNT(*) INTO current_count
  FROM workout_log_exercises
  WHERE workout_log_id = NEW.workout_log_id;

  IF current_count >= 15 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:workout_exercises:15'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_workout_exercises ON workout_log_exercises;
CREATE TRIGGER trg_enforce_max_workout_exercises
  BEFORE INSERT ON workout_log_exercises
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_workout_exercises();

-- ============================================
-- 6. Table: template_exercise_sets
-- Limit: 10 per template exercise
-- Error: LIMIT_EXCEEDED:template_sets:10 (ERRCODE: P0001)
-- ============================================

CREATE OR REPLACE FUNCTION enforce_max_template_sets()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('tmpl_sets_' || NEW.template_exercise_id::text));

  SELECT COUNT(*) INTO current_count
  FROM template_exercise_sets
  WHERE template_exercise_id = NEW.template_exercise_id;

  IF current_count >= 10 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:template_sets:10'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_template_sets ON template_exercise_sets;
CREATE TRIGGER trg_enforce_max_template_sets
  BEFORE INSERT ON template_exercise_sets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_template_sets();

-- ============================================
-- 7. Table: workout_log_sets
-- Limit: 10 per workout log exercise
-- Error: LIMIT_EXCEEDED:workout_sets:10 (ERRCODE: P0001)
-- ============================================

CREATE OR REPLACE FUNCTION enforce_max_workout_sets()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('wk_sets_' || NEW.workout_log_exercise_id::text));

  SELECT COUNT(*) INTO current_count
  FROM workout_log_sets
  WHERE workout_log_exercise_id = NEW.workout_log_exercise_id;

  IF current_count >= 10 THEN
    RAISE EXCEPTION 'LIMIT_EXCEEDED:workout_sets:10'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_workout_sets ON workout_log_sets;
CREATE TRIGGER trg_enforce_max_workout_sets
  BEFORE INSERT ON workout_log_sets
  FOR EACH ROW
  EXECUTE FUNCTION enforce_max_workout_sets();

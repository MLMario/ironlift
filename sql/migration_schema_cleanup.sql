-- Migration: Schema Cleanup - Full Normalization
-- Date: 2026-01-11
-- Purpose: Remove redundant aggregate columns and normalize rest_seconds storage

-- ============================================
-- PHASE 1: Clean workout_log_exercises table
-- ============================================

-- Remove redundant aggregate columns (data now comes from workout_log_sets)
ALTER TABLE workout_log_exercises
  DROP COLUMN IF EXISTS sets_completed,
  DROP COLUMN IF EXISTS reps,
  DROP COLUMN IF EXISTS weight,
  DROP COLUMN IF EXISTS is_done;

-- Add rest_seconds at exercise level (moved from per-set)
-- First check if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_log_exercises'
    AND column_name = 'rest_seconds'
  ) THEN
    ALTER TABLE workout_log_exercises
      ADD COLUMN rest_seconds integer NOT NULL DEFAULT 60;
  END IF;
END $$;

-- ============================================
-- PHASE 2: Clean workout_log_sets table
-- ============================================

-- Remove rest_seconds from sets (now stored at exercise level)
ALTER TABLE workout_log_sets
  DROP COLUMN IF EXISTS rest_seconds;

-- ============================================
-- PHASE 3: Clean template_exercises table
-- ============================================

-- Remove redundant default columns (data now comes from template_exercise_sets)
ALTER TABLE template_exercises
  DROP COLUMN IF EXISTS default_sets,
  DROP COLUMN IF EXISTS default_reps,
  DROP COLUMN IF EXISTS default_weight;

-- ============================================
-- PHASE 4: Update user_charts metric constraint
-- ============================================

-- Update constraint to use new metric name
ALTER TABLE user_charts
  DROP CONSTRAINT IF EXISTS user_charts_metric_type_check;

ALTER TABLE user_charts
  ADD CONSTRAINT user_charts_metric_type_check
  CHECK (metric_type = ANY (ARRAY['total_sets'::text, 'max_volume_set'::text]));

-- Update any existing charts with old metric name
UPDATE user_charts
  SET metric_type = 'max_volume_set'
  WHERE metric_type = 'max_volume';

-- ============================================
-- VERIFICATION: Show final schema
-- ============================================

-- To verify the migration, run these queries:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workout_log_exercises';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'workout_log_sets';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'template_exercises';

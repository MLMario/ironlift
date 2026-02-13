-- Migration: Per-Set Tracking
-- Description: Adds support for tracking individual sets instead of aggregate per-exercise data
-- Date: 2026-01-10
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- This migration is backwards compatible - existing data will continue to work

-- ============================================
-- STEP 1: Create workout_log_sets table
-- ============================================

-- This table stores individual set data for each exercise in a workout
CREATE TABLE IF NOT EXISTS workout_log_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_log_exercise_id UUID NOT NULL REFERENCES workout_log_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight DECIMAL(10, 2) DEFAULT 0,
  reps INTEGER DEFAULT 0,
  rest_seconds INTEGER DEFAULT 60,
  is_done BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique set numbers per exercise
  UNIQUE (workout_log_exercise_id, set_number)
);

-- Add comment for documentation
COMMENT ON TABLE workout_log_sets IS 'Individual set data for workout log exercises. Enables per-set tracking of weight, reps, and completion status.';
COMMENT ON COLUMN workout_log_sets.set_number IS 'Sequential number of the set within the exercise (1, 2, 3...).';

-- ============================================
-- STEP 2: Enable Row Level Security
-- ============================================

ALTER TABLE workout_log_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access sets from their own workout logs
-- Uses a join path: workout_log_sets -> workout_log_exercises -> workout_logs -> user_id
CREATE POLICY "Users can view their own workout sets"
ON workout_log_sets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workout_log_exercises wle
    JOIN workout_logs wl ON wl.id = wle.workout_log_id
    WHERE wle.id = workout_log_sets.workout_log_exercise_id
    AND wl.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own workout sets"
ON workout_log_sets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_log_exercises wle
    JOIN workout_logs wl ON wl.id = wle.workout_log_id
    WHERE wle.id = workout_log_sets.workout_log_exercise_id
    AND wl.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own workout sets"
ON workout_log_sets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM workout_log_exercises wle
    JOIN workout_logs wl ON wl.id = wle.workout_log_id
    WHERE wle.id = workout_log_sets.workout_log_exercise_id
    AND wl.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own workout sets"
ON workout_log_sets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM workout_log_exercises wle
    JOIN workout_logs wl ON wl.id = wle.workout_log_id
    WHERE wle.id = workout_log_sets.workout_log_exercise_id
    AND wl.user_id = auth.uid()
  )
);

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

-- Index for faster lookups by exercise
CREATE INDEX IF NOT EXISTS idx_workout_log_sets_exercise
ON workout_log_sets(workout_log_exercise_id);

-- Composite index for common query pattern (exercise + completion status)
CREATE INDEX IF NOT EXISTS idx_workout_log_sets_exercise_done
ON workout_log_sets(workout_log_exercise_id, is_done);

-- ============================================
-- STEP 4: Metrics helper functions
-- ============================================
-- These functions can be used for efficient metrics queries

-- Function to get total completed sets for an exercise
CREATE OR REPLACE FUNCTION get_exercise_total_sets(
  p_exercise_id UUID,
  p_user_id UUID,
  p_since TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(COUNT(wls.id)::INTEGER, 0)
  FROM workout_log_sets wls
  JOIN workout_log_exercises wle ON wle.id = wls.workout_log_exercise_id
  JOIN workout_logs wl ON wl.id = wle.workout_log_id
  WHERE wle.exercise_id = p_exercise_id
    AND wl.user_id = p_user_id
    AND wls.is_done = true
    AND (p_since IS NULL OR wl.started_at >= p_since);
$$;

-- Function to get max volume (weight * reps) for an exercise
CREATE OR REPLACE FUNCTION get_exercise_max_volume(
  p_exercise_id UUID,
  p_user_id UUID,
  p_since TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(MAX(wls.weight * wls.reps), 0)
  FROM workout_log_sets wls
  JOIN workout_log_exercises wle ON wle.id = wls.workout_log_exercise_id
  JOIN workout_logs wl ON wl.id = wle.workout_log_id
  WHERE wle.exercise_id = p_exercise_id
    AND wl.user_id = p_user_id
    AND wls.is_done = true
    AND (p_since IS NULL OR wl.started_at >= p_since);
$$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify everything is set up correctly

-- Check table exists
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'workout_log_sets');

-- Check RLS is enabled
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'workout_log_sets';

-- Check policies exist
-- SELECT policyname FROM pg_policies WHERE tablename = 'workout_log_sets';

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- Uncomment and run these if you need to undo the migration

/*
DROP FUNCTION IF EXISTS get_exercise_max_volume;
DROP FUNCTION IF EXISTS get_exercise_total_sets;
DROP TABLE IF EXISTS workout_log_sets;
*/

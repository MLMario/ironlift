-- Migration: System Exercises Support
-- Description: Enables pre-created exercise library with ~800 system exercises
-- Date: 2026-02-01
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- This migration modifies the exercises table to support both user-created
-- and system (pre-created) exercises with updated RLS policies.

-- ============================================
-- STEP 1: Alter exercises table schema
-- ============================================

-- Allow NULL user_id for system exercises
ALTER TABLE public.exercises ALTER COLUMN user_id DROP NOT NULL;

-- Add new columns for exercise metadata
ALTER TABLE public.exercises
  ADD COLUMN instructions text[],
  ADD COLUMN level text CHECK (level = ANY (ARRAY['beginner', 'intermediate', 'expert'])),
  ADD COLUMN force text CHECK (force = ANY (ARRAY['push', 'pull', 'static'])),
  ADD COLUMN mechanic text CHECK (mechanic = ANY (ARRAY['compound', 'isolation'])),
  ADD COLUMN is_system boolean NOT NULL DEFAULT false;

-- Update category constraint to include 'Other'
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_category_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_category_check
  CHECK (category = ANY (ARRAY['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core', 'Other']));

-- ============================================
-- STEP 2: Enable RLS and create policies
-- ============================================

-- Enable Row Level Security
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS exercises_user_policy ON public.exercises;
DROP POLICY IF EXISTS exercises_select_policy ON public.exercises;
DROP POLICY IF EXISTS exercises_insert_policy ON public.exercises;
DROP POLICY IF EXISTS exercises_update_policy ON public.exercises;
DROP POLICY IF EXISTS exercises_delete_policy ON public.exercises;

-- SELECT: Users can see their own exercises + all system exercises
CREATE POLICY exercises_select_policy ON public.exercises
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_system = true
  );

-- INSERT: Users can only create their own non-system exercises
CREATE POLICY exercises_insert_policy ON public.exercises
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND is_system = false
  );

-- UPDATE: Users can only update their own non-system exercises
CREATE POLICY exercises_update_policy ON public.exercises
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND is_system = false
  );

-- DELETE: Users can only delete their own non-system exercises
CREATE POLICY exercises_delete_policy ON public.exercises
  FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND is_system = false
  );

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

-- Partial index for efficient system exercises lookup
DROP INDEX IF EXISTS idx_exercises_system;
CREATE INDEX idx_exercises_system ON public.exercises (id) WHERE is_system = true;

-- Index on user_id for filtering user's exercises
DROP INDEX IF EXISTS idx_exercises_user_id;
CREATE INDEX idx_exercises_user_id ON public.exercises (user_id);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify everything is set up correctly

-- Check table columns exist
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'exercises';

-- Check RLS is enabled
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'exercises';

-- Check policies exist
-- SELECT policyname FROM pg_policies WHERE tablename = 'exercises';

-- Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'exercises';

-- Check category constraint includes 'Other'
-- SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'exercises_category_check';

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- Uncomment and run these if you need to undo the migration

/*
-- Drop indexes
DROP INDEX IF EXISTS idx_exercises_system;
DROP INDEX IF EXISTS idx_exercises_user_id;

-- Drop policies
DROP POLICY IF EXISTS exercises_select_policy ON public.exercises;
DROP POLICY IF EXISTS exercises_insert_policy ON public.exercises;
DROP POLICY IF EXISTS exercises_update_policy ON public.exercises;
DROP POLICY IF EXISTS exercises_delete_policy ON public.exercises;

-- Remove new columns
ALTER TABLE public.exercises
  DROP COLUMN IF EXISTS instructions,
  DROP COLUMN IF EXISTS level,
  DROP COLUMN IF EXISTS force,
  DROP COLUMN IF EXISTS mechanic,
  DROP COLUMN IF EXISTS is_system;

-- Restore original category constraint (without 'Other')
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_category_check;
ALTER TABLE public.exercises ADD CONSTRAINT exercises_category_check
  CHECK (category = ANY (ARRAY['Chest', 'Back', 'Shoulders', 'Legs', 'Arms', 'Core']));

-- Re-add NOT NULL to user_id (only if no NULL values exist)
-- ALTER TABLE public.exercises ALTER COLUMN user_id SET NOT NULL;
*/

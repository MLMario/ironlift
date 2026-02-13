-- Migration: Template Exercise Sets
-- Description: Adds support for per-set tracking in workout templates
-- Date: 2026-01-11
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- This migration enables users to define specific sets with weight/reps for template exercises

-- ============================================
-- STEP 1: Create template_exercise_sets table
-- ============================================

-- This table stores individual set configurations for each exercise in a template
CREATE TABLE IF NOT EXISTS template_exercise_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_exercise_id UUID NOT NULL REFERENCES template_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  weight DECIMAL(10, 2) DEFAULT 0,
  reps INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique set numbers per template exercise
  UNIQUE (template_exercise_id, set_number)
);

-- Add comments for documentation
COMMENT ON TABLE template_exercise_sets IS 'Individual set configurations for template exercises. Defines default weight and reps for each set in a template.';
COMMENT ON COLUMN template_exercise_sets.set_number IS 'Sequential number of the set within the template exercise (1, 2, 3...).';
COMMENT ON COLUMN template_exercise_sets.weight IS 'Default weight for this set in the template (in kg or lbs based on user preference).';
COMMENT ON COLUMN template_exercise_sets.reps IS 'Default number of repetitions for this set in the template.';

-- ============================================
-- STEP 2: Enable Row Level Security
-- ============================================

ALTER TABLE template_exercise_sets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access sets from their own templates
-- Uses a join path: template_exercise_sets -> template_exercises -> templates -> user_id
CREATE POLICY "Users can view their own template sets"
ON template_exercise_sets
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM template_exercises te
    JOIN templates t ON t.id = te.template_id
    WHERE te.id = template_exercise_sets.template_exercise_id
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own template sets"
ON template_exercise_sets
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM template_exercises te
    JOIN templates t ON t.id = te.template_id
    WHERE te.id = template_exercise_sets.template_exercise_id
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own template sets"
ON template_exercise_sets
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM template_exercises te
    JOIN templates t ON t.id = te.template_id
    WHERE te.id = template_exercise_sets.template_exercise_id
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own template sets"
ON template_exercise_sets
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM template_exercises te
    JOIN templates t ON t.id = te.template_id
    WHERE te.id = template_exercise_sets.template_exercise_id
    AND t.user_id = auth.uid()
  )
);

-- ============================================
-- STEP 3: Create indexes for performance
-- ============================================

-- Index for faster lookups by template exercise
CREATE INDEX IF NOT EXISTS idx_template_exercise_sets_template_exercise
ON template_exercise_sets(template_exercise_id);

-- Composite index for common query pattern (template exercise + set number)
CREATE INDEX IF NOT EXISTS idx_template_exercise_sets_template_exercise_set_num
ON template_exercise_sets(template_exercise_id, set_number);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after migration to verify everything is set up correctly

-- Check table exists
-- SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'template_exercise_sets');

-- Check RLS is enabled
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'template_exercise_sets';

-- Check policies exist
-- SELECT policyname FROM pg_policies WHERE tablename = 'template_exercise_sets';

-- Check indexes exist
-- SELECT indexname FROM pg_indexes WHERE tablename = 'template_exercise_sets';

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- Uncomment and run these if you need to undo the migration

/*
DROP TABLE IF EXISTS template_exercise_sets;
*/

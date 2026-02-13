-- Migration: Add ON DELETE CASCADE to exercise foreign keys
-- Date: 2026-02-03
-- Purpose: Enable cascade delete for exercise removal. When an exercise is
--          deleted, all referencing rows in template_exercises, workout_log_exercises,
--          and user_charts are automatically removed.
-- Note: Run this in the Supabase SQL Editor.

-- 1. template_exercises.exercise_id -> exercises.id
ALTER TABLE public.template_exercises DROP CONSTRAINT template_exercises_exercise_id_fkey;
ALTER TABLE public.template_exercises ADD CONSTRAINT template_exercises_exercise_id_fkey
  FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;

-- 2. workout_log_exercises.exercise_id -> exercises.id
ALTER TABLE public.workout_log_exercises DROP CONSTRAINT workout_log_exercises_exercise_id_fkey;
ALTER TABLE public.workout_log_exercises ADD CONSTRAINT workout_log_exercises_exercise_id_fkey
  FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;

-- 3. user_charts.exercise_id -> exercises.id
ALTER TABLE public.user_charts DROP CONSTRAINT user_charts_exercise_id_fkey;
ALTER TABLE public.user_charts ADD CONSTRAINT user_charts_exercise_id_fkey
  FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE;

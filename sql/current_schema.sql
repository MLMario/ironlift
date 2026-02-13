-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,  -- Nullable for system exercises
  name text NOT NULL,
  category text NOT NULL CHECK (category = ANY (ARRAY['Chest'::text, 'Back'::text, 'Shoulders'::text, 'Legs'::text, 'Arms'::text, 'Core'::text, 'Other'::text])),
  equipment text,
  instructions text[],
  level text CHECK (level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'expert'::text])),
  force text CHECK (force = ANY (ARRAY['push'::text, 'pull'::text, 'static'::text])),
  mechanic text CHECK (mechanic = ANY (ARRAY['compound'::text, 'isolation'::text])),
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT exercises_pkey PRIMARY KEY (id),
  CONSTRAINT exercises_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.template_exercise_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_exercise_id uuid NOT NULL,
  set_number integer NOT NULL,
  weight numeric DEFAULT 0,
  reps integer DEFAULT 10,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT template_exercise_sets_pkey PRIMARY KEY (id),
  CONSTRAINT template_exercise_sets_template_exercise_id_fkey FOREIGN KEY (template_exercise_id) REFERENCES public.template_exercises(id)
);
CREATE TABLE public.template_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  default_rest_seconds integer NOT NULL DEFAULT 60 CHECK (default_rest_seconds >= 0),
  order integer NOT NULL CHECK ("order" >= 0),
  CONSTRAINT template_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT template_exercises_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id),
  CONSTRAINT template_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE
);
CREATE TABLE public.templates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT templates_pkey PRIMARY KEY (id),
  CONSTRAINT templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_charts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  metric_type text NOT NULL CHECK (metric_type = ANY (ARRAY['total_sets'::text, 'max_volume_set'::text])),
  x_axis_mode text NOT NULL CHECK (x_axis_mode = ANY (ARRAY['date'::text, 'session'::text])),
  order integer NOT NULL CHECK ("order" >= 0),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_charts_pkey PRIMARY KEY (id),
  CONSTRAINT user_charts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_charts_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE
);
CREATE TABLE public.workout_log_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workout_log_id uuid NOT NULL,
  exercise_id uuid NOT NULL,
  rest_seconds integer NOT NULL CHECK (rest_seconds >= 0),
  order integer NOT NULL CHECK ("order" >= 0),
  CONSTRAINT workout_log_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT workout_log_exercises_workout_log_id_fkey FOREIGN KEY (workout_log_id) REFERENCES public.workout_logs(id),
  CONSTRAINT workout_log_exercises_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE CASCADE
);
CREATE TABLE public.workout_log_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  workout_log_exercise_id uuid NOT NULL,
  set_number integer NOT NULL,
  weight numeric DEFAULT 0,
  reps integer DEFAULT 0,
  is_done boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workout_log_sets_pkey PRIMARY KEY (id),
  CONSTRAINT workout_log_sets_workout_log_exercise_id_fkey FOREIGN KEY (workout_log_exercise_id) REFERENCES public.workout_log_exercises(id)
);
CREATE TABLE public.workout_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid,
  started_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT workout_logs_pkey PRIMARY KEY (id),
  CONSTRAINT workout_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT workout_logs_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id)
);
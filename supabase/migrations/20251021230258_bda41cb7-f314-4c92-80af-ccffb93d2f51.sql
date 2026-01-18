-- Fix 1: Add INSERT policy for profiles table
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Fix 2: Make user_id NOT NULL on all user-scoped tables to prevent RLS bypass
ALTER TABLE public.stress_scans 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.coach_conversations 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.feedback_responses 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.user_progress 
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.user_ear_baselines 
ALTER COLUMN user_id SET NOT NULL;

-- Note: email_logs.user_id kept nullable as it may contain system-generated logs
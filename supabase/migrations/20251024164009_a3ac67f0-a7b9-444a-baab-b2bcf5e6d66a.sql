-- Fix security warnings: Add validation to handle_new_user() and make email_logs.user_id NOT NULL

-- 1. Fix handle_new_user() function to add input validation and sanitization
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format (basic validation, Supabase already validates this)
  IF NEW.email IS NULL OR NEW.email = '' THEN
    RAISE EXCEPTION 'Email cannot be null or empty';
  END IF;
  
  IF NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Sanitize and limit full_name to 100 characters
  -- Remove newlines and control characters
  INSERT INTO public.profiles (id, email, full_name, preferred_name)
  VALUES (
    NEW.id,
    NEW.email,
    LEFT(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'full_name', ''), '[\n\r\t]', ' ', 'g'), 100),
    LEFT(REGEXP_REPLACE(COALESCE(NEW.raw_user_meta_data->>'preferred_name', ''), '[\n\r\t]', ' ', 'g'), 50)
  );
  RETURN NEW;
END;
$$;

-- 2. Fix email_logs table - make user_id NOT NULL since no code uses system logs
-- First, delete any rows with NULL user_id (if any exist)
DELETE FROM public.email_logs WHERE user_id IS NULL;

-- Then make the column NOT NULL
ALTER TABLE public.email_logs ALTER COLUMN user_id SET NOT NULL;
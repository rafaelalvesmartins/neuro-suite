-- Corrigir search_path da função update_progress_updated_at
DROP FUNCTION IF EXISTS public.update_progress_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_progress_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON public.user_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_progress_updated_at();
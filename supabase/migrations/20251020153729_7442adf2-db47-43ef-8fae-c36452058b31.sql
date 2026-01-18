-- Criar tabela para feedback do Google Forms
CREATE TABLE public.feedback_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.coach_conversations(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 10),
  stress_reduction_percent INTEGER,
  productivity_impact TEXT,
  form_response_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.feedback_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own feedback"
  ON public.feedback_responses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own feedback"
  ON public.feedback_responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Criar tabela para armazenar baseline de EAR personalizada
CREATE TABLE public.user_ear_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  baseline_open NUMERIC NOT NULL,
  baseline_closed NUMERIC NOT NULL,
  threshold NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_ear_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own baseline"
  ON public.user_ear_baselines
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own baseline"
  ON public.user_ear_baselines
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own baseline"
  ON public.user_ear_baselines
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Criar tabela para logs de emails enviados
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email logs"
  ON public.email_logs
  FOR SELECT
  USING (auth.uid() = user_id);
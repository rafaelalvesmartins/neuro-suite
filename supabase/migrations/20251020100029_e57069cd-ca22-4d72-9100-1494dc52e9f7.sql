-- Adicionar campo preferred_name à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN preferred_name text;
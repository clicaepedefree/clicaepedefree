-- Adicionar campo nome do responsável na tabela restaurants
ALTER TABLE public.restaurants 
ADD COLUMN responsible_name text;
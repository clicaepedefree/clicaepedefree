-- Alterar o padrão de is_open para false (lojas fechadas por padrão)
ALTER TABLE public.restaurants 
ALTER COLUMN is_open SET DEFAULT false;
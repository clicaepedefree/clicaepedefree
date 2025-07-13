-- Adicionar campos de min/max seleções para grupos de addon
ALTER TABLE public.addon_groups 
ADD COLUMN min_selections INTEGER DEFAULT 0,
ADD COLUMN max_selections INTEGER DEFAULT NULL;

-- Atualizar grupos existentes de seleção múltipla para ter pelo menos min_selections = 0
UPDATE public.addon_groups 
SET min_selections = 0 
WHERE selection_type = 'multiple' AND min_selections IS NULL;
-- Adicionar campo description na tabela addon_options
ALTER TABLE public.addon_options
ADD COLUMN description text;

-- Comentário na coluna
COMMENT ON COLUMN public.addon_options.description IS 'Descrição da opção do grupo';
-- Remover a constraint existente que impede os novos tipos de seleção
ALTER TABLE public.addon_groups DROP CONSTRAINT IF EXISTS addon_groups_selection_type_check;

-- Como alternativa, vamos criar uma trigger para validação mais flexível
CREATE OR REPLACE FUNCTION validate_selection_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.selection_type NOT IN ('single', 'multiple', 'fractional_highest', 'fractional_average') THEN
    RAISE EXCEPTION 'Invalid selection_type: %. Valid values are: single, multiple, fractional_highest, fractional_average', NEW.selection_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para validar o tipo de seleção
DROP TRIGGER IF EXISTS validate_addon_group_selection_type ON public.addon_groups;
CREATE TRIGGER validate_addon_group_selection_type
  BEFORE INSERT OR UPDATE ON public.addon_groups
  FOR EACH ROW
  EXECUTE FUNCTION validate_selection_type();
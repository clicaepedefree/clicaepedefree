-- Remove a política problemática que permite qualquer usuário autenticado ver todos os pedidos
DROP POLICY IF EXISTS "Prevent bulk order extraction" ON public.orders;

-- Verificar se existe a política correta que restringe o acesso apenas aos donos dos restaurantes
-- A política "Restaurant owners can view their orders with audit" já existe e é a correta

-- Adicionar uma política mais restritiva para prevenir acesso não autorizado
CREATE POLICY "Strict order access control" ON public.orders
FOR SELECT USING (
  -- Apenas donos do restaurante podem ver os pedidos do seu restaurante
  restaurant_id IN (
    SELECT restaurants.id 
    FROM restaurants 
    WHERE restaurants.user_id = auth.uid()
  )
);

-- Garantir que a função de auditoria ainda funcione
-- (A política "Restaurant owners can view their orders with audit" já existe)
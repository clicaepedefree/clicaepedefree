-- Adicionar novos tipos de seleção para addon groups
-- Atualizando os tipos de seleção para incluir as novas opções de fracionamento

-- Os novos tipos serão:
-- 'single' - escolha única (já existe)
-- 'multiple' - múltipla escolha (já existe) 
-- 'fractional_highest' - fracionado cobrado pelo maior valor
-- 'fractional_average' - fracionado cobrado pela média

-- Como não podemos usar CHECK constraints, vamos apenas documentar que os valores válidos são:
-- 'single', 'multiple', 'fractional_highest', 'fractional_average'

-- Não precisamos alterar a estrutura da tabela, apenas expandir os valores aceitos
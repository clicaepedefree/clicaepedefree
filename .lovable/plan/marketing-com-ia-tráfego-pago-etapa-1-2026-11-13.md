# Marketing com IA (Tráfego Pago) — Etapa 1

## Estrutura atual (resumo)
- Painel do lojista em `/admin/*` (Pedidos, Configurações, Relatórios, Carteira), com menu lateral fixo.
- Cada loja tem seus produtos, categorias, fotos, preços e o link público do cardápio (`/cardapio/:slug`), protegidos por loja.
- Já existe IA no sistema (importação de cardápio) rodando no servidor.
- Nada disso será alterado: cardápio, pedidos, login, links e dados continuam iguais.

## O que a Etapa 1 entrega
1. Nova página **Marketing com IA** em `/admin/marketing`, com item no menu lateral (grupo Marketing).
2. **Cartão "Conta Meta"**: mostra "Não conectada" e o botão "Conectar conta Meta" desabilitado com aviso "disponível em breve" (a conexão real é a Etapa 2).
3. **Criador de anúncio** com produtos reais da loja:
   - Lista/busca dos produtos ativos (foto, nome, preço).
   - Ao escolher, preenche nome, foto, descrição, preço e o link do cardápio.
   - Botão **"Gerar texto com IA"**: cria título, texto principal e chamada para ação (em português, sem prometer resultados). Tudo editável.
   - **Prévia** no estilo de post do Facebook/Instagram (feed).
4. **Configuração da campanha (rascunho)**: objetivo (Tráfego / Vendas / Engajamento), orçamento diário (mínimo R$ 6), cidade + raio, idade, destino = link do cardápio. Mostra apenas **previsão de gasto** (diário × dias), sem estimar cliques ou vendas.
5. **Salvar como rascunho** — nada é enviado à Meta nesta etapa.
6. **Aba Resultados**: estado vazio honesto ("Conecte sua conta Meta para ver resultados") — nenhum número fictício.

## Pontos que dependem de você (para Etapas 2–4)
Como cada restaurante conecta **a própria** conta de anúncios, é preciso um App próprio no Meta for Developers:
- Criar App tipo "Empresa" e adicionar os produtos **Login do Facebook para Empresas** e **Marketing API**.
- Permissões: `ads_management`, `ads_read`, `business_management`, `pages_show_list`, `pages_read_engagement` (e `instagram_basic` para Instagram).
- **Verificação da empresa** (Business Verification) e **Análise do App** (App Review) para uso por lojistas externos — sem isso só funciona para contas de teste/administradores do App.
- Cadastrar a URL de retorno que eu informar na Etapa 2.
- Credenciais que pedirei de forma segura: **App ID** e **App Secret**.
- Cada lojista precisará ter uma Página do Facebook e uma conta de anúncios com forma de pagamento.

## Detalhes técnicos
- Tabela `ad_drafts` (restaurant_id, product_id, objetivo, orçamento em centavos, segmentação jsonb, título, texto, cta, status `draft`, timestamps) com RLS por dono da loja (mesmo padrão das outras tabelas) + GRANTs.
- Tabelas de conexão/tokens e IDs da Meta ficam para a Etapa 2/3 (tokens só no servidor, nunca no navegador).
- Função de servidor `generate-ad-copy`: valida login e posse do produto, chama a IA (Lovable AI, saída estruturada), retorna {headline, primaryText, cta}. Trata limites/créditos com mensagem clara.
- Arquivos novos: `src/pages/Marketing.tsx`, `src/components/marketing/*` (ProductPicker, AdComposer, AdPreview, CampaignSettings, MetaConnectionCard, ResultsEmpty); rota em `App.tsx` e item no `AppSidebar`.

# Subcontas ValidaPay por restaurante

## Objetivo
Hoje todos os pagamentos passam pela conta master da Clica e Pede. Por isso o saque só funciona para chaves PIX no CNPJ da Clica e Pede e dá `OWNERSHIP_MISMATCH` quando o lojista usa a chave dele. A solução oficial do ValidaPay é criar uma **subconta** por restaurante (PF ou PJ). Aí cada cobrança fica na subconta do lojista, o saldo é do lojista e o saque sai para a chave PIX dele (mesma titularidade).

## Visão geral do fluxo
```text
Cadastro restaurante ── (já existe) ──> Tabela restaurants
        │
        ▼
[Onboarding ValidaPay] → POST /v1/proposals (PF ou PJ)
        │ retorna formId (status pendente)
        ▼
Webhook account_approved → grava subaccount_id, branch, ispb
        │
        ▼
Cobranças PIX → criadas COM header accountId = subaccount do lojista
Saldo/Extrato → consultados na subconta
Saque → /v1/wallet/withdraw com accountId da subconta → chave do lojista (mesma titularidade) ✅
```

## Mudanças

### 1. Banco de dados
Nova tabela `validapay_subaccounts`:
- `restaurant_id` (FK, único)
- `form_id` (id do onboarding ValidaPay)
- `subaccount_number`, `branch`, `ispb`, `holder_name`, `holder_document`
- `account_type` ('PF' | 'PJ')
- `status` ('pending' | 'approved' | 'rejected')
- `raw_response` (jsonb para auditoria)

RLS: dono do restaurante lê o próprio registro; service_role faz tudo; super admin lê tudo.

Coluna nova em `restaurants`: `validapay_subaccount_id` (cópia rápida para consultas).

### 2. Edge functions novas
- `validapay-create-subaccount` — recebe dados PF/PJ do dono, chama `POST /v1/proposals`, grava linha em `validapay_subaccounts` com status `pending`.
- `validapay-onboarding-webhook` — recebe `account_approved` do ValidaPay, atualiza a subconta e popula `restaurants.validapay_subaccount_id`.

### 3. Edge functions existentes (ajustes)
- `_shared/validapay-client.ts`: adicionar parâmetro opcional `accountId` em `createPixCharge`, `getChargeStatus`, `createRefund`, `createWithdrawal` e enviar via header `accountId` quando presente. Função nova `getWalletBalance(accountId)` usando `GET /v1/wallet/balance`.
- `validapay-create-charge`: buscar `validapay_subaccount_id` do restaurante e passar como `accountId` (fallback: master, para legado).
- `validapay-request-withdrawal`: exigir subconta aprovada; chamar `/v1/wallet/withdraw` com `accountId` da subconta. Saldo passa a vir da subconta (não mais da nossa tabela `wallets`, ou sincronizamos com ela).
- `validapay-refund-order`: idem charge.
- `validapay-webhook` (cobranças): identificar subconta pela `accountId` retornada.

### 4. UI nova
Página `/admin/configuracoes/conta-bancaria` (aba dentro de Configurações):
- Se o restaurante ainda não tem subconta: formulário PF/PJ (nome, CPF/CNPJ, telefone, email, endereço, dados de renda/faturamento exigidos pelo `financialDetails`).
- Estado: pendente → mostra "Em análise pelo ValidaPay".
- Aprovado → mostra dados da subconta + permite cadastrar chave PIX para saque (a chave precisa ser do mesmo CPF/CNPJ informado no onboarding).
- Reprovado → mostra motivo e botão para reenviar.

Bloqueio: até a subconta estar `approved`, a página `/admin/carteira` exibe banner "Complete o cadastro bancário para receber pagamentos" com CTA para `/admin/configuracoes/conta-bancaria`.

### 5. Migração de dados existentes
Restaurantes já cadastrados continuam usando a master account (compatibilidade). Saques só funcionam após criar a subconta. Uma flag clara em `wallets.is_subaccount_active` indica em qual modo o restaurante está.

## Detalhes técnicos
- ValidaPay routes envolvidas: `POST /v1/proposals` (PF/PJ), `GET /v1/proposals/:formId` (status), `GET /v1/accounts/subaccounts` (listar), `GET /v1/wallet/balance` (com header `accountId`), `POST /v1/wallet/withdraw`, `POST /v1/charges/pix`. O header `accountId` é como o ValidaPay roteia operações para a subconta.
- Webhook de onboarding precisa estar `verify_jwt = false` em `supabase/config.toml` (público).
- `financialDetails` exige códigos do apêndice ValidaPay — vamos mapear na UI com selects pré-preenchidos.
- Todas as escritas em `validapay_subaccounts` apenas via service_role (edge function).

## O que NÃO entra agora
- Migrar cobranças antigas da master para subcontas (impossível retroativamente).
- Split de pagamentos (taxa da Clica e Pede via split) — pode ser feito em etapa seguinte usando `POST /v1/charges/pix` com split para a master.

## Próximos passos depois deste plano
1. Migration da tabela `validapay_subaccounts` + coluna em `restaurants`.
2. Edge functions de onboarding + webhook.
3. Ajustar client compartilhado e funções de charge/refund/withdraw.
4. UI de onboarding e bloqueios.
5. Testar fluxo em sandbox: criar subconta → aprovar → cobrar → sacar.

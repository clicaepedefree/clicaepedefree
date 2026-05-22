
# Migração PIX → ValidaPay + Carteira financeira

Trabalho grande, organizado em 6 blocos. Vou executar tudo de uma vez, mas cada bloco é independente para facilitar revisão.

## 1. Banco de dados (migração única)

**Novas tabelas:**
- `wallets` — uma por restaurante (saldo disponível, pendente, total recebido, total sacado, total taxas)
- `wallet_transactions` — extrato unificado (tipo: venda/saque/reembolso/taxa, valor, saldo após, status)
- `withdrawal_requests` — solicitações de saque (valor bruto, taxa, líquido, status, validapay_id, processado_em)
- `refund_transactions` — devoluções (order_id, valor, motivo, validapay_id, status)
- `payment_gateway_settings` — singleton, configs ValidaPay (taxa venda, taxa saque, mínimo saque, prazo liberação, ambiente)
- `webhook_logs` — todo payload recebido, idempotência via event_id

**Alterações em `orders`:**
- `payment_status` ganha valores: `pendente`, `pago`, `expirado`, `cancelado`, `reembolsado`
- Novo: `validapay_charge_id`, `refunded_at`

**Alterações em `payment_methods`:**
- `restaurant_pix_key_holder_name`, `restaurant_pix_key_holder_document` (validação obrigatória pré-saque)

**Funções/triggers:**
- `compute_wallet_balance(restaurant_id)` — recalcula saldo a partir de wallet_transactions
- Trigger ao inserir wallet_transaction → atualiza `wallets` (saldo)
- RLS: dono enxerga sua wallet/transactions/saques; super_admin enxerga tudo; configurações só super_admin

## 2. Edge Functions (ValidaPay)

**Cliente compartilhado:** `supabase/functions/_shared/validapay-client.ts`
- Auth Bearer (token nos secrets, depois OAuth2 se necessário)
- Base URL chaveada por `VALIDAPAY_ENVIRONMENT` (sandbox/produção)
- Funções: `createPixCharge`, `getChargeStatus`, `createRefund`, `createWithdrawal`

**Funções novas:**
- `validapay-create-charge` — substitui `create-pix-charge`. Cria cobrança via `POST /v1/charges/pix`, persiste `validapay_charge_id`, retorna EMV (copia-cola) + gera QR a partir do EMV
- `validapay-webhook` — recebe eventos (`charge.paid`, `charge.expired`, `refund.completed`), valida sign secret, registra em `webhook_logs` com idempotência (event_id único), atualiza order + wallet
- `validapay-request-withdrawal` — autenticada (JWT do dono). Valida: dia útil, saldo, chave PIX cadastrada, sem saque pendente. Desconta R$5, chama `POST /v1/wallet/withdraw`, cria `withdrawal_requests` e `wallet_transaction`
- `validapay-refund-order` — autenticada. Verifica order PIX pago, chama `POST /v1/wallet/refunds`, atualiza order para `cancelado/reembolsado`, cria `wallet_transaction` negativa

**EFI:** mantida no código mas removida do `supabase/config.toml` ativo. Edge functions `create-pix-charge`/`pix-webhook`/`reconcile-pix-repasses` permanecem no repo mas frontend não as chama mais.

## 3. Frontend — Carteira (loja)

Nova rota `/admin/carteira` com 3 abas:

**Aba "Resumo":**
- Cards: Saldo disponível, Saldo pendente, Total recebido PIX, Total sacado, Total taxas, Qtd. vendas PIX
- Botão grande "Solicitar saque" → abre modal

**Aba "Extrato":**
- Tabela paginada (cliente, txid, data, valor bruto, taxa, líquido, status, tipo)
- Filtros: período, status, busca por cliente/valor

**Aba "Configurar PIX":**
- Cadastro de chave PIX da loja (tipo, chave, titular, documento) — campos obrigatórios pra liberar saque

**Modal de saque:**
- Mostra saldo disponível
- Input valor (validação: ≤ saldo, ≥ mínimo configurado)
- Aviso: "Taxa de R$5,00 — você receberá R$X"
- Bloqueio se: sábado/domingo, sem chave PIX, saque pendente já existente

## 4. Frontend — Pedidos (cancelamento com reembolso)

Em `OrdersKanban.tsx`:
- Botão "Cancelar pedido" para orders com `payment_method=pix_online` e `payment_status=pago` → abre modal:
  > "Este pedido possui pagamento PIX online. Deseja cancelar a transação e realizar o reembolso ao cliente?"
- Confirmar chama `validapay-refund-order`
- Pedidos `pix_online` com `payment_status=pendente` ficam num "limbo" visual e não podem ser aceitos (já é a regra hoje, vou reforçar)

## 5. Frontend — Super Admin (Gateway ValidaPay)

Nova aba no SuperAdmin "Gateway ValidaPay":

**Configurações:**
- Client ID, Client Secret, chave PIX recebedora, URL webhook, Webhook Sign Secret, Ambiente (sandbox/prod)
- Taxa por venda (default R$1), taxa de saque (R$5), valor mínimo saque, prazo liberação, toggle saque automático
- *Nota:* credenciais sensíveis ficam em **secrets** (Lovable Cloud), apenas valores não-sensíveis em `payment_gateway_settings`

**Dashboard:**
- Volume transacionado, total recebido, total reembolsos, total saques, taxas geradas, transações pendentes, erros webhook, falhas saque

**Logs:**
- Lista `webhook_logs` (filtro por evento/status) e falhas de saque/reembolso

## 6. Secrets necessários

Vou pedir via `add_secret`:
- `VALIDAPAY_CLIENT_ID`
- `VALIDAPAY_CLIENT_SECRET`
- `VALIDAPAY_WEBHOOK_SECRET`
- `VALIDAPAY_ENVIRONMENT` (`sandbox` ou `production`)

Webhook público URL será: `https://defowjmlqmheecydnyrj.supabase.co/functions/v1/validapay-webhook` — cadastrar no painel ValidaPay.

---

## Detalhes técnicos importantes

- **Idempotência webhook:** `webhook_logs.event_id` UNIQUE; se duplicado, retorna 200 sem processar
- **Saldo:** sempre derivado de `wallet_transactions` (audit trail), `wallets.balance` é cache atualizado por trigger
- **Dias úteis:** validação no edge function comparando `EXTRACT(DOW)` (1-5). Feriados nacionais via lista hardcoded por enquanto (BR_HOLIDAYS_2026)
- **Concorrência de saque:** `UNIQUE INDEX` parcial em `withdrawal_requests(restaurant_id) WHERE status IN ('pending','processing')` → impede duplicidade
- **Status financeiro vs operacional:** order só passa de `pending` para outros status se `payment_status='pago'` (constraint no trigger `validate_order_payload`)
- **EFI mantida desativada:** `supabase/config.toml` mantém os blocos pra não quebrar build; código frontend não chama mais

## O que NÃO está nesse escopo (avisos)

- OAuth2 token refresh da ValidaPay — primeira versão usa Bearer fixo. Se a API exigir refresh, adicionamos cache de token na próxima rodada
- Calendário de feriados dinâmico — hardcoded 2026 por ora
- Push notifications de webhook — só atualização em tela
- Multi-currency — apenas BRL

## Ordem de execução

1. Migração SQL (esperar aprovação do usuário)
2. Pedir secrets ValidaPay
3. Edge functions ValidaPay
4. Frontend Carteira + rota
5. Modal de cancelamento/reembolso em OrdersKanban
6. Super Admin Gateway
7. Atualizar memória do projeto

Confirma a estrutura? Após aprovação inicio pela migração SQL.

# Publicação do robô de WhatsApp

1. Aplique a migração `0012_whatsapp_robot` no banco do Lovable Cloud.
2. Configure os segredos da Edge Function no Lovable Cloud.

   | Segredo | Valor |
   |---|---|
   | `EVOLUTION_API_URL` | URL HTTPS da Evolution API v2 na VPS |
   | `EVOLUTION_API_KEY` | Chave de API da instalação |
   | `WHATSAPP_PUBLIC_SITE_URL` | URL HTTPS do site onde está a rota `/cardapio/:slug` |
   | `WHATSAPP_WORKER_TOKEN` | Token aleatório dedicado ao envio da fila |

3. Publique a função `whatsapp-robot` conforme `supabase/config.toml`. Ela valida a sessão e a propriedade da loja nas ações do painel, um token exclusivo da instância nos webhooks e o token do worker no envio da fila.
4. Configure uma tarefa agendada na VPS ou no Lovable Cloud para chamar o endpoint de envio a cada minuto. Mantenha o token em um segredo do agendador.

   ```sh
   curl --fail --silent --show-error --max-time 135 \
     --request POST \
     --header "Authorization: Bearer ${WHATSAPP_WORKER_TOKEN}" \
     "${WHATSAPP_FUNCTION_BASE_URL}/whatsapp-robot/dispatch"
   ```

   Use a base pública de Edge Functions que termina em `/functions/v1` para `WHATSAPP_FUNCTION_BASE_URL`. Uma resposta bem-sucedida traz a quantidade de mensagens enviadas e tentativas com falha. A fila reprograma falhas de envio, com limite de seis tentativas.

5. No painel, vá a **Robô de WhatsApp**, conecte pelo QR Code e salve as preferências. Teste com um WhatsApp externo à loja e com um pedido de teste que avance para **Em preparação**.

A Evolution registra automaticamente os webhooks da instância ao gerar o primeiro QR Code. A VPS precisa conseguir alcançar o endpoint HTTPS do Lovable Cloud e preservar o cabeçalho do webhook. O Lovable Cloud precisa conseguir alcançar a URL HTTPS da Evolution API. Um nome de perfil recebido em conversa tem prioridade nas mensagens. Um aviso de pedido usa o nome registrado no pedido quando o cliente ainda não conversou no WhatsApp.

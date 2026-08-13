// Reconciles PIX charges with ValidaPay.
// Runs on a schedule (pg_cron) and can be invoked manually.
// For every order that is not settled locally, we ask ValidaPay for the real
// charge status. If ValidaPay says it was paid, we replay the paid webhook so
// the wallet ledger is created. Only charges ValidaPay does NOT report as paid
// and that are past their expiration window get marked as expired.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getChargeStatus } from "../_shared/validapay-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAID_STATUSES = ["paid", "approved", "aprovado", "concluida", "concluída", "completed", "settled"];
const LOOKBACK_DAYS = 7;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, validapay_charge_id, pix_txid, payment_status, pix_expires_at, total")
    .eq("payment_method", "pix_online")
    .in("payment_status", ["pendente", "aguardando_pagamento", "expirado"])
    .gte("created_at", since)
    .limit(300);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let checked = 0;
  let recovered = 0;
  let expired = 0;
  const errors: string[] = [];

  for (const order of orders || []) {
    const chargeId = order.validapay_charge_id || order.pix_txid;
    if (!chargeId) continue;
    checked++;

    let status = "";
    let raw: any = null;
    try {
      raw = await getChargeStatus(chargeId);
      status = String(raw?.status || raw?.charge?.status || "").toLowerCase();
    } catch (e) {
      errors.push(`${order.id}: ${e instanceof Error ? e.message : String(e)}`);
      continue;
    }

    if (PAID_STATUSES.includes(status)) {
      try {
        await supabase.functions.invoke("validapay-webhook", {
          body: {
            event: "charge.paid",
            eventId: `reconcile_${chargeId}`,
            data: { chargeId, amount: raw?.amount ?? order.total },
          },
        });
        recovered++;
      } catch (e) {
        errors.push(`${order.id}: replay failed ${e instanceof Error ? e.message : String(e)}`);
      }
      continue;
    }

    const isExpiredLocally =
      order.pix_expires_at && new Date(order.pix_expires_at).getTime() < Date.now() - 15 * 60 * 1000;
    if (isExpiredLocally && order.payment_status !== "expirado") {
      await supabase
        .from("orders")
        .update({ payment_status: "expirado", status: "cancelled" })
        .eq("id", order.id)
        .neq("payment_status", "pago");
      await supabase
        .from("pix_transactions")
        .update({ status: "expired" })
        .eq("order_id", order.id)
        .eq("transaction_type", "cobranca")
        .eq("status", "pending");
      expired++;
    }
  }

  console.log("reconcile summary", { checked, recovered, expired, errors: errors.length });

  return new Response(JSON.stringify({ checked, recovered, expired, errors }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

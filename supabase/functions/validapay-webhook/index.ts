import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyWebhookSignature } from "../_shared/validapay-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature, x-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const rawBody = await req.text();
  const signature =
    req.headers.get("x-webhook-signature") ||
    req.headers.get("X-Webhook-Signature") ||
    req.headers.get("x-signature") ||
    req.headers.get("X-Signature");

  const signatureValid = await verifyWebhookSignature(rawBody, signature);

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Extract event_id for idempotency
  const eventId =
    payload.eventId ||
    payload.event_id ||
    payload.id ||
    payload.chargeId ||
    (payload.data && (payload.data.id || payload.data.chargeId)) ||
    null;
  const eventType =
    payload.event ||
    payload.eventType ||
    payload.type ||
    null;

  // Idempotency: if event_id already exists, return 200 without reprocessing
  if (eventId) {
    const { data: existing } = await supabase
      .from("webhook_logs")
      .select("id, processed")
      .eq("provider", "validapay")
      .eq("event_id", eventId)
      .maybeSingle();
    if (existing?.processed) {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Log webhook
  const { data: logRow } = await supabase
    .from("webhook_logs")
    .insert({
      provider: "validapay",
      event_id: eventId,
      event_type: eventType,
      signature_valid: signatureValid,
      payload,
      headers: Object.fromEntries(req.headers.entries()),
    })
  // Allow internal invocations from our own edge functions (e.g. check-pix-status polling)
  // by checking if the apikey header matches our service role.
  const apiKey = req.headers.get("apikey") || req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const isInternal = !!serviceKey && apiKey === serviceKey;

  // If we require signatures in prod, reject when invalid — UNLESS it's an internal call
  if (Deno.env.get("VALIDAPAY_ENVIRONMENT") === "production" && !signatureValid && !isInternal) {
    await supabase
      .from("webhook_logs")
      .update({ error_message: "Invalid signature" })
      .eq("id", logRow?.id);
    return new Response("Invalid signature", { status: 401, headers: corsHeaders });
  }


  try {
    await processEvent(supabase, eventType, payload);
    await supabase
      .from("webhook_logs")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("id", logRow?.id);
  } catch (err) {
    console.error("webhook process error:", err);
    await supabase
      .from("webhook_logs")
      .update({ error_message: err instanceof Error ? err.message : String(err) })
      .eq("id", logRow?.id);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function processEvent(supabase: any, eventType: string | null, payload: any) {
  const data = payload.data || payload;
  const chargeId = data.chargeId || data.id || payload.chargeId;
  const amount = Number(data.amount || data.value || data.valor || 0);

  // Normalize event type
  const evt = (eventType || "").toLowerCase();

  if (evt.includes("paid") || evt.includes("approved") || evt.includes("aprovad")) {
    return handlePaid(supabase, chargeId, amount, data);
  }
  if (evt.includes("expired") || evt.includes("expir")) {
    return handleExpired(supabase, chargeId);
  }
  if (evt.includes("refund") || evt.includes("devolu")) {
    return handleRefunded(supabase, chargeId, amount, data);
  }
  if (evt.includes("cancel")) {
    return handleCancelled(supabase, chargeId);
  }
  // Unknown event — just log
  console.log("Unknown validapay event:", eventType);
}

async function handlePaid(supabase: any, chargeId: string, amount: number, raw: any) {
  if (!chargeId) return;
  const { data: order } = await supabase
    .from("orders")
    .select("id, restaurant_id, total, payment_status, customer_name")
    .eq("validapay_charge_id", chargeId)
    .maybeSingle();
  if (!order) {
    console.warn("No order for charge:", chargeId);
    return;
  }
  if (order.payment_status === "pago") return; // already

  // Mark order paid
  await supabase
    .from("orders")
    .update({
      payment_status: "pago",
      pix_paid_at: new Date().toISOString(),
      status: "new",
    })
    .eq("id", order.id);

  // Load fee from settings
  const { data: settings } = await supabase
    .from("payment_gateway_settings")
    .select("fee_per_sale")
    .limit(1)
    .single();
  const fee = Number(settings?.fee_per_sale ?? 1);

  // Get wallet
  const { data: wallet } = await supabase
    .from("wallets")
    .select("id")
    .eq("restaurant_id", order.restaurant_id)
    .single();

  const totalAmount = Number(order.total);
  const netAmount = Math.max(0, totalAmount - fee);

  await supabase.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    restaurant_id: order.restaurant_id,
    order_id: order.id,
    transaction_type: "venda",
    amount: totalAmount,
    fee,
    net_amount: netAmount,
    status: "completed",
    description: `Venda PIX pedido #${order.id.slice(0, 8)}`,
    customer_name: order.customer_name,
    metadata: { charge_id: chargeId, raw },
  });
}

async function handleExpired(supabase: any, chargeId: string) {
  if (!chargeId) return;
  await supabase
    .from("orders")
    .update({ payment_status: "expirado" })
    .eq("validapay_charge_id", chargeId)
    .neq("payment_status", "pago");
}

async function handleCancelled(supabase: any, chargeId: string) {
  if (!chargeId) return;
  await supabase
    .from("orders")
    .update({ payment_status: "cancelado" })
    .eq("validapay_charge_id", chargeId)
    .neq("payment_status", "pago");
}

async function handleRefunded(supabase: any, chargeId: string, amount: number, raw: any) {
  if (!chargeId) return;
  const { data: refund } = await supabase
    .from("refund_transactions")
    .select("id, order_id, restaurant_id, amount, status")
    .eq("validapay_refund_id", raw.refundId || raw.id)
    .maybeSingle();
  if (refund) {
    await supabase
      .from("refund_transactions")
      .update({ status: "completed", completed_at: new Date().toISOString(), raw_payload: raw })
      .eq("id", refund.id);
  }
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { sendPix } from "../_shared/efi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

const PLATFORM_FEE = 1.0; // R$ 1,00 por venda
const HMAC_SECRET = Deno.env.get("EFI_WEBHOOK_HMAC_SECRET")!;

function parsePixAmount(valor: unknown): number {
  if (typeof valor === "number") return valor;
  if (typeof valor === "string") return Number(valor);
  if (valor && typeof valor === "object") {
    const original = (valor as Record<string, unknown>).original;
    if (typeof original === "number") return original;
    if (typeof original === "string") return Number(original);
  }
  return Number.NaN;
}

async function verifyHmac(rawBody: string, signature: string | null): Promise<boolean> {
  if (!signature || !HMAC_SECRET) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(HMAC_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  // Constant-time compare
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const rawBody = await req.text();

  // EFI sends PIX notifications without signature by default; HMAC is optional
  // and configured server-side. Validate when present.
  const sig = req.headers.get("x-webhook-signature") || req.headers.get("X-Webhook-Signature");
  if (HMAC_SECRET && sig) {
    const ok = await verifyHmac(rawBody, sig);
    if (!ok) {
      console.warn("Invalid webhook HMAC signature");
      return new Response("Invalid signature", { status: 401, headers: corsHeaders });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: corsHeaders });
  }

  // EFI sends { pix: [{ txid, valor, endToEndId, ... }] }
  const pixEvents: any[] = payload?.pix || [];
  if (!Array.isArray(pixEvents) || pixEvents.length === 0) {
    // EFI also sends a test ping at /pix; respond 200
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  for (const ev of pixEvents) {
    const txid: string | undefined = ev.txid;
    const e2eId: string | undefined = ev.endToEndId;
    const valor = parsePixAmount(ev.valor);

    if (!txid || !Number.isFinite(valor) || valor <= 0) continue;

    // Locate order by txid
    const { data: order } = await supabase
      .from("orders")
      .select("id, restaurant_id, total, payment_status")
      .eq("pix_txid", txid)
      .maybeSingle();

    if (!order) {
      console.warn(`No order found for txid ${txid}`);
      continue;
    }
    if (order.payment_status === "pago") {
      // Idempotent — already processed
      continue;
    }

    const orderTotal = Number(order.total);
    if (Math.abs(orderTotal - valor) > 0.01) {
      console.error(`PIX amount mismatch for txid ${txid}: expected=${orderTotal} received=${valor}`);
      await supabase
        .from("pix_transactions")
        .update({ status: "failed", error_message: `Amount mismatch: expected ${orderTotal}, received ${valor}`, raw_payload: ev })
        .eq("order_id", order.id)
        .eq("transaction_type", "cobranca")
        .eq("status", "pending");
      continue;
    }

    // Mark as paid
    await supabase
      .from("orders")
      .update({
        payment_status: "pago",
        pix_paid_at: new Date().toISOString(),
        pix_e2e_id: e2eId || null,
        status: "new",
      })
      .eq("id", order.id);

    // Update charge ledger entry
    await supabase
      .from("pix_transactions")
      .update({ status: "success", efi_e2e_id: e2eId || null, raw_payload: ev })
      .eq("order_id", order.id)
      .eq("transaction_type", "cobranca");

    // Lookup restaurant PIX key for repasse
    const { data: pm } = await supabase
      .from("payment_methods")
      .select("restaurant_pix_key, restaurant_pix_key_type")
      .eq("restaurant_id", order.restaurant_id)
      .eq("method_type", "pix")
      .maybeSingle();

    const repasseAmount = Math.max(0, Number(order.total) - PLATFORM_FEE);

    // Record platform fee
    await supabase.from("pix_transactions").insert({
      order_id: order.id,
      restaurant_id: order.restaurant_id,
      transaction_type: "taxa_plataforma",
      status: "success",
      amount: PLATFORM_FEE,
    });

    if (!pm?.restaurant_pix_key || repasseAmount <= 0) {
      await supabase.from("pix_transactions").insert({
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        transaction_type: "repasse",
        status: "failed",
        amount: repasseAmount,
        error_message: "Restaurant PIX key missing or zero amount",
      });
      continue;
    }

    // Trigger immediate PIX repasse
    try {
      const result = await sendPix({
        amount: repasseAmount,
        destinationKey: pm.restaurant_pix_key,
        description: `Repasse pedido ${order.id.slice(0, 8)}`,
      });
      await supabase.from("pix_transactions").insert({
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        transaction_type: "repasse",
        status: "success",
        amount: repasseAmount,
        destination_pix_key: pm.restaurant_pix_key,
        destination_pix_key_type: pm.restaurant_pix_key_type,
        efi_endtoend: result?.endToEndId || result?.idEnvio || null,
        raw_payload: result,
      });
    } catch (err) {
      console.error("Repasse failed:", err);
      await supabase
        .from("orders")
        .update({ payment_status: "falha_repasse" })
        .eq("id", order.id);
      await supabase.from("pix_transactions").insert({
        order_id: order.id,
        restaurant_id: order.restaurant_id,
        transaction_type: "repasse",
        status: "failed",
        amount: repasseAmount,
        destination_pix_key: pm.restaurant_pix_key,
        error_message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

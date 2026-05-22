import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createPixCharge } from "../_shared/validapay-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIX_EXPIRATION_SECONDS = 5 * 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { order_id, amount } = body;
    if (!order_id || typeof amount !== "number" || amount <= 0 || amount > 10000) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, restaurant_id, total, payment_status, validapay_charge_id, pix_qrcode, pix_copia_cola, pix_expires_at")
      .eq("id", order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (Math.abs(Number(order.total) - amount) > 0.01) {
      return new Response(JSON.stringify({ error: "Amount mismatch" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.payment_status === "pago") {
      return new Response(JSON.stringify({ error: "Order already paid" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Reuse active charge if present
    const now = Date.now();
    const exp = order.pix_expires_at ? new Date(order.pix_expires_at).getTime() : 0;
    if (
      order.validapay_charge_id &&
      order.pix_copia_cola &&
      exp > now &&
      ["aguardando_pagamento", "pendente"].includes(order.payment_status)
    ) {
      return new Response(
        JSON.stringify({
          txid: order.validapay_charge_id,
          qrcode: order.pix_qrcode,
          copia_cola: order.pix_copia_cola,
          expires_at: order.pix_expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create new charge on ValidaPay
    const charge = await createPixCharge(amount);
    const expiresAt = new Date(Date.now() + PIX_EXPIRATION_SECONDS * 1000).toISOString();

    // Generate QR Code from EMV using public quickchart
    const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(charge.emv)}`;

    await supabase
      .from("orders")
      .update({
        payment_status: "pendente",
        validapay_charge_id: charge.chargeId,
        pix_txid: charge.chargeId,
        pix_qrcode: charge.qrcodeBase64 || qrcodeUrl,
        pix_copia_cola: charge.emv,
        pix_expires_at: expiresAt,
      })
      .eq("id", order_id);

    await supabase.from("pix_transactions").insert({
      order_id,
      restaurant_id: order.restaurant_id,
      transaction_type: "cobranca",
      status: "pending",
      amount,
      efi_txid: charge.chargeId,
    });

    return new Response(
      JSON.stringify({
        txid: charge.chargeId,
        qrcode: charge.qrcodeBase64 || qrcodeUrl,
        copia_cola: charge.emv,
        expires_at: expiresAt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("validapay-create-charge error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createPixCharge } from "../_shared/efi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PIX_EXPIRATION_SECONDS = 5 * 60; // 5 minutes

interface CreatePixRequest {
  order_id: string;
  amount: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: CreatePixRequest = await req.json();
    if (!body.order_id || typeof body.amount !== "number" || body.amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.amount > 10000) {
      return new Response(JSON.stringify({ error: "Amount exceeds maximum" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate order exists and amount matches
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, restaurant_id, total, payment_status, pix_txid, pix_qrcode, pix_copia_cola, pix_expires_at")
      .eq("id", body.order_id)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (Math.abs(Number(order.total) - body.amount) > 0.01) {
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

    const now = Date.now();
    const expiresAtTs = order.pix_expires_at ? new Date(order.pix_expires_at).getTime() : 0;
    const hasActiveCharge =
      order.payment_status === "aguardando_pagamento" &&
      !!order.pix_txid &&
      !!order.pix_qrcode &&
      !!order.pix_copia_cola &&
      expiresAtTs > now;

    if (hasActiveCharge) {
      return new Response(
        JSON.stringify({
          txid: order.pix_txid,
          qrcode: order.pix_qrcode,
          copia_cola: order.pix_copia_cola,
          expires_at: order.pix_expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Confirm restaurant has PIX online enabled
    const { data: pm } = await supabase
      .from("payment_methods")
      .select("pix_online_enabled, restaurant_pix_key")
      .eq("restaurant_id", order.restaurant_id)
      .eq("method_type", "pix")
      .maybeSingle();

    if (!pm?.pix_online_enabled || !pm?.restaurant_pix_key) {
      return new Response(JSON.stringify({ error: "PIX online not configured for restaurant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create EFI PIX charge
    const charge = await createPixCharge({
      amount: body.amount,
      expirationSeconds: PIX_EXPIRATION_SECONDS,
      description: `Pedido #${body.order_id.slice(0, 8)}`,
    });

    // Persist charge data on order
    const { error: updateOrderErr } = await supabase
      .from("orders")
      .update({
        payment_status: "aguardando_pagamento",
        pix_txid: charge.txid,
        pix_qrcode: charge.qrcode,
        pix_copia_cola: charge.copia_cola,
        pix_expires_at: charge.expires_at,
      })
      .eq("id", body.order_id);

    if (updateOrderErr) {
      throw new Error(`Failed to persist PIX charge on order: ${updateOrderErr.message}`);
    }

    // Ledger entry
    const { error: ledgerErr } = await supabase.from("pix_transactions").insert({
      order_id: body.order_id,
      restaurant_id: order.restaurant_id,
      transaction_type: "cobranca",
      status: "pending",
      amount: body.amount,
      efi_txid: charge.txid,
    });

    if (ledgerErr) {
      throw new Error(`Failed to create PIX transaction ledger entry: ${ledgerErr.message}`);
    }

    return new Response(
      JSON.stringify({
        txid: charge.txid,
        qrcode: charge.qrcode,
        copia_cola: charge.copia_cola,
        expires_at: charge.expires_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("create-pix-charge error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

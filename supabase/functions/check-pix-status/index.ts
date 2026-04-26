import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPixChargeStatus } from "../_shared/efi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const orderId = url.searchParams.get("order_id");
    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status, pix_txid, pix_expires_at")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already paid or expired, just return DB state
    if (order.payment_status === "pago") {
      return new Response(JSON.stringify({ status: "pago" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiration
    if (order.pix_expires_at && new Date(order.pix_expires_at) < new Date()) {
      if (order.payment_status === "aguardando_pagamento") {
        await supabase
          .from("orders")
          .update({ payment_status: "expirado", status: "cancelled" })
          .eq("id", orderId);
        await supabase
          .from("pix_transactions")
          .update({ status: "expired" })
          .eq("order_id", orderId)
          .eq("transaction_type", "cobranca")
          .eq("status", "pending");
      }
      return new Response(JSON.stringify({ status: "expirado" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Active polling fallback to EFI (in case webhook didn't arrive)
    if (order.pix_txid) {
      try {
        const efiStatus = await getPixChargeStatus(order.pix_txid);
        if (efiStatus?.status === "CONCLUIDA") {
          // Trigger webhook flow manually by calling pix-webhook with synthetic payload
          const e2e = efiStatus?.pix?.[0]?.endToEndId;
          await supabase.functions.invoke("pix-webhook", {
            body: { pix: [{ txid: order.pix_txid, valor: efiStatus?.valor?.original, endToEndId: e2e }] },
          });
          return new Response(JSON.stringify({ status: "pago" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.warn("EFI status check fallback failed:", e);
      }
    }

    return new Response(JSON.stringify({ status: order.payment_status }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("check-pix-status error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

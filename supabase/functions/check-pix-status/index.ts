import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getChargeStatus } from "../_shared/validapay-client.ts";

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
      .select("id, payment_status, pix_txid, validapay_charge_id, pix_expires_at")
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
      if (["aguardando_pagamento", "pendente"].includes(order.payment_status)) {
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

    // Active polling fallback to ValidaPay (in case webhook didn't arrive)
    const chargeId = order.validapay_charge_id || order.pix_txid;
    if (chargeId) {
      try {
        const validapayStatus = await getChargeStatus(chargeId);
        const normalizedStatus = String(validapayStatus?.status || "").toLowerCase();
        if (["paid", "approved", "aprovado", "concluida", "completed"].includes(normalizedStatus)) {
          await supabase.functions.invoke("validapay-webhook", {
            body: { event: "charge.paid", data: { chargeId, amount: validapayStatus?.amount } },
          });
          return new Response(JSON.stringify({ status: "pago" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.warn("ValidaPay status check fallback failed:", e);
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

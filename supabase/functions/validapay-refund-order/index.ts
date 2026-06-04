import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createRefund } from "../_shared/validapay-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
    if (authErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;

    const body = await req.json();
    const { order_id, reason } = body;
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: order } = await admin
      .from("orders")
      .select("id, restaurant_id, total, payment_status, payment_method, validapay_charge_id, restaurants!inner(user_id, validapay_subaccount_id)")
      .eq("id", order_id)
      .single();
    const subaccountId = (order as any)?.restaurants?.validapay_subaccount_id || undefined;
    if (!order || (order as any).restaurants.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order.payment_status !== "pago" || order.payment_method !== "pix_online") {
      return new Response(JSON.stringify({ error: "Pedido não é PIX pago" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!order.validapay_charge_id) {
      return new Response(JSON.stringify({ error: "Pedido sem charge_id ValidaPay" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = Number(order.total);

    // Insert refund row
    const { data: refund, error: refErr } = await admin
      .from("refund_transactions")
      .insert({
        order_id,
        restaurant_id: order.restaurant_id,
        amount,
        reason: reason || "Cancelamento solicitado pelo restaurante",
        reason_code: "CUSTOMER_REQUEST",
        status: "processing",
      })
      .select("id")
      .single();
    if (refErr) throw refErr;

    try {
      const result = await createRefund({
        chargeId: order.validapay_charge_id,
        amount,
        reasonCode: "CUSTOMER_REQUEST",
        accountId: subaccountId,
      });

      await admin
        .from("refund_transactions")
        .update({
          status: "completed",
          validapay_refund_id: result.refundId || result.id || null,
          completed_at: new Date().toISOString(),
          raw_payload: result,
        })
        .eq("id", refund.id);

      // Update order
      await admin
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "reembolsado",
          refunded_at: new Date().toISOString(),
        })
        .eq("id", order_id);

      // Wallet entry — debit the previously-credited net amount
      const { data: wallet } = await admin
        .from("wallets")
        .select("id")
        .eq("restaurant_id", order.restaurant_id)
        .single();

      // Find original sale tx to know the net amount that was credited
      const { data: saleTx } = await admin
        .from("wallet_transactions")
        .select("net_amount")
        .eq("order_id", order_id)
        .eq("transaction_type", "venda")
        .maybeSingle();
      const debit = Number(saleTx?.net_amount ?? amount);

      await admin.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        restaurant_id: order.restaurant_id,
        order_id,
        refund_id: refund.id,
        transaction_type: "reembolso",
        amount: debit,
        fee: 0,
        net_amount: -debit,
        status: "completed",
        description: `Reembolso pedido #${order_id.slice(0, 8)}`,
      });

      return new Response(JSON.stringify({ success: true, refund_id: refund.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      await admin
        .from("refund_transactions")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : String(err),
        })
        .eq("id", refund.id);
      throw err;
    }
  } catch (err) {
    console.error("validapay-refund-order error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

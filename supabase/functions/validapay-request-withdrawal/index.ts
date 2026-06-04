import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createWithdrawal } from "../_shared/validapay-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Hardcoded BR national holidays for 2026 (extend as needed)
const BR_HOLIDAYS_2026 = new Set([
  "2026-01-01","2026-02-16","2026-02-17","2026-04-03","2026-04-21",
  "2026-05-01","2026-06-04","2026-09-07","2026-10-12","2026-11-02",
  "2026-11-15","2026-12-25",
]);

function isBusinessDay(d: Date): boolean {
  const day = d.getUTCDay();
  if (day === 0 || day === 6) return false;
  const ymd = d.toISOString().slice(0, 10);
  if (BR_HOLIDAYS_2026.has(ymd)) return false;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth: require logged-in user
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
    const { data: userData, error: authErr } = await userClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { restaurant_id, amount } = body;
    if (!restaurant_id || typeof amount !== "number" || amount <= 0) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Verify ownership
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("id, user_id")
      .eq("id", restaurant_id)
      .single();
    if (!restaurant || restaurant.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Business day check
    if (!isBusinessDay(new Date())) {
      return new Response(JSON.stringify({ error: "Saques disponíveis apenas em dias úteis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load gateway settings
    const { data: settings } = await admin
      .from("payment_gateway_settings")
      .select("withdrawal_fee, minimum_withdrawal")
      .limit(1)
      .single();
    const fee = Number(settings?.withdrawal_fee ?? 5);
    const minimum = Number(settings?.minimum_withdrawal ?? 10);

    if (amount < minimum) {
      return new Response(JSON.stringify({ error: `Valor mínimo: R$ ${minimum.toFixed(2)}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (amount <= fee) {
      return new Response(JSON.stringify({ error: `Valor deve ser maior que a taxa de R$ ${fee.toFixed(2)}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // PIX key check
    const { data: pm } = await admin
      .from("payment_methods")
      .select("restaurant_pix_key, restaurant_pix_key_type, restaurant_pix_key_holder_name, restaurant_pix_key_holder_document")
      .eq("restaurant_id", restaurant_id)
      .eq("method_type", "pix")
      .maybeSingle();
    if (!pm?.restaurant_pix_key || !pm?.restaurant_pix_key_holder_name || !pm?.restaurant_pix_key_holder_document) {
      return new Response(
        JSON.stringify({ error: "Cadastre chave PIX, nome e documento do titular antes de sacar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Balance check (considering pending withdrawals)
    const { data: availData } = await admin.rpc("get_available_for_withdrawal", { _restaurant_id: restaurant_id });
    const available = Number(availData ?? 0);
    if (amount > available) {
      return new Response(
        JSON.stringify({ error: `Saldo insuficiente. Disponível: R$ ${available.toFixed(2)}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const netAmount = amount - fee;

    // Create withdrawal_requests row first (UNIQUE INDEX blocks concurrent pending)
    const { data: wr, error: wrErr } = await admin
      .from("withdrawal_requests")
      .insert({
        restaurant_id,
        user_id: userId,
        gross_amount: amount,
        fee,
        net_amount: netAmount,
        status: "processing",
        pix_key: pm.restaurant_pix_key,
        pix_key_type: pm.restaurant_pix_key_type || "auto",
        holder_name: pm.restaurant_pix_key_holder_name,
        holder_document: pm.restaurant_pix_key_holder_document,
      })
      .select("id")
      .single();
    if (wrErr) {
      const isDuplicate = String(wrErr.message || "").includes("uniq_pending_withdrawal");
      return new Response(
        JSON.stringify({
          error: isDuplicate
            ? "Já existe um saque em andamento. Aguarde a conclusão."
            : wrErr.message,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Call ValidaPay
    try {
      const result = await createWithdrawal({
        amount: netAmount,
        pixKey: pm.restaurant_pix_key,
        pixKeyType: pm.restaurant_pix_key_type || "auto",
        holderName: pm.restaurant_pix_key_holder_name,
        holderDocument: pm.restaurant_pix_key_holder_document,
      });

      await admin
        .from("withdrawal_requests")
        .update({
          status: "completed",
          validapay_withdrawal_id: result.withdrawalId || result.id || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", wr.id);

      // Get wallet
      const { data: wallet } = await admin
        .from("wallets")
        .select("id")
        .eq("restaurant_id", restaurant_id)
        .single();

      await admin.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        restaurant_id,
        withdrawal_id: wr.id,
        transaction_type: "saque",
        amount,
        fee,
        net_amount: netAmount,
        status: "completed",
        description: `Saque para chave PIX ${pm.restaurant_pix_key.slice(0, 4)}…`,
        metadata: { validapay: result },
      });

      return new Response(JSON.stringify({ success: true, withdrawal_id: wr.id }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      await admin
        .from("withdrawal_requests")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : String(err),
        })
        .eq("id", wr.id);
      throw err;
    }
  } catch (err) {
    console.error("validapay-request-withdrawal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

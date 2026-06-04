import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createWithdrawal } from "../_shared/validapay-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractValidaPayError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const jsonStart = message.indexOf("{\"error\"");
  if (jsonStart === -1) return { message, code: null as string | null };

  try {
    const parsed = JSON.parse(message.slice(jsonStart));
    return {
      message: parsed?.error?.message || message,
      code: parsed?.error?.code || null,
    };
  } catch {
    return { message, code: null as string | null };
  }
}

function withdrawalErrorResponse(err: unknown) {
  const parsed = extractValidaPayError(err);
  if (parsed.code === "OWNERSHIP_MISMATCH") {
    return {
      status: 400,
      body: {
        error: "A chave PIX não pertence ao CPF/CNPJ informado. Confira a chave, o tipo da chave e o documento do titular no cadastro PIX.",
        code: parsed.code,
      },
    };
  }
  if (parsed.message.includes("Não encontramos a chave informada")) {
    return {
      status: 400,
      body: {
        error: "Chave PIX não encontrada. Confira se a chave e o tipo selecionado estão corretos.",
        code: parsed.code || "PIX_KEY_NOT_FOUND",
      },
    };
  }
  if (parsed.message.includes("ValidaPay /v1/wallet/withdraw failed [400]")) {
    return { status: 400, body: { error: parsed.message, code: parsed.code || "WITHDRAWAL_REJECTED" } };
  }
  return { status: 500, body: { error: parsed.message || "Unknown error", code: parsed.code } };
}

// Feriados e dias úteis — desativado para testes livres
// const BR_HOLIDAYS_2026 = new Set([...]);
// function isBusinessDay(d: Date): boolean { ... }

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

    // Business day check — DESATIVADO para testes livres
    // if (!isBusinessDay(new Date())) { ... }

    // Load gateway settings
    const { data: settings } = await admin
      .from("payment_gateway_settings")
      .select("withdrawal_fee, minimum_withdrawal")
      .limit(1)
      .single();
    const fee = Number(settings?.withdrawal_fee ?? 5);
    // Valor mínimo DESATIVADO para testes livres
    // const minimum = Number(settings?.minimum_withdrawal ?? 10);

    // if (amount < minimum) { ... }

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

    const { data: wallet } = await admin
      .from("wallets")
      .select("id")
      .eq("restaurant_id", restaurant_id)
      .single();
    if (!wallet?.id) {
      return new Response(JSON.stringify({ error: "Carteira não encontrada para este restaurante" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

    // Normalize PIX key per type (Celcoin/ValidaPay strict format)
    const rawKey = String(pm.restaurant_pix_key).trim();
    const keyType = (pm.restaurant_pix_key_type || "auto").toLowerCase();
    let formattedKey = rawKey;
    if (keyType === "phone" || keyType === "celular" || keyType === "telefone") {
      const digits = rawKey.replace(/\D/g, "");
      // Brazilian phone PIX must be E.164: +55DDDNNNNNNNNN
      const withCountry = digits.startsWith("55") ? digits : `55${digits}`;
      formattedKey = `+${withCountry}`;
    } else if (keyType === "cpf" || keyType === "cnpj" || keyType === "document") {
      formattedKey = rawKey.replace(/\D/g, "");
    } else if (keyType === "email") {
      formattedKey = rawKey.toLowerCase();
    }

    // Call ValidaPay
    try {
      const result = await createWithdrawal({
        amount: netAmount,
        pixKey: formattedKey,
        pixKeyType: keyType,
        holderName: pm.restaurant_pix_key_holder_name,
        holderDocument: String(pm.restaurant_pix_key_holder_document).replace(/\D/g, ""),
      });

      await admin
        .from("withdrawal_requests")
        .update({
          status: "completed",
          validapay_withdrawal_id: result.withdrawalId || result.id || null,
          processed_at: new Date().toISOString(),
        })
        .eq("id", wr.id);

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
      const mapped = withdrawalErrorResponse(err);
      return new Response(JSON.stringify(mapped.body), {
        status: mapped.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("validapay-request-withdrawal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

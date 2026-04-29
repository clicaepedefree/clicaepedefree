// Reconcile pending PIX repasses by querying EFI for their final status.
// Called by the Reports page (or a scheduled job) to update orders whose
// repasse_status is still "processando" with the real EFI status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getPixSendStatus } from "../_shared/efi-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUser = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  // Resolve current user
  const { data: userData, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Find restaurant(s) owned by this user
  const { data: restaurants } = await supabase
    .from("restaurants")
    .select("id")
    .eq("user_id", userId);

  const restaurantIds = (restaurants || []).map((r) => r.id);
  if (restaurantIds.length === 0) {
    return new Response(JSON.stringify({ updated: 0, checked: 0 }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Find orders whose repasse is still processing
  const { data: pending } = await supabase
    .from("orders")
    .select("id, repasse_id_envio")
    .in("restaurant_id", restaurantIds)
    .eq("repasse_status", "processando")
    .not("repasse_id_envio", "is", null)
    .limit(50);

  let updated = 0;
  const checked = pending?.length || 0;

  for (const order of pending || []) {
    if (!order.repasse_id_envio) continue;
    try {
      const efi: any = await getPixSendStatus(order.repasse_id_envio);
      const status = String(efi?.status || "").toUpperCase();
      let newStatus: string | null = null;
      let txStatus: string | null = null;

      if (status === "REALIZADO") {
        newStatus = "recebido";
        txStatus = "success";
      } else if (status === "NAO_REALIZADO") {
        newStatus = "falhou";
        txStatus = "failed";
      }

      if (newStatus) {
        await supabase
          .from("orders")
          .update({
            repasse_status: newStatus,
            repasse_confirmed_at: newStatus === "recebido" ? (efi?.horario?.solicitacao || new Date().toISOString()) : null,
          })
          .eq("id", order.id);

        await supabase
          .from("pix_transactions")
          .update({ status: txStatus, raw_payload: efi, efi_endtoend: efi?.endToEndId || null, efi_e2e_id: efi?.endToEndId || null })
          .eq("order_id", order.id)
          .eq("transaction_type", "repasse");

        updated++;
      }
    } catch (err) {
      console.error(`Failed to reconcile ${order.repasse_id_envio}:`, err);
    }
  }

  return new Response(JSON.stringify({ checked, updated }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

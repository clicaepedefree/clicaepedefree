import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createProposal } from "../_shared/validapay-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: authErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const { restaurant_id, payload } = body;
    if (!restaurant_id || !payload || (payload.type !== "PF" && payload.type !== "PJ")) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: restaurant } = await admin
      .from("restaurants").select("id, user_id").eq("id", restaurant_id).single();
    if (!restaurant || restaurant.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Block resubmission while pending/approved
    const { data: existing } = await admin
      .from("validapay_subaccounts")
      .select("id, status")
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();
    if (existing && existing.status !== "rejected") {
      return new Response(
        JSON.stringify({ error: "Já existe um cadastro em análise ou aprovado." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const holderName = payload.type === "PF" ? payload.fullName : payload.companyName;
    const holderDocument = String(payload.document || "").replace(/\D/g, "");
    const holderEmail = payload.email;
    const holderPhone = payload.phone;

    if (!holderName || !holderDocument) {
      return new Response(JSON.stringify({ error: "Nome e documento obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let proposal: any;
    try {
      proposal = await createProposal(payload);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response(JSON.stringify({ error: msg }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upsertRow = {
      restaurant_id,
      account_type: payload.type,
      status: "pending",
      form_id: proposal.formId || proposal.id || null,
      holder_name: holderName,
      holder_document: holderDocument,
      holder_email: holderEmail,
      holder_phone: holderPhone,
      raw_request: payload,
      raw_response: proposal,
    };

    if (existing) {
      await admin.from("validapay_subaccounts")
        .update({ ...upsertRow, rejection_reason: null })
        .eq("id", existing.id);
    } else {
      await admin.from("validapay_subaccounts").insert(upsertRow);
    }

    return new Response(JSON.stringify({ success: true, formId: proposal.formId || null }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("validapay-create-subaccount error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyWebhookSignature } from "../_shared/validapay-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-validapay-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-validapay-signature") || req.headers.get("X-Signature");
  const valid = await verifyWebhookSignature(rawBody, signature);
  // Allow unsigned in non-prod environments (sandbox)
  if (!valid && Deno.env.get("VALIDAPAY_ENVIRONMENT") === "production") {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let payload: any = {};
  try { payload = JSON.parse(rawBody); } catch { /* noop */ }

  const event = payload.event || payload.type || "";
  const data = payload.data || payload;
  const formId = data.formId || data.proposalId || data.id;

  if (!formId) {
    return new Response(JSON.stringify({ error: "Missing formId" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: sub } = await admin
    .from("validapay_subaccounts").select("id, restaurant_id").eq("form_id", formId).maybeSingle();
  if (!sub) {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const isApproved =
    /approved|aprovad/i.test(event) ||
    /approved|aprovad/i.test(data.status || "");
  const isRejected =
    /rejected|reprovad|denied/i.test(event) ||
    /rejected|reprovad|denied/i.test(data.status || "");

  if (isApproved) {
    const subaccountId = data.subaccountId || data.accountId || data.id || null;
    await admin.from("validapay_subaccounts").update({
      status: "approved",
      subaccount_id: subaccountId,
      subaccount_number: data.account || data.accountNumber || null,
      branch: data.branch || null,
      ispb: data.ispb || null,
      approved_at: new Date().toISOString(),
      raw_response: data,
    }).eq("id", sub.id);

    if (subaccountId) {
      await admin.from("restaurants")
        .update({ validapay_subaccount_id: subaccountId })
        .eq("id", sub.restaurant_id);
    }
  } else if (isRejected) {
    await admin.from("validapay_subaccounts").update({
      status: "rejected",
      rejection_reason: data.reason || data.message || "Cadastro reprovado",
      raw_response: data,
    }).eq("id", sub.id);
  } else {
    // status update
    await admin.from("validapay_subaccounts")
      .update({ raw_response: data }).eq("id", sub.id);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const Body = z.object({ productId: z.string().uuid(), objective: z.string().max(40).optional() });
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Faça login novamente." }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Faça login novamente." }, 401);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Dados inválidos." }, 400);

    // RLS garante que só o dono da loja enxerga o produto
    const { data: product } = await supabase
      .from("products")
      .select("name, description, price, restaurant_id, restaurants(name)")
      .eq("id", parsed.data.productId)
      .maybeSingle();
    if (!product) return json({ error: "Produto não encontrado." }, 404);
    const { data: owner } = await supabase.from("restaurants").select("id")
      .eq("id", product.restaurant_id).eq("user_id", u.user.id).maybeSingle();
    const { data: isAdmin } = await supabase.rpc("is_super_admin", { check_user_id: u.user.id });
    if (!owner && !isAdmin) return json({ error: "Sem permissão para este produto." }, 403);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "IA não configurada." }, 500);

    const prompt = `Crie um anúncio para Facebook/Instagram em português do Brasil.
Restaurante: ${(product as any).restaurants?.name ?? ""}
Produto: ${product.name}
Descrição: ${product.description ?? ""}
Preço: R$ ${Number(product.price).toFixed(2).replace(".", ",")}
Objetivo: ${parsed.data.objective ?? "tráfego para o cardápio"}
Regras: título até 40 caracteres; texto principal até 300 caracteres, apetitoso, com convite para pedir pelo cardápio digital; não prometa resultados, descontos ou prazos que não foram informados; sem hashtags exageradas.
cta deve ser um destes: ORDER_NOW, LEARN_MORE, SHOP_NOW.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        input: [{ role: "user", content: prompt }],
        text: {
          format: {
            type: "json_schema", name: "ad_copy", strict: true,
            schema: {
              type: "object", additionalProperties: false,
              required: ["headline", "primaryText", "cta"],
              properties: {
                headline: { type: "string" },
                primaryText: { type: "string" },
                cta: { type: "string", enum: ["ORDER_NOW", "LEARN_MORE", "SHOP_NOW"] },
              },
            },
          },
        },
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text();
      console.error("AI error", res.status, t);
      const msg = res.status === 429 ? "Muitas solicitações, tente em instantes."
        : res.status === 402 ? "Créditos de IA esgotados."
        : "Não foi possível gerar o texto agora.";
      return json({ error: msg }, res.status === 429 || res.status === 402 || res.status === 403 ? res.status : 502);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        const d = l.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta") out += ev.delta;
        } catch { /* ignore */ }
      }
    }
    const copy = JSON.parse(out);
    return json(copy);
  } catch (e) {
    console.error(e);
    return json({ error: "Erro ao gerar o anúncio." }, 500);
  }
});

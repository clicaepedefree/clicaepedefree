import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    const { type, content, url, restaurant_id, mode } = await req.json();

    if (!restaurant_id) throw new Error("restaurant_id is required");

    // Verify user owns the restaurant
    const { data: restaurant, error: restError } = await supabaseClient
      .from("restaurants")
      .select("id, user_id")
      .eq("id", restaurant_id)
      .single();

    if (restError || !restaurant) throw new Error("Restaurant not found");
    if (restaurant.user_id !== user.id) throw new Error("Unauthorized");

    let menuText = "";

    if (type === "url") {
      if (!url) throw new Error("URL is required");
      let target = url.trim();
      if (!/^https?:\/\//i.test(target)) target = `https://${target}`;
      let parsed: URL;
      try {
        parsed = new URL(target);
      } catch {
        throw new Error("Link inválido. Verifique o endereço informado.");
      }
      if (!["http:", "https:"].includes(parsed.protocol)) {
        throw new Error("Link inválido. Use um endereço http(s).");
      }

      const clean = (raw: string) =>
        raw
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
          .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&nbsp;/g, " ")
          .replace(/&#\d+;/g, "")
          .replace(/&\w+;/g, "")
          .replace(/[^\x20-\x7E\xC0-\xFF\u00C0-\u024F\n]/g, " ")
          .replace(/[ \t]+/g, " ")
          .replace(/\n{3,}/g, "\n\n")
          .trim()
          .slice(0, 30000);

      const fetchWithTimeout = async (u: string, headers: Record<string, string>) => {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 25000);
        try {
          return await fetch(u, { headers, redirect: "follow", signal: ctrl.signal });
        } finally {
          clearTimeout(t);
        }
      };

      const browserHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      };

      // Extract embedded JSON payloads (Next.js/Nuxt/JSON-LD) used by iFood, Goomer, Anota AI...
      const extractEmbedded = (html: string) => {
        const chunks: string[] = [];
        const re = /<script[^>]*>([\s\S]*?)<\/script>/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(html))) {
          const body = m[1];
          if (!body) continue;
          if (/"price"|"preco"|"products"|"menu"|"itens"|"items"/i.test(body) && body.length > 200) {
            chunks.push(body);
          }
        }
        return chunks.join("\n").slice(0, 30000);
      };

      const score = (t: string) => (t && /\d/.test(t) ? t.length : 0);
      const consider = (t: string) => {
        if (score(t) > score(menuText)) menuText = t;
      };

      // 1) Direct fetch
      let directError = "";
      try {
        const resp = await fetchWithTimeout(parsed.toString(), browserHeaders);
        if (resp.ok) {
          const html = await resp.text();
          const embedded = extractEmbedded(html);
          consider(clean(html));
          if (embedded) consider(clean(embedded));
        } else {
          directError = `HTTP ${resp.status}`;
        }
      } catch (e) {
        directError = (e as Error).message;
      }

      // 2) Fallbacks: reader / CORS proxies (handle JS-rendered or bot-blocked menus)
      const looksThin = () => !menuText || menuText.length < 400 || !/\d/.test(menuText);
      if (looksThin()) {
        console.log("Direct fetch insufficient, trying proxies.", directError);
        const target = parsed.toString();
        const proxies: { url: string; headers: Record<string, string>; raw?: boolean }[] = [
          {
            url: `https://r.jina.ai/${target}`,
            headers: { "User-Agent": browserHeaders["User-Agent"], Accept: "text/plain,*/*" },
            raw: true,
          },
          {
            url: `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
            headers: browserHeaders,
          },
          {
            url: `https://corsproxy.io/?url=${encodeURIComponent(target)}`,
            headers: browserHeaders,
          },
          {
            url: `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(target)}`,
            headers: browserHeaders,
          },
        ];

        for (const p of proxies) {
          if (!looksThin()) break;
          try {
            const resp = await fetchWithTimeout(p.url, p.headers);
            if (!resp.ok) {
              console.error("Proxy failed:", p.url.split("/")[2], resp.status);
              continue;
            }
            const body = (await resp.text()).slice(0, 200000);
            if (p.raw) {
              consider(body.trim().slice(0, 30000));
            } else {
              const embedded = extractEmbedded(body);
              consider(clean(body));
              if (embedded) consider(clean(embedded));
            }
          } catch (e) {
            console.error("Proxy error:", p.url.split("/")[2], (e as Error).message);
          }
        }
      }

      if (!menuText || menuText.length < 100) {
        throw new Error(
          `Não foi possível ler o cardápio desse link${directError ? ` (${directError})` : ""}. Tente outro link ou importe o PDF.`,
        );
      }

    } else if (type === "pdf") {

      if (!content) throw new Error("PDF content is required");
      menuText = content.slice(0, 30000);
    } else {
      throw new Error("Invalid type. Use 'url' or 'pdf'");
    }

    if (!menuText || menuText.length < 20) {
      throw new Error("Conteúdo insuficiente para extrair um cardápio");
    }

    console.log("Sending to Gemini, content length:", menuText.length);

    const systemPrompt = `Você é um assistente especializado em extrair cardápios de restaurantes brasileiros.
Analise o conteúdo fornecido e extraia TODAS as categorias e produtos encontrados.

REGRAS:
- Extraia o nome de cada categoria (ex: Lanches, Bebidas, Pizzas, Sobremesas)
- Para cada produto, extraia: nome, descrição (se houver), preço
- IMPORTANTE: Os nomes dos produtos e categorias devem estar em português brasileiro, usando apenas caracteres latinos (A-Z, a-z, acentos como á, é, ç, etc). NUNCA use caracteres asiáticos, símbolos estranhos ou caracteres não-latinos.
- Se algum texto parecer corrompido ou ilegível, tente interpretar o nome correto do produto pelo contexto.
- Se o preço não for claro, coloque 0
- Mantenha a ordem original do cardápio
- Ignore informações que não são itens do cardápio (endereço, telefone, etc)
- Se encontrar adicionais/complementos, inclua na descrição do produto
- Preços devem ser números (ex: 25.90, não "R$ 25,90")`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Extraia o cardápio do seguinte conteúdo:\n\n${menuText}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_menu",
              description: "Extrair categorias e produtos de um cardápio",
              parameters: {
                type: "object",
                properties: {
                  categories: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Nome da categoria" },
                        products: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              name: { type: "string", description: "Nome do produto" },
                              description: { type: "string", description: "Descrição do produto" },
                              price: { type: "number", description: "Preço em reais (ex: 25.90)" },
                            },
                            required: ["name", "price"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "products"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["categories"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_menu" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes para IA." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Erro ao processar com IA");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("IA não retornou dados estruturados");

    const extracted = JSON.parse(toolCall.function.arguments);
    console.log("Extracted categories:", extracted.categories?.length);

    // If mode is "preview", just return the extracted data
    if (mode === "preview") {
      return new Response(JSON.stringify({ success: true, data: extracted }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode "import" - save to database
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let categoriesCreated = 0;
    let productsCreated = 0;

    for (let i = 0; i < extracted.categories.length; i++) {
      const cat = extracted.categories[i];

      const { data: categoryData, error: catError } = await serviceClient
        .from("categories")
        .insert({
          restaurant_id,
          name: cat.name,
          display_order: i,
        })
        .select("id")
        .single();

      if (catError) {
        console.error("Error creating category:", catError);
        continue;
      }

      categoriesCreated++;

      for (let j = 0; j < cat.products.length; j++) {
        const prod = cat.products[j];
        const { error: prodError } = await serviceClient
          .from("products")
          .insert({
            restaurant_id,
            category_id: categoryData.id,
            name: prod.name,
            description: prod.description || "",
            price: prod.price || 0,
            display_order: j,
            is_active: true,
          });

        if (prodError) {
          console.error("Error creating product:", prodError);
          continue;
        }
        productsCreated++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        categoriesCreated,
        productsCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("import-menu error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

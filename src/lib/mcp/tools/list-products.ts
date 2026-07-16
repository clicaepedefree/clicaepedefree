declare const process: { env: Record<string, string | undefined> };
import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_products",
  title: "Listar produtos do cardápio",
  description: "Lista os produtos do cardápio de um restaurante do usuário.",
  inputSchema: {
    restaurantId: z.string().uuid().describe("ID do restaurante"),
    onlyActive: z.boolean().optional().describe("Retornar apenas produtos ativos"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ restaurantId, onlyActive }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("products")
      .select("id,name,description,price,category_id,is_active,is_featured,image_url,display_order")
      .eq("restaurant_id", restaurantId)
      .order("display_order", { ascending: true });
    if (onlyActive) query = query.eq("is_active", true);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { products: data ?? [] },
    };
  },
});

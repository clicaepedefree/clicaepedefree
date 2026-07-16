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
  name: "list_orders",
  title: "Listar pedidos",
  description:
    "Lista os pedidos mais recentes de um restaurante do usuário. Filtra opcionalmente por status.",
  inputSchema: {
    restaurantId: z.string().uuid().describe("ID do restaurante"),
    status: z
      .enum(["pending", "preparing", "delivering", "completed", "delivered", "cancelled"])
      .optional()
      .describe("Filtrar por status do pedido"),
    limit: z.number().int().min(1).max(200).optional().describe("Máximo de pedidos (padrão 50)"),
  },
  annotations: { readOnlyHint: true, openWorldHint: false },
  handler: async ({ restaurantId, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    let query = supabaseForUser(ctx)
      .from("orders")
      .select(
        "id,order_number,customer_name,customer_phone,status,payment_status,payment_method,subtotal,delivery_fee,total,created_at"
      )
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { orders: data ?? [] },
    };
  },
});

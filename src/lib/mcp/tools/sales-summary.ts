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
  name: "sales_summary",
  title: "Resumo de vendas",
  description:
    "Retorna quantidade de pedidos e faturamento de um restaurante em um período (pedidos cancelados são excluídos).",
  inputSchema: {
    restaurantId: z.string().uuid().describe("ID do restaurante"),
    days: z.number().int().min(1).max(90).optional().describe("Últimos N dias (padrão 30)"),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ restaurantId, days }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const window = days ?? 30;
    const since = new Date(Date.now() - window * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabaseForUser(ctx)
      .from("orders")
      .select("total,status,created_at")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", since);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const valid = (data ?? []).filter((o: any) => o.status !== "cancelled");
    const revenue = valid.reduce((sum: number, o: any) => sum + Number(o.total || 0), 0);
    const summary = {
      periodDays: window,
      totalOrders: valid.length,
      cancelledOrders: (data ?? []).length - valid.length,
      revenue: Number(revenue.toFixed(2)),
      averageTicket: valid.length ? Number((revenue / valid.length).toFixed(2)) : 0,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(summary) }],
      structuredContent: summary,
    };
  },
});

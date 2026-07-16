import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyRestaurants from "./tools/list-my-restaurants";
import listOrders from "./tools/list-orders";
import listProducts from "./tools/list-products";
import salesSummary from "./tools/sales-summary";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "clica-e-pede-mcp",
  title: "Clica e Pede",
  version: "0.1.0",
  instructions:
    "Ferramentas para consultar restaurantes, cardápio, pedidos e resumo de vendas do usuário autenticado no Clica e Pede. Todas as tools respeitam RLS: cada usuário só enxerga seus próprios dados.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyRestaurants, listOrders, listProducts, salesSummary],
});

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { eachDayOfInterval, endOfDay, format, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChartNoAxesCombined, Package, Receipt, ShoppingBag, Wallet } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

const periods = [
  { id: "today", label: "Hoje", start: startOfDay },
  { id: "week", label: "Semana", start: (date: Date) => startOfWeek(date, { weekStartsOn: 0 }) },
  { id: "month", label: "Mês", start: startOfMonth },
  { id: "60days", label: "60 dias", start: (date: Date) => startOfDay(subDays(date, 59)) },
  { id: "all", label: "Histórico", start: () => undefined },
] as const;

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const integer = new Intl.NumberFormat("pt-BR");
const chartConfig = { revenue: { label: "Valor", color: "hsl(var(--primary))" } };

type Order = Pick<Tables<"orders">, "id" | "total" | "created_at" | "items">;

function summarizeOrders(orders: Order[], start: Date | undefined, end: Date) {
  const products = new Map<string, { name: string; quantity: number }>();
  const revenueByDate = new Map<string, number>();
  const datePattern = start ? "yyyy-MM-dd" : "yyyy-MM";
  const labelPattern = start ? "dd/MM" : "MMM/yy";
  let revenue = 0;
  let units = 0;

  if (start) {
    for (const day of eachDayOfInterval({ start, end })) revenueByDate.set(format(day, datePattern), 0);
  }
  for (const order of orders) {
    const value = Number(order.total) || 0;
    const day = format(new Date(order.created_at), datePattern);
    revenue += value;
    revenueByDate.set(day, (revenueByDate.get(day) ?? 0) + value);
    if (!Array.isArray(order.items)) continue;
    for (const item of order.items) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const name = [item.productName, item.product_name, item.name]
        .find((value): value is string => typeof value === "string" && value.trim().length > 0)?.trim();
      if (!name) continue;
      const count = Number(item.quantity ?? 1);
      if (!Number.isFinite(count) || count <= 0) continue;
      const key = String(item.productId ?? item.product_id ?? name);
      const previous = products.get(key);
      products.set(key, { name, quantity: (previous?.quantity ?? 0) + count });
      units += count;
    }
  }
  return {
    revenue,
    orders: orders.length,
    units,
    products: [...products.entries()].sort(([, a], [, b]) => b.quantity - a.quantity).slice(0, 10),
    chart: [...revenueByDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({
      date,
      label: format(new Date(`${date}${start ? "" : "-01"}T12:00:00`), labelPattern, { locale: ptBR }),
      revenue,
    })),
  };
}

export function SalesDashboard({ restaurant }: { restaurant: { id: string; name: string } }) {
  const [periodId, setPeriodId] = useState<(typeof periods)[number]["id"]>("week");
  const period = periods.find(item => item.id === periodId) ?? periods[1];
  const now = new Date();
  const start = period.start(now);
  const end = endOfDay(now);

  const sales = useQuery({
    queryKey: ["dashboard-sales", restaurant.id, periodId, start?.toISOString() ?? null, end.toISOString()],
    queryFn: async ({ signal }) => {
      const orders: Order[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        let query = supabase.from("orders").select("id,total,created_at,items")
          .eq("restaurant_id", restaurant.id).neq("status", "cancelled")
          .lte("created_at", now.toISOString()).order("created_at").order("id");
        if (start) query = query.gte("created_at", start.toISOString());
        const { data, error } = await query.range(offset, offset + pageSize - 1).abortSignal(signal);
        if (error) throw error;
        orders.push(...data);
        if (data.length < pageSize) break;
      }
      return summarizeOrders(orders, start, end);
    },
  });

  const stats = sales.data;
  const cards = [
    { title: "Valor em pedidos", value: currency.format(stats?.revenue ?? 0), icon: Wallet, tone: "bg-primary/10 text-primary" },
    { title: "Pedidos", value: integer.format(stats?.orders ?? 0), icon: ShoppingBag, tone: "bg-orange-500/10 text-orange-700 dark:text-orange-300" },
    { title: "Ticket médio", value: currency.format(stats?.orders ? stats.revenue / stats.orders : 0), icon: Receipt, tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
    { title: "Itens em pedidos", value: integer.format(stats?.units ?? 0), icon: Package, tone: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" },
  ];

  return (
    <section aria-labelledby="sales-dashboard-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 id="sales-dashboard-title" className="text-2xl font-bold tracking-tight sm:text-3xl">Visão geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">{restaurant.name}</p>
        </div>
        <div role="group" aria-label="Período das vendas" className="flex max-w-full flex-wrap gap-1 rounded-xl border bg-card p-1 shadow-sm">
          {periods.map(item => (
            <Button key={item.id} type="button" size="sm" variant={item.id === periodId ? "default" : "ghost"}
              aria-pressed={item.id === periodId} onClick={() => setPeriodId(item.id)} className="h-8 px-2.5">
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      {sales.isPending ? (
        <div role="status" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <span className="sr-only">Carregando vendas</span>
          {cards.map(card => <Skeleton key={card.title} className="h-24 rounded-xl bg-muted" />)}
        </div>
      ) : sales.isError ? (
        <Card className="p-5">
          <p role="alert" className="mb-3 text-sm">Não foi possível carregar os dados de vendas.</p>
          <Button type="button" variant="outline" onClick={() => void sales.refetch()}>Tentar novamente</Button>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map(({ title, value, icon: Icon, tone }) => (
              <Card key={title} className="min-w-0 shadow-sm">
                <CardContent className="flex flex-col-reverse items-start justify-between gap-2 p-3 sm:flex-row sm:p-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</p>
                    <p className="mt-1 break-words text-lg font-bold tracking-tight tabular-nums xl:text-2xl">{value}</p>
                  </div>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg sm:size-9 ${tone}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <Card className="min-w-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Valor dos pedidos</CardTitle>
                <p className="text-sm text-muted-foreground">{start ? "Por dia no período selecionado" : "Por mês no histórico"}</p>
              </CardHeader>
              <CardContent>
                {stats?.orders ? (
                  <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
                    <LineChart accessibilityLayer data={stats.chart} margin={{ right: 12 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={22} />
                      <YAxis tickFormatter={value => currency.format(value)} tickLine={false} axisLine={false} width={82} />
                      <ChartTooltip content={<ChartTooltipContent formatter={value => currency.format(Number(value))} />} />
                      <Line type="linear" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2.5}
                        dot={stats.chart.length === 1} isAnimationActive={false} />
                    </LineChart>
                  </ChartContainer>
                ) : (
                  <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <ChartNoAxesCombined className="size-7" aria-hidden="true" /> Nenhum pedido neste período.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Produtos mais pedidos</CardTitle>
                <p className="text-sm text-muted-foreground">Até 10 produtos por quantidade no período</p>
              </CardHeader>
              <CardContent>
                {stats?.products.length ? (
                  <ol className="space-y-2">
                    {stats.products.map(([id, product]) => (
                      <li key={id} className="grid grid-cols-[minmax(0,1fr)_minmax(3rem,1fr)_auto] items-center gap-2 text-sm">
                        <span title={product.name} className="truncate">{product.name}</span>
                        <span className="h-2 rounded-full bg-muted" aria-hidden="true">
                          <span className="block h-full rounded-full bg-primary/75"
                            style={{ width: `${product.quantity / stats.products[0][1].quantity * 100}%` }} />
                        </span>
                        <span className="min-w-6 text-right tabular-nums">{integer.format(product.quantity)}</span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                    <Package className="size-7" aria-hidden="true" /> Nenhum produto nos pedidos deste período.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </section>
  );
}

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownUp, CreditCard, ReceiptText, RefreshCw, Wallet } from "lucide-react";
import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { dateLabel, money } from "@/lib/customers";
import { formatPaymentMethod, isPixOnline } from "@/lib/payment-labels";

const PAGE_SIZE = 20;
const QUERY_PAGE_SIZE = 500;
const saleDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
});
const number = new Intl.NumberFormat("pt-BR");

type Period = { from: string; to: string };
type Order = Pick<Database["public"]["Views"]["secure_orders_view"]["Row"],
  "id" | "order_number" | "customer_name" | "created_at" | "payment_method" | "payment_status" | "total">;

const paymentLabels: Record<string, string> = {
  pix: "Pix manual",
  pix_online: "Pix Online",
  meal_voucher: "Vale-refeição (VR)",
  food_voucher: "Vale-alimentação (VA)",
  card: "Cartão (sem modalidade)",
};

function paymentLabel(method: string | null) {
  return (method && paymentLabels[method]) || formatPaymentMethod(method);
}

function summarizeSales(orders: Order[]) {
  const methods = new Map<string | null, { count: number; cents: number }>();
  let total = 0;
  for (const order of orders) {
    const cents = Math.round(Number(order.total ?? 0) * 100);
    const method = order.payment_method;
    const previous = methods.get(method);
    methods.set(method, { count: (previous?.count ?? 0) + 1, cents: (previous?.cents ?? 0) + cents });
    total += cents;
  }
  return {
    total,
    methods: [...methods.entries()].sort(([, a], [, b]) => b.cents - a.cents),
  };
}

export default function CashOverview() {
  const { user, restaurant, loading, logout } = useAuth();
  const restaurantId = restaurant?.id;
  const today = saleDate.format(new Date());
  const [period, setPeriod] = useState<Period>(() => ({ from: today, to: today }));
  const [draft, setDraft] = useState(period);
  const [page, setPage] = useState(0);
  const [dateError, setDateError] = useState("");

  const sales = useQuery({
    queryKey: ["cash-sales", restaurantId, period.from, period.to],
    enabled: Boolean(user && restaurantId),
    queryFn: async ({ signal }) => {
      const from = new Date(`${period.from}T00:00:00Z`);
      const to = new Date(`${period.to}T00:00:00Z`);
      // Fetch through the next UTC day, then match calendar dates in São Paulo.
      to.setUTCDate(to.getUTCDate() + 2);
      const rows: Order[] = [];
      for (let offset = 0; ; offset += QUERY_PAGE_SIZE) {
        const { data, error } = await supabase.from("secure_orders_view")
          .select("id,order_number,customer_name,created_at,payment_method,payment_status,total")
          .eq("restaurant_id", restaurantId!)
          .eq("status", "completed").in("payment_status", ["pago", "not_required"])
          .gte("created_at", from.toISOString()).lt("created_at", to.toISOString())
          .order("created_at", { ascending: false }).order("id", { ascending: false })
          .range(offset, offset + QUERY_PAGE_SIZE - 1).abortSignal(signal);
        if (error) throw error;
        for (const order of data) {
          if (!order.created_at || (isPixOnline(order.payment_method) && order.payment_status !== "pago")) continue;
          const day = saleDate.format(new Date(order.created_at));
          if (day >= period.from && day <= period.to) rows.push(order);
        }
        if (data.length < QUERY_PAGE_SIZE) break;
      }
      return { rows, ...summarizeSales(rows) };
    },
  });

  if (loading) return <p role="status" className="p-6">Carregando...</p>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (!restaurant) return <Navigate to="/admin" replace />;

  const count = sales.data?.rows.length ?? 0;
  const total = sales.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleOrders = sales.data?.rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const applyPeriod = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.from || !draft.to || draft.from > draft.to) {
      setDateError("A data inicial deve ser anterior ou igual à data final.");
      return;
    }
    setDateError("");
    setPage(0);
    if (period.from === draft.from && period.to === draft.to) void sales.refetch();
    else setPeriod({ ...draft });
  };

  return (
    <AppShell restaurant={restaurant} onLogout={logout} title="Gestão de Caixa">
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Gestão de Caixa</h1>
            <p className="mt-1 text-sm text-muted-foreground">Consulte as vendas finalizadas por período e forma de pagamento.</p>
          </div>
          <Button type="button" variant="outline" disabled={sales.isFetching} onClick={() => void sales.refetch()}>
            <RefreshCw aria-hidden="true" className={`mr-2 size-4 ${sales.isFetching ? "animate-spin" : ""}`} />
            Atualizar vendas
          </Button>
        </header>

        <Card className="p-4 shadow-sm sm:p-5">
          <form onSubmit={applyPeriod} className="space-y-2" aria-label="Filtrar vendas por período">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-36 flex-1 space-y-1 sm:max-w-48">
                <Label htmlFor="cash-from">Data inicial</Label>
                <Input id="cash-from" type="date" required max={today} value={draft.from}
                  onChange={event => { setDraft(previous => ({ ...previous, from: event.target.value })); setDateError(""); }} />
              </div>
              <div className="min-w-36 flex-1 space-y-1 sm:max-w-48">
                <Label htmlFor="cash-to">Data final</Label>
                <Input id="cash-to" type="date" required max={today} value={draft.to}
                  onChange={event => { setDraft(previous => ({ ...previous, to: event.target.value })); setDateError(""); }} />
              </div>
              <Button type="submit" className="w-full sm:w-auto">Aplicar período</Button>
            </div>
            {dateError && <p role="alert" className="text-sm text-destructive">{dateError}</p>}
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Data do pedido · Horário de Brasília · {dateLabel(period.from + "T12:00:00Z")} a {dateLabel(period.to + "T12:00:00Z")}
            </p>
          </form>
        </Card>

        {sales.isError ? (
          <Card className="space-y-2 p-5">
            <p role="alert" className="text-sm text-destructive">Não foi possível carregar as vendas deste período.</p>
            <Button type="button" variant="outline" onClick={() => void sales.refetch()}>Tentar novamente</Button>
          </Card>
        ) : sales.isPending ? (
          <div className="space-y-4" role="status">
            <span className="sr-only">Carregando vendas</span>
            <Skeleton className="h-24 rounded-xl" /><Skeleton className="h-56 rounded-xl" />
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { label: "Total de vendas", value: money(total / 100), icon: Wallet },
                { label: "Pedidos concluídos", value: number.format(count), icon: ReceiptText },
                { label: "Ticket médio", value: money(count ? total / count / 100 : 0), icon: ArrowDownUp },
              ].map(({ label, value, icon: Icon }) => (
                <Card key={label} className="flex items-start justify-between gap-3 p-4 shadow-sm">
                  <div>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                </Card>
              ))}
            </dl>

            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-lg">Resumo por pagamento</CardTitle></CardHeader>
              <CardContent>
                {sales.data?.methods.length ? (
                  <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {sales.data.methods.map(([method, { count, cents }]) => (
                      <div key={method ?? "unknown"} className="min-w-0 rounded-xl border bg-muted/30 p-3">
                        <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CreditCard aria-hidden="true" className="size-4 shrink-0" /> {paymentLabel(method)}
                        </dt>
                        <dd className="mt-1 font-semibold tabular-nums">{money(cents / 100)}</dd>
                        <dd className="text-xs text-muted-foreground">{number.format(count)} {count === 1 ? "venda" : "vendas"}</dd>
                      </div>
                    ))}
                  </dl>
                ) : <p className="text-sm text-muted-foreground">Nenhum pagamento nas vendas do período.</p>}
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader><CardTitle className="text-lg">Últimas vendas</CardTitle></CardHeader>
              {visibleOrders?.length ? (
                <>
                  <Table className="min-w-[640px]">
                    <TableCaption className="sr-only">Vendas finalizadas no período selecionado.</TableCaption>
                    <TableHeader><TableRow>
                      <TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Data e hora</TableHead>
                      <TableHead>Forma de pagamento</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Valor</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>{visibleOrders.map(order => (
                      <TableRow key={order.id}>
                        <TableCell className="font-semibold">#{order.order_number || order.id?.slice(-8)}</TableCell>
                        <TableCell className="max-w-48 break-words">{order.customer_name || "Cliente não informado"}</TableCell>
                        <TableCell className="whitespace-nowrap">{dateLabel(order.created_at, true)}</TableCell>
                        <TableCell>{paymentLabel(order.payment_method)}</TableCell>
                        <TableCell><Badge variant="secondary">Finalizado</Badge></TableCell>
                        <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">{money(Number(order.total ?? 0))}</TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                  {pageCount > 1 && (
                    <div className="flex flex-wrap items-center justify-end gap-2 border-t p-4">
                      <Button type="button" variant="outline" size="sm" disabled={currentPage === 0}
                        onClick={() => setPage(currentPage - 1)}>Anterior</Button>
                      <span className="text-sm text-muted-foreground">Página {currentPage + 1} de {pageCount}</span>
                      <Button type="button" variant="outline" size="sm" disabled={currentPage >= pageCount - 1}
                        onClick={() => setPage(currentPage + 1)}>Próxima</Button>
                    </div>
                  )}
                </>
              ) : <CardContent><p className="text-sm text-muted-foreground">Nenhuma venda finalizada no período selecionado.</p></CardContent>}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}

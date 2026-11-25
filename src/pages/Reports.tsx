import { useEffect, useState, useMemo, useRef } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Banknote, Download, ReceiptText } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPaymentMethod } from "@/lib/payment-labels";
import { AppShell } from "@/components/layout/AppShell";

interface OrderRow {
  id: string;
  order_number: number | null;
  customer_name: string | null;
  total: number;
  payment_method: string | null;
  payment_status: string | null;
  pix_paid_at: string | null;
  status: string;
  created_at: string;
  repasse_status: string | null;
  repasse_confirmed_at: string | null;
}

const reports = [
  {
    id: "sales",
    section: "Vendas e faturamento",
    title: "Relatório de Vendas",
    description: "Consulte os pedidos, a receita total e o ticket médio.",
    icon: ReceiptText,
    tone: "bg-primary/10 text-primary",
  },
  {
    id: "pix",
    section: "Financeiro",
    title: "Relatório PIX Online",
    description: "Acompanhe pagamentos confirmados, taxas e status dos repasses.",
    icon: Banknote,
    tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
] as const;

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const formatOrderNumber = (o: OrderRow) =>
  o.order_number ? `#${String(o.order_number).padStart(2, "0")}` : `#${o.id.slice(-6)}`;

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map(r => r.map(c => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const { user, restaurant, loading, logout } = useAuth();
  const [searchParams] = useSearchParams();
  const activeReport = reports.find(report => report.id === searchParams.get("tipo"));
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!loading && restaurant?.id) heading.current?.focus();
  }, [activeReport, loading, restaurant?.id]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  const fetchOrders = async () => {
    if (!restaurant?.id) return;
    setFetching(true);
    const { data, error } = await supabase
      .from("secure_orders_view")
      .select("id, order_number, customer_name, total, payment_method, payment_status, pix_paid_at, status, created_at, repasse_status, repasse_confirmed_at")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setOrders((data as any) || []);
    setFetching(false);
  };

  const reconcileRepasses = async () => {
    setReconciling(true);
    try {
      const { error } = await supabase.functions.invoke("reconcile-pix-repasses");
      if (error) console.error(error);
      await fetchOrders();
    } finally {
      setReconciling(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [restaurant?.id]);

  // On open, also reconcile any pending repasses
  useEffect(() => {
    if (restaurant?.id) reconcileRepasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurant?.id]);

  // Sales: exclude cancelled
  const sales = useMemo(
    () => orders.filter(o => o.status !== "cancelled"),
    [orders]
  );

  // PIX paid orders
  const pixPaid = useMemo(
    () => orders.filter(o => o.payment_method === "pix_online" && o.payment_status === "pago"),
    [orders]
  );

  // Aggregations
  const totalSales = sales.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalPixGross = pixPaid.reduce((s, o) => s + Number(o.total || 0), 0);
  const platformFeePerOrder = 1; // R$1,00 por venda
  const totalFees = pixPaid.length * platformFeePerOrder;
  const repasseRecebido = pixPaid
    .filter(o => o.repasse_status === "recebido")
    .reduce((s, o) => s + Math.max(0, Number(o.total || 0) - platformFeePerOrder), 0);
  const repasseAReceber = pixPaid
    .filter(o => o.repasse_status !== "recebido" && o.repasse_status !== "falhou")
    .reduce((s, o) => s + Math.max(0, Number(o.total || 0) - platformFeePerOrder), 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/criar-conta" replace />;
  if (!restaurant) return <Navigate to="/admin" replace />;

  const exportSales = () => {
    const rows: string[][] = [
      ["Pedido", "Data", "Hora", "Cliente", "Valor", "Forma de Pagamento"],
      ...sales.map(o => [
        formatOrderNumber(o),
        format(new Date(o.created_at), "dd/MM/yyyy", { locale: ptBR }),
        format(new Date(o.created_at), "HH:mm", { locale: ptBR }),
        o.customer_name || "—",
        Number(o.total || 0).toFixed(2).replace(".", ","),
        formatPaymentMethod(o.payment_method),
      ]),
    ];
    downloadCSV(`relatorio-vendas-${format(new Date(), "yyyyMMdd-HHmm")}.csv`, rows);
  };

  const exportPix = () => {
    const rows: string[][] = [
      ["Pedido", "Data", "Cliente", "Valor", "Taxa Plataforma", "Repasse"],
      ...pixPaid.map(o => [
        formatOrderNumber(o),
        format(new Date(o.pix_paid_at || o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
        o.customer_name || "—",
        Number(o.total || 0).toFixed(2).replace(".", ","),
        platformFeePerOrder.toFixed(2).replace(".", ","),
        (Number(o.total || 0) - platformFeePerOrder).toFixed(2).replace(".", ","),
      ]),
    ];
    downloadCSV(`relatorio-pix-${format(new Date(), "yyyyMMdd-HHmm")}.csv`, rows);
  };

  return (
    <AppShell restaurant={restaurant} onLogout={logout} title="Relatórios" subtitle={restaurant.name}>
      <div className="mx-auto max-w-[1600px] space-y-5 p-4 sm:p-6 lg:p-8">
        {activeReport && (
          <Button asChild variant="ghost" size="sm" className="-ml-2 gap-2">
            <Link to="/admin/reports"><ArrowLeft className="size-4" aria-hidden="true" /> Todos os relatórios</Link>
          </Button>
        )}
        <header className="space-y-1">
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold tracking-tight sm:text-3xl">
            {activeReport?.title ?? "Relatórios"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeReport?.description ?? "Selecione o relatório que deseja consultar."}
          </p>
        </header>

        {!activeReport && (
          <div className="space-y-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
            {reports.map(({ id, section, title, description, icon: Icon, tone }) => (
              <section key={id} aria-labelledby={`reports-section-${id}`} className="space-y-3">
                <h2 id={`reports-section-${id}`} className="border-b pb-2 text-lg font-semibold tracking-tight">{section}</h2>
                <Link to={`/admin/reports?tipo=${id}`}
                  className="group flex max-w-2xl items-start gap-3 rounded-xl border bg-background p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-5">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${tone}`}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
                  </span>
                  <ArrowRight className="mt-2 size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden="true" />
                </Link>
              </section>
            ))}
          </div>
        )}

        {activeReport?.id === "sales" && (
          <section className="space-y-4" aria-label="Dados de vendas">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de vendas</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{sales.length}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receita total</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatBRL(totalSales)}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ticket médio</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatBRL(sales.length ? totalSales / sales.length : 0)}</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                <CardTitle>Pedidos</CardTitle>
                <Button variant="outline" size="sm" onClick={exportSales} disabled={!sales.length}>
                  <Download className="h-4 w-4 mr-2" /> Exportar CSV
                </Button>
              </CardHeader>
              <CardContent>
                {fetching ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : sales.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Data / Hora</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead>Forma de pagamento</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map(o => (
                          <TableRow key={o.id}>
                            <TableCell className="font-medium">{formatOrderNumber(o)}</TableCell>
                            <TableCell>{format(new Date(o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                            <TableCell>{o.customer_name || "—"}</TableCell>
                            <TableCell className="text-right">{formatBRL(Number(o.total))}</TableCell>
                            <TableCell>{formatPaymentMethod(o.payment_method)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {activeReport?.id === "pix" && (
          <section className="space-y-4" aria-label="Dados de PIX Online">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
              <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Pedidos PIX pagos</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{pixPaid.length}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Valor bruto</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold">{formatBRL(totalPixGross)}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Taxa plataforma</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold text-destructive">- {formatBRL(totalFees)}</div></CardContent></Card>
              <Card className="border-primary/40">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Já recebido na sua chave</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold text-primary">{formatBRL(repasseRecebido)}</div></CardContent>
              </Card>
              <Card className="border-amber-500/40">
                <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">A receber (em processamento)</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-bold text-amber-600">{formatBRL(repasseAReceber)}</div></CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
                <CardTitle>Pagamentos confirmados</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={reconcileRepasses} disabled={reconciling}>
                    {reconciling ? "Atualizando..." : "Atualizar status"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportPix} disabled={!pixPaid.length}>
                    <Download className="h-4 w-4 mr-2" /> Exportar CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">
                  O repasse é enviado para sua chave PIX assim que o cliente paga. O status é atualizado automaticamente assim que a EFI confirma o crédito.
                </p>
                {fetching ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : pixPaid.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pagamento PIX confirmado ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pedido</TableHead>
                          <TableHead>Pago em</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">Valor</TableHead>
                          <TableHead className="text-right">Taxa</TableHead>
                          <TableHead className="text-right">Repasse</TableHead>
                          <TableHead>Recebido na sua chave</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pixPaid.map(o => {
                          const gross = Number(o.total || 0);
                          const repasse = Math.max(0, gross - platformFeePerOrder);
                          const rs = o.repasse_status;
                          let badge: JSX.Element;
                          if (rs === "recebido") {
                            badge = (
                              <div className="flex flex-col">
                                <Badge className="bg-green-600 hover:bg-green-600 text-white w-fit">✓ Recebido</Badge>
                                {o.repasse_confirmed_at && (
                                  <span className="text-[10px] text-muted-foreground mt-1">
                                    {format(new Date(o.repasse_confirmed_at), "dd/MM HH:mm", { locale: ptBR })}
                                  </span>
                                )}
                              </div>
                            );
                          } else if (rs === "falhou") {
                            badge = <Badge variant="destructive">Falhou</Badge>;
                          } else {
                            badge = <Badge variant="outline" className="border-amber-500 text-amber-600">Em processamento</Badge>;
                          }
                          return (
                            <TableRow key={o.id}>
                              <TableCell className="font-medium">{formatOrderNumber(o)}</TableCell>
                              <TableCell>{format(new Date(o.pix_paid_at || o.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</TableCell>
                              <TableCell>{o.customer_name || "—"}</TableCell>
                              <TableCell className="text-right">{formatBRL(gross)}</TableCell>
                              <TableCell className="text-right text-muted-foreground">- {formatBRL(platformFeePerOrder)}</TableCell>
                              <TableCell className="text-right font-semibold text-primary">{formatBRL(repasse)}</TableCell>
                              <TableCell>{badge}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </AppShell>
  );
}

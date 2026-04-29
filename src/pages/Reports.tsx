import { useEffect, useState, useMemo } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatPaymentMethod } from "@/lib/payment-labels";

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
  const { user, restaurant, loading } = useAuth();
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
    <div className="min-h-screen bg-background">
      <header className="h-16 border-b bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">Relatórios</h1>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">{restaurant.name}</div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sales">Vendas</TabsTrigger>
            <TabsTrigger value="pix">PIX</TabsTrigger>
          </TabsList>

          {/* Sales Report */}
          <TabsContent value="sales" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total de vendas</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{sales.length}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Receita total</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatBRL(totalSales)}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Ticket médio</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{formatBRL(sales.length ? totalSales / sales.length : 0)}</div></CardContent></Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Relatório de Vendas</CardTitle>
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
          </TabsContent>

          {/* PIX Report */}
          <TabsContent value="pix" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Relatório PIX Online</CardTitle>
                <div className="flex gap-2">
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

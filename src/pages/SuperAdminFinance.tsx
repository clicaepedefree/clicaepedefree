import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/layout/Navbar";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { toast } from "sonner";
import {
  ArrowLeft, RefreshCw, ArrowUpDown, FileSpreadsheet, FileText, FileDown,
  TrendingUp, DollarSign, Banknote, Landmark, PiggyBank, Receipt, Wallet as WalletIcon, Percent,
} from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const PIX_FEE = 1.0;
const BANK_COST = 0.47;
const NET_PER_PIX = 0.53;

type Row = {
  id: string;
  created_at: string;
  paid_at: string | null;
  customer_name: string | null;
  customer_document: string | null;
  restaurant_id: string;
  restaurant_name: string;
  amount: number;
  payment_status: string;
  pix_txid: string | null;
  total_count: number;
};

type Summary = {
  tx_count: number;
  paid_count: number;
  volume: number;
  paid_volume: number;
  pix_fee_revenue: number;
  bank_cost: number;
  pix_net_profit: number;
  withdrawal_count: number;
  withdrawal_volume: number;
  withdrawal_fee_revenue: number;
  total_platform_revenue: number;
  average_ticket: number;
  daily: { day: string; count: number; volume: number; fees: number; bank_cost: number; profit: number }[];
  by_restaurant: { restaurant_id: string; name: string; count: number; volume: number; revenue: number }[];
};

const brl = (v: number) =>
  (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABELS: Record<string, string> = {
  pago: "Pago",
  aguardando_pagamento: "Pendente",
  pendente: "Pendente",
  cancelado: "Cancelado",
  expirado: "Expirado",
  reembolsado: "Reembolsado",
  falha_repasse: "Falha no repasse",
  not_required: "Não aplicável",
};

const statusVariant = (s: string): "default" | "secondary" | "destructive" | "outline" => {
  if (s === "pago") return "default";
  if (s === "cancelado" || s === "expirado" || s === "falha_repasse") return "destructive";
  return "secondary";
};

function rangeFromPreset(preset: string): { from?: Date; to?: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday":
      return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
    case "7days":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "30days":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "thisMonth":
      return { from: startOfMonth(now), to: endOfDay(now) };
    default:
      return {};
  }
}

const SuperAdminFinance = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useSuperAdmin();

  const [preset, setPreset] = useState("30days");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [payer, setPayer] = useState("");
  const [document, setDocument] = useState("");
  const [restaurantId, setRestaurantId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");

  const [sort, setSort] = useState("date");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(0);

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [restaurants, setRestaurants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate("/super-admin/auth");
  }, [authLoading, isAuthenticated, navigate]);

  const period = useMemo(() => {
    if (preset === "custom") {
      return {
        from: customFrom ? startOfDay(new Date(`${customFrom}T00:00:00`)) : undefined,
        to: customTo ? endOfDay(new Date(`${customTo}T00:00:00`)) : undefined,
      };
    }
    return rangeFromPreset(preset);
  }, [preset, customFrom, customTo]);

  const filterArgs = useCallback(
    () => ({
      _from: period.from ? period.from.toISOString() : null,
      _to: period.to ? period.to.toISOString() : null,
      _restaurant_id: restaurantId === "all" ? null : restaurantId,
    }),
    [period, restaurantId]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const base = filterArgs();
    const [listRes, sumRes] = await Promise.all([
      supabase.rpc("admin_list_pix_transactions", {
        ...base,
        _payer: payer || null,
        _document: document || null,
        _status: status === "all" ? null : status,
        _min_amount: minAmount ? Number(minAmount) : null,
        _max_amount: maxAmount ? Number(maxAmount) : null,
        _sort: sort,
        _dir: dir,
        _limit: pageSize,
        _offset: page * pageSize,
      }),
      supabase.rpc("admin_pix_financial_summary", base),
    ]);

    if (listRes.error) toast.error("Erro ao carregar transações: " + listRes.error.message);
    if (sumRes.error) toast.error("Erro ao carregar resumo: " + sumRes.error.message);

    const data = (listRes.data as Row[]) || [];
    setRows(data);
    setTotal(data.length ? Number(data[0].total_count) : 0);
    setSummary((sumRes.data as unknown as Summary) || null);
    setLoading(false);
  }, [filterArgs, payer, document, status, minAmount, maxAmount, sort, dir, pageSize, page]);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!isAuthenticated) return;
    supabase.rpc("get_restaurants_with_emails").then(({ data }) => {
      setRestaurants(((data as any[]) || []).map((r) => ({ id: r.id, name: r.name })));
    });
  }, [isAuthenticated]);

  const toggleSort = (key: string) => {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir("desc");
    }
    setPage(0);
  };

  const exportRows = useCallback(async () => {
    const base = filterArgs();
    const { data, error } = await supabase.rpc("admin_list_pix_transactions", {
      ...base,
      _payer: payer || null,
      _document: document || null,
      _status: status === "all" ? null : status,
      _min_amount: minAmount ? Number(minAmount) : null,
      _max_amount: maxAmount ? Number(maxAmount) : null,
      _sort: sort,
      _dir: dir,
      _limit: 10000,
      _offset: 0,
    });
    if (error) {
      toast.error("Erro ao exportar: " + error.message);
      return [];
    }
    return ((data as Row[]) || []).map((r) => ({
      ID: r.id,
      "Data/Hora": format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      Pagador: r.customer_name || "-",
      CPF: r.customer_document || "-",
      Estabelecimento: r.restaurant_name,
      "Valor da compra": Number(r.amount),
      "Valor recebido": r.payment_status === "pago" ? Number(r.amount) : 0,
      "Taxa plataforma": r.payment_status === "pago" ? PIX_FEE : 0,
      "Custo bancário": r.payment_status === "pago" ? BANK_COST : 0,
      "Lucro líquido": r.payment_status === "pago" ? NET_PER_PIX : 0,
      Status: STATUS_LABELS[r.payment_status] || r.payment_status,
      TxID: r.pix_txid || "-",
    }));
  }, [filterArgs, payer, document, status, minAmount, maxAmount, sort, dir]);

  const handleExportXlsx = async () => {
    const data = await exportRows();
    if (!data.length) return toast.error("Nenhum dado para exportar");
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transações PIX");
    XLSX.writeFile(wb, `transacoes-pix-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const handleExportCsv = async () => {
    const data = await exportRows();
    if (!data.length) return toast.error("Nenhum dado para exportar");
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(";"),
      ...data.map((r) =>
        headers.map((h) => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(";")
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `transacoes-pix-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = async () => {
    const data = await exportRows();
    if (!data.length) return toast.error("Nenhum dado para exportar");
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Transações PIX - Clica e Pede", 14, 14);
    autoTable(doc, {
      startY: 20,
      styles: { fontSize: 7 },
      head: [["Data", "Pagador", "Estabelecimento", "Valor", "Taxa", "Custo", "Lucro", "Status", "TxID"]],
      body: data.map((r) => [
        r["Data/Hora"], r.Pagador, r.Estabelecimento,
        brl(r["Valor da compra"]), brl(r["Taxa plataforma"]),
        brl(r["Custo bancário"]), brl(r["Lucro líquido"]), r.Status, String(r.TxID).slice(0, 18),
      ]),
    });
    doc.save(`transacoes-pix-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const cards = [
    { label: "Transações PIX", value: String(summary?.tx_count ?? 0), icon: Receipt, hint: `${summary?.paid_count ?? 0} pagas` },
    { label: "Valor movimentado", value: brl(summary?.paid_volume ?? 0), icon: DollarSign },
    { label: "Taxa PIX arrecadada", value: brl(summary?.pix_fee_revenue ?? 0), icon: Percent },
    { label: "Custo bancário", value: brl(summary?.bank_cost ?? 0), icon: Landmark },
    { label: "Lucro líquido PIX", value: brl(summary?.pix_net_profit ?? 0), icon: PiggyBank },
    { label: "Taxa de saque", value: brl(summary?.withdrawal_fee_revenue ?? 0), icon: WalletIcon, hint: `${summary?.withdrawal_count ?? 0} saques` },
    { label: "Receita total", value: brl(summary?.total_platform_revenue ?? 0), icon: TrendingUp },
    { label: "Ticket médio", value: brl(summary?.average_ticket ?? 0), icon: Banknote },
  ];

  const dailyData = (summary?.daily || []).map((d) => ({
    ...d,
    label: format(new Date(`${d.day}T12:00:00`), "dd/MM"),
    volume: Number(d.volume),
    fees: Number(d.fees),
    bank_cost: Number(d.bank_cost),
    profit: Number(d.profit),
  }));

  const byRestaurant = (summary?.by_restaurant || []).slice(0, 10).map((r) => ({
    name: r.name.length > 16 ? r.name.slice(0, 16) + "…" : r.name,
    volume: Number(r.volume),
    revenue: Number(r.revenue),
  }));

  if (authLoading || !isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => navigate("/super-admin")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h1 className="text-3xl font-bold">Financeiro · Transações PIX</h1>
            <p className="text-muted-foreground">
              Taxa PIX {brl(PIX_FEE)} · custo bancário {brl(BANK_COST)} · lucro {brl(NET_PER_PIX)} por pagamento · taxa de saque {brl(5)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportXlsx}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <FileDown className="h-4 w-4 mr-1" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf}>
              <FileText className="h-4 w-4 mr-1" /> PDF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{c.label}</span>
                  <c.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-xl font-bold">{c.value}</div>
                {c.hint && <p className="text-xs text-muted-foreground mt-0.5">{c.hint}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Período</Label>
              <Select value={preset} onValueChange={(v) => { setPreset(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="yesterday">Ontem</SelectItem>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="thisMonth">Este mês</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {preset === "custom" && (
              <>
                <div>
                  <Label className="text-xs">De</Label>
                  <Input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPage(0); }} />
                </div>
                <div>
                  <Label className="text-xs">Até</Label>
                  <Input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPage(0); }} />
                </div>
              </>
            )}
            <div>
              <Label className="text-xs">Pagador</Label>
              <Input placeholder="Nome do cliente" value={payer} onChange={(e) => { setPayer(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label className="text-xs">CPF/CNPJ</Label>
              <Input placeholder="Documento" value={document} onChange={(e) => { setDocument(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label className="text-xs">Estabelecimento</Label>
              <Select value={restaurantId} onValueChange={(v) => { setRestaurantId(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Todos</SelectItem>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="aguardando_pagamento">Pendente</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                  <SelectItem value="reembolsado">Reembolsado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Valor mínimo</Label>
              <Input type="number" step="0.01" value={minAmount} onChange={(e) => { setMinAmount(e.target.value); setPage(0); }} />
            </div>
            <div>
              <Label className="text-xs">Valor máximo</Label>
              <Input type="number" step="0.01" value={maxAmount} onChange={(e) => { setMaxAmount(e.target.value); setPage(0); }} />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita PIX</CardTitle>
              <CardDescription>Pagamentos confirmados no período</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">PIX pagos</span><span className="font-medium">{summary?.paid_count ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor movimentado</span><span className="font-medium">{brl(summary?.paid_volume ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Receita de taxas</span><span className="font-medium">{brl(summary?.pix_fee_revenue ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Custo bancário</span><span className="font-medium text-destructive">-{brl(summary?.bank_cost ?? 0)}</span></div>
              <div className="flex justify-between border-t pt-1"><span>Lucro líquido</span><span className="font-bold">{brl(summary?.pix_net_profit ?? 0)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita de Saques</CardTitle>
              <CardDescription>Saques concluídos no período</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Quantidade</span><span className="font-medium">{summary?.withdrawal_count ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valor total sacado</span><span className="font-medium">{brl(summary?.withdrawal_volume ?? 0)}</span></div>
              <div className="flex justify-between border-t pt-1"><span>Receita de taxas</span><span className="font-bold">{brl(summary?.withdrawal_fee_revenue ?? 0)}</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Receita Geral</CardTitle>
              <CardDescription>Consolidado da plataforma</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Receita PIX (líquida)</span><span className="font-medium">{brl(summary?.pix_net_profit ?? 0)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Receita saques</span><span className="font-medium">{brl(summary?.withdrawal_fee_revenue ?? 0)}</span></div>
              <div className="flex justify-between border-t pt-1"><span>Receita total</span><span className="font-bold text-primary">{brl(summary?.total_platform_revenue ?? 0)}</span></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Evolução diária das vendas PIX</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number, n) => (n === "count" ? v : brl(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="volume" name="Volume (R$)" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="count" name="Qtd. PIX" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Evolução diária da receita da plataforma</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Legend />
                  <Line type="monotone" dataKey="fees" name="Taxas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="bank_cost" name="Custo bancário" stroke="hsl(var(--destructive))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="profit" name="Lucro líquido" stroke="hsl(var(--whatsapp, var(--primary)))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Receita por estabelecimento (top 10)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byRestaurant}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="name" fontSize={10} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Legend />
                  <Bar dataKey="volume" name="Volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Taxas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Comparativo diário (volume × taxas × custos × lucro)</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Legend />
                  <Bar dataKey="volume" name="Movimentado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="fees" name="Taxas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bank_cost" name="Custo banco" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Lucro" fill="hsl(var(--accent-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base">Transações PIX ({total})</CardTitle>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Por página</Label>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                <SelectTrigger className="w-[90px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("date")}>
                    <span className="inline-flex items-center gap-1">Data/Hora <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("name")}>
                    <span className="inline-flex items-center gap-1">Pagador <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("restaurant")}>
                    <span className="inline-flex items-center gap-1">Estabelecimento <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => toggleSort("amount")}>
                    <span className="inline-flex items-center gap-1">Valor <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead className="text-right">Recebido</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Lucro</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => toggleSort("status")}>
                    <span className="inline-flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></span>
                  </TableHead>
                  <TableHead>TxID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                      {loading ? "Carregando..." : "Nenhuma transação encontrada"}
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => {
                  const paid = r.payment_status === "pago";
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(r.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        <div className="text-[10px] text-muted-foreground">{r.id.slice(0, 8)}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.customer_name || "-"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{r.customer_document || "-"}</TableCell>
                      <TableCell className="text-sm">{r.restaurant_name}</TableCell>
                      <TableCell className="text-right text-sm">{brl(Number(r.amount))}</TableCell>
                      <TableCell className="text-right text-sm">{paid ? brl(Number(r.amount)) : "-"}</TableCell>
                      <TableCell className="text-right text-sm">{paid ? brl(PIX_FEE) : "-"}</TableCell>
                      <TableCell className="text-right text-sm text-destructive">{paid ? brl(BANK_COST) : "-"}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{paid ? brl(NET_PER_PIX) : "-"}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(r.payment_status)}>
                          {STATUS_LABELS[r.payment_status] || r.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground max-w-[140px] truncate">
                        {r.pix_txid || "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminFinance;

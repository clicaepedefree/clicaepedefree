import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Wallet as WalletIcon, ArrowDownCircle, ArrowUpCircle, RefreshCw, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WalletRow {
  id: string;
  available_balance: number;
  pending_balance: number;
  total_received: number;
  total_withdrawn: number;
  total_fees: number;
  total_refunded: number;
  sales_count: number;
}

interface WalletTx {
  id: string;
  transaction_type: string;
  amount: number;
  fee: number;
  net_amount: number;
  balance_after: number | null;
  status: string;
  description: string | null;
  customer_name: string | null;
  created_at: string;
  order_id: string | null;
}

interface PixKeyData {
  restaurant_pix_key: string | null;
  restaurant_pix_key_type: string | null;
  restaurant_pix_key_holder_name: string | null;
  restaurant_pix_key_holder_document: string | null;
}

interface WithdrawalSettings {
  withdrawal_fee: number;
  minimum_withdrawal: number;
}

const fmtBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const PAGE_SIZE = 20;

export default function Wallet() {
  const { user, restaurant, loading } = useAuth();
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletRow | null>(null);
  const [available, setAvailable] = useState(0);
  const [txs, setTxs] = useState<WalletTx[]>([]);
  const [page, setPage] = useState(0);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSearch, setFilterSearch] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [pixKey, setPixKey] = useState<PixKeyData>({
    restaurant_pix_key: "",
    restaurant_pix_key_type: "cpf",
    restaurant_pix_key_holder_name: "",
    restaurant_pix_key_holder_document: "",
  });
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSettings>({
    withdrawal_fee: 5,
    minimum_withdrawal: 10,
  });
  const [savingKey, setSavingKey] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    if (!restaurant?.id) return;
    setRefreshing(true);
    const [w, t, av, pm, settings] = await Promise.all([
      supabase.from("wallets").select("*").eq("restaurant_id", restaurant.id).maybeSingle(),
      supabase.from("wallet_transactions")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.rpc("get_available_for_withdrawal", { _restaurant_id: restaurant.id }),
      supabase.from("payment_methods")
        .select("restaurant_pix_key, restaurant_pix_key_type, restaurant_pix_key_holder_name, restaurant_pix_key_holder_document")
        .eq("restaurant_id", restaurant.id)
        .eq("method_type", "pix")
        .maybeSingle(),
      supabase.from("payment_gateway_settings")
        .select("withdrawal_fee, minimum_withdrawal")
        .limit(1)
        .maybeSingle(),
    ]);
    setWallet((w.data as any) || null);
    setTxs((t.data as any) || []);
    setAvailable(Number(av.data ?? 0));
    if (pm.data) setPixKey(pm.data as any);
    if (settings.data) {
      setWithdrawalSettings({
        withdrawal_fee: Number(settings.data.withdrawal_fee ?? 5),
        minimum_withdrawal: Number(settings.data.minimum_withdrawal ?? 10),
      });
    }
    setRefreshing(false);
  };

  useEffect(() => { fetchAll(); }, [restaurant?.id]);

  const filteredTxs = useMemo(() => {
    let out = txs;
    if (filterType !== "all") out = out.filter(t => t.transaction_type === filterType);
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      out = out.filter(t =>
        (t.customer_name || "").toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        String(t.amount).includes(q)
      );
    }
    return out;
  }, [txs, filterType, filterSearch]);

  const pageTxs = filteredTxs.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(filteredTxs.length / PAGE_SIZE));

  const savePixKey = async () => {
    if (!restaurant?.id) return;
    if (!pixKey.restaurant_pix_key || !pixKey.restaurant_pix_key_holder_name || !pixKey.restaurant_pix_key_holder_document) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setSavingKey(true);
    const { data: existing } = await supabase
      .from("payment_methods")
      .select("id")
      .eq("restaurant_id", restaurant.id)
      .eq("method_type", "pix")
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("payment_methods")
        .update({
          restaurant_pix_key: pixKey.restaurant_pix_key?.trim(),
          restaurant_pix_key_type: pixKey.restaurant_pix_key_type,
          restaurant_pix_key_holder_name: pixKey.restaurant_pix_key_holder_name?.trim(),
          restaurant_pix_key_holder_document: pixKey.restaurant_pix_key_holder_document?.replace(/\D/g, ""),
        })
        .eq("id", existing.id);
      if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      else toast({ title: "Chave PIX salva!" });
    } else {
      const { error } = await supabase.from("payment_methods").insert({
        restaurant_id: restaurant.id,
        method_type: "pix",
        is_active: true,
        restaurant_pix_key: pixKey.restaurant_pix_key?.trim(),
        restaurant_pix_key_type: pixKey.restaurant_pix_key_type,
        restaurant_pix_key_holder_name: pixKey.restaurant_pix_key_holder_name?.trim(),
        restaurant_pix_key_holder_document: pixKey.restaurant_pix_key_holder_document?.replace(/\D/g, ""),
      });
      if (error) toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      else toast({ title: "Chave PIX salva!" });
    }
    setSavingKey(false);
    fetchAll();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!user) return <Navigate to="/criar-conta" replace />;
  if (!restaurant) return <Navigate to="/admin" replace />;

  const txTypeLabel = (t: string) => ({
    venda: "Venda",
    taxa_venda: "Taxa de venda",
    saque: "Saque",
    taxa_saque: "Taxa de saque",
    reembolso: "Reembolso",
    ajuste: "Ajuste",
  } as Record<string, string>)[t] || t;

  const statusBadge = (s: string) => {
    const color = s === "completed" ? "default" : s === "failed" ? "destructive" : "secondary";
    return <Badge variant={color as any}>{s}</Badge>;
  };

  const hasPixKey = !!(pixKey.restaurant_pix_key && pixKey.restaurant_pix_key_holder_name && pixKey.restaurant_pix_key_holder_document);
  const canRequestWithdrawal = hasPixKey && available >= withdrawalSettings.minimum_withdrawal;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm"><Link to="/admin"><ArrowLeft className="h-4 w-4 mr-2"/>Voltar</Link></Button>
          <div className="flex items-center gap-2">
            <WalletIcon className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">Carteira</h1>
          </div>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={fetchAll} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Resumo</TabsTrigger>
            <TabsTrigger value="statement">Extrato</TabsTrigger>
            <TabsTrigger value="pix-key">Chave PIX</TabsTrigger>
          </TabsList>

          {/* RESUMO */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo disponível</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-primary">{fmtBRL(available)}</div>
                  <Button className="mt-4 w-full" size="lg" onClick={() => setWithdrawOpen(true)} disabled={!canRequestWithdrawal}>
                    <ArrowUpCircle className="h-4 w-4 mr-2"/>Solicitar saque
                  </Button>
                  {hasPixKey && available < withdrawalSettings.minimum_withdrawal && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Saque mínimo: {fmtBRL(withdrawalSettings.minimum_withdrawal)}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total recebido</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-semibold">{fmtBRL(wallet?.total_received || 0)}</div>
                <p className="text-xs text-muted-foreground mt-1">{wallet?.sales_count || 0} vendas PIX</p></CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total sacado</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-semibold">{fmtBRL(wallet?.total_withdrawn || 0)}</div></CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Taxas pagas</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-semibold text-muted-foreground">{fmtBRL(wallet?.total_fees || 0)}</div></CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Reembolsos</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-semibold text-muted-foreground">{fmtBRL(wallet?.total_refunded || 0)}</div></CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Saldo pendente</CardTitle></CardHeader>
                <CardContent><div className="text-xl font-semibold">{fmtBRL(wallet?.pending_balance || 0)}</div></CardContent>
              </Card>
            </div>

            {!hasPixKey && (
              <Card className="border-amber-500/40 bg-amber-50 dark:bg-amber-950/20">
                <CardContent className="pt-6 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0"/>
                  <div>
                    <p className="font-semibold">Cadastre sua chave PIX</p>
                    <p className="text-sm text-muted-foreground">É obrigatório cadastrar chave, nome e CPF/CNPJ do titular para liberar saques.</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* EXTRATO */}
          <TabsContent value="statement" className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Select value={filterType} onValueChange={(v) => { setPage(0); setFilterType(v); }}>
                    <SelectTrigger className="w-[180px]"><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      <SelectItem value="venda">Vendas</SelectItem>
                      <SelectItem value="saque">Saques</SelectItem>
                      <SelectItem value="reembolso">Reembolsos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Buscar cliente, valor..." value={filterSearch} onChange={(e) => { setPage(0); setFilterSearch(e.target.value); }} className="max-w-xs" />
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Taxa</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageTxs.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma transação</TableCell></TableRow>
                    )}
                    {pageTxs.map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(t.created_at), "dd/MM HH:mm", { locale: ptBR })}</TableCell>
                        <TableCell>
                          <Badge variant={t.transaction_type === "venda" ? "default" : t.transaction_type === "saque" ? "secondary" : "outline"}>
                            {t.transaction_type === "venda" ? <ArrowDownCircle className="h-3 w-3 mr-1"/> : <ArrowUpCircle className="h-3 w-3 mr-1"/>}
                            {txTypeLabel(t.transaction_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{t.description || "—"}</TableCell>
                        <TableCell className="text-sm">{t.customer_name || "—"}</TableCell>
                        <TableCell className="text-right text-sm">{fmtBRL(t.amount)}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{fmtBRL(t.fee)}</TableCell>
                        <TableCell className={`text-right font-medium ${t.net_amount < 0 ? "text-destructive" : "text-foreground"}`}>{fmtBRL(t.net_amount)}</TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{filteredTxs.length} transações</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(0, p-1))} disabled={page === 0}>Anterior</Button>
                    <span className="text-sm self-center">{page+1} / {totalPages}</span>
                    <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(totalPages-1, p+1))} disabled={page >= totalPages-1}>Próximo</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHAVE PIX */}
          <TabsContent value="pix-key">
            <Card>
              <CardHeader>
                <CardTitle>Chave PIX para receber saques</CardTitle>
                <p className="text-sm text-muted-foreground">A chave deve ser de mesma titularidade do CNPJ/CPF da loja.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo de chave</Label>
                  <Select value={pixKey.restaurant_pix_key_type || "cpf"} onValueChange={v => setPixKey({...pixKey, restaurant_pix_key_type: v})}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="random">Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Chave PIX</Label>
                  <Input value={pixKey.restaurant_pix_key || ""} onChange={e => setPixKey({...pixKey, restaurant_pix_key: e.target.value})} placeholder="Sua chave PIX" />
                </div>
                <div>
                  <Label>Nome do titular</Label>
                  <Input value={pixKey.restaurant_pix_key_holder_name || ""} onChange={e => setPixKey({...pixKey, restaurant_pix_key_holder_name: e.target.value})} placeholder="Nome completo ou razão social" />
                </div>
                <div>
                  <Label>CPF ou CNPJ do titular</Label>
                  <Input value={pixKey.restaurant_pix_key_holder_document || ""} onChange={e => setPixKey({...pixKey, restaurant_pix_key_holder_document: e.target.value})} placeholder="Apenas números" />
                </div>
                <Button onClick={savePixKey} disabled={savingKey}>{savingKey ? "Salvando..." : "Salvar chave"}</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <WithdrawModal
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        available={available}
        restaurantId={restaurant.id}
        fee={withdrawalSettings.withdrawal_fee}
        minimum={withdrawalSettings.minimum_withdrawal}
        onDone={fetchAll}
      />
    </div>
  );
}

// ============================================================
// Withdraw Modal
// ============================================================

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

function WithdrawModal({ open, onOpenChange, available, restaurantId, fee, minimum, onDone }: {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  available: number;
  restaurantId: string;
  fee: number;
  minimum: number;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const numAmount = Number(amount.replace(",", ".")) || 0;
  const net = Math.max(0, numAmount - fee);

  const submit = async () => {
    if (numAmount <= 0) {
      toast({ title: "Informe um valor", variant: "destructive" });
      return;
    }
    if (numAmount < minimum) {
      toast({
        title: "Valor abaixo do mínimo",
        description: `O saque mínimo é ${fmtBRL(minimum)}.`,
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("validapay-request-withdrawal", {
      body: { restaurant_id: restaurantId, amount: numAmount },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Erro ao solicitar saque",
        description: (data as any)?.error || error?.message,
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Saque solicitado!", description: "Você receberá o PIX em instantes." });
    setAmount("");
    onOpenChange(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Solicitar saque</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-muted/50 p-3 rounded-md text-sm">
            Saldo disponível: <span className="font-semibold">{fmtBRL(available)}</span>
          </div>
          <div>
            <Label>Valor do saque</Label>
            <Input type="number" step="0.01" min={minimum} max={available} value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          </div>
          <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-md text-sm space-y-1">
            <div>Saque mínimo: <span className="font-medium">{fmtBRL(minimum)}</span></div>
            <div>Taxa de saque: <span className="font-medium">{fmtBRL(fee)}</span></div>
            <div>Você receberá: <span className="font-semibold text-primary">{fmtBRL(net)}</span></div>
          </div>
          <p className="text-xs text-muted-foreground">
            Saques são processados apenas em dias úteis. O valor cai na chave PIX cadastrada.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading || numAmount < minimum || numAmount > available}>
            {loading ? "Processando..." : "Confirmar saque"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navbar } from "@/components/layout/Navbar";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { toast } from "sonner";
import { ArrowLeft, Save, RefreshCw, AlertTriangle, CheckCircle2, DollarSign, RotateCcw, Wallet as WalletIcon, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type GatewaySettings = {
  id?: string;
  provider: string;
  environment: string;
  master_pix_key: string | null;
  webhook_url: string | null;
  fee_per_sale: number;
  withdrawal_fee: number;
  minimum_withdrawal: number;
  release_delay_hours: number;
  auto_withdrawal_enabled: boolean;
};

const WEBHOOK_URL = `https://defowjmlqmheecydnyrj.supabase.co/functions/v1/validapay-webhook`;

const SuperAdminGateway = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useSuperAdmin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<GatewaySettings>({
    provider: 'validapay',
    environment: 'sandbox',
    master_pix_key: '',
    webhook_url: WEBHOOK_URL,
    fee_per_sale: 1.0,
    withdrawal_fee: 5.0,
    minimum_withdrawal: 10.0,
    release_delay_hours: 0,
    auto_withdrawal_enabled: false,
  });

  const [stats, setStats] = useState({
    totalSales: 0,
    salesCount: 0,
    totalFees: 0,
    totalRefunded: 0,
    totalWithdrawn: 0,
    pendingWithdrawals: 0,
    webhookErrors: 0,
  });
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate('/super-admin/auth');
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    if (isAuthenticated) loadAll();
  }, [isAuthenticated]);

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadSettings(), loadStats(), loadLogs(), loadWithdrawals(), loadRefunds()]);
    setLoading(false);
  };

  const loadSettings = async () => {
    const { data } = await supabase.from('payment_gateway_settings').select('*').limit(1).maybeSingle();
    if (data) setSettings(data as any);
  };

  const loadStats = async () => {
    const { data: wallets } = await supabase.from('wallets').select('total_received,total_fees,total_refunded,total_withdrawn,sales_count');
    const totals = (wallets || []).reduce((acc: any, w: any) => ({
      totalSales: acc.totalSales + Number(w.total_received || 0),
      salesCount: acc.salesCount + Number(w.sales_count || 0),
      totalFees: acc.totalFees + Number(w.total_fees || 0),
      totalRefunded: acc.totalRefunded + Number(w.total_refunded || 0),
      totalWithdrawn: acc.totalWithdrawn + Number(w.total_withdrawn || 0),
    }), { totalSales: 0, salesCount: 0, totalFees: 0, totalRefunded: 0, totalWithdrawn: 0 });

    const { count: pendingW } = await supabase
      .from('withdrawal_requests')
      .select('id', { count: 'exact', head: true })
      .in('status', ['pending', 'processing']);

    const { count: webhookErr } = await supabase
      .from('webhook_logs')
      .select('id', { count: 'exact', head: true })
      .or('signature_valid.eq.false,error_message.not.is.null');

    setStats({
      ...totals,
      pendingWithdrawals: pendingW || 0,
      webhookErrors: webhookErr || 0,
    });
  };

  const loadLogs = async () => {
    const { data } = await supabase
      .from('webhook_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setWebhookLogs(data || []);
  };

  const loadWithdrawals = async () => {
    const { data } = await supabase
      .from('withdrawal_requests')
      .select('*, restaurants(name)')
      .order('created_at', { ascending: false })
      .limit(50);
    setWithdrawals(data || []);
  };

  const loadRefunds = async () => {
    const { data } = await supabase
      .from('refund_transactions')
      .select('*, restaurants(name)')
      .order('created_at', { ascending: false })
      .limit(50);
    setRefunds(data || []);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...settings, webhook_url: WEBHOOK_URL };
      let res;
      if (settings.id) {
        res = await supabase.from('payment_gateway_settings').update(payload).eq('id', settings.id);
      } else {
        res = await supabase.from('payment_gateway_settings').insert(payload).select().single();
        if (res.data) setSettings(res.data as any);
      }
      if (res.error) throw res.error;
      toast.success('Configurações salvas.');
      loadSettings();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/super-admin')}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Gateway ValidaPay</h1>
              <p className="text-muted-foreground text-sm">Controle do PIX, taxas, saques e webhooks</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard icon={<DollarSign />} label="Vendas (R$)" value={`R$ ${stats.totalSales.toFixed(2)}`} />
          <StatCard icon={<CheckCircle2 />} label="Qtd. Vendas" value={stats.salesCount.toString()} />
          <StatCard icon={<WalletIcon />} label="Taxas (R$)" value={`R$ ${stats.totalFees.toFixed(2)}`} />
          <StatCard icon={<RotateCcw />} label="Reembolsos" value={`R$ ${stats.totalRefunded.toFixed(2)}`} />
          <StatCard icon={<DollarSign />} label="Saques Pagos" value={`R$ ${stats.totalWithdrawn.toFixed(2)}`} />
          <StatCard icon={<AlertTriangle />} label="Pendências" value={`${stats.pendingWithdrawals} saques`} alert={stats.pendingWithdrawals > 0} />
        </div>

        <Tabs defaultValue="config">
          <TabsList>
            <TabsTrigger value="config">Configuração</TabsTrigger>
            <TabsTrigger value="withdrawals">Saques</TabsTrigger>
            <TabsTrigger value="refunds">Reembolsos</TabsTrigger>
            <TabsTrigger value="webhooks">
              Webhooks {stats.webhookErrors > 0 && <Badge variant="destructive" className="ml-2">{stats.webhookErrors}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuração do gateway</CardTitle>
                <CardDescription>Credenciais (Client ID/Secret e Webhook Secret) são armazenadas com segurança. Para alterá-las, peça ao time técnico.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ambiente</Label>
                    <Select value={settings.environment} onValueChange={(v) => setSettings({ ...settings, environment: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                        <SelectItem value="production">Produção</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Chave PIX recebedora (master)</Label>
                    <Input
                      value={settings.master_pix_key || ''}
                      onChange={(e) => setSettings({ ...settings, master_pix_key: e.target.value })}
                      placeholder="Chave PIX da conta da plataforma"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Taxa por venda (R$)</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={settings.fee_per_sale}
                      onChange={(e) => setSettings({ ...settings, fee_per_sale: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Taxa por saque (R$)</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={settings.withdrawal_fee}
                      onChange={(e) => setSettings({ ...settings, withdrawal_fee: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Valor mínimo para saque (R$)</Label>
                    <Input
                      type="number" step="0.01" min="0"
                      value={settings.minimum_withdrawal}
                      onChange={(e) => setSettings({ ...settings, minimum_withdrawal: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Atraso de liberação (horas)</Label>
                    <Input
                      type="number" min="0"
                      value={settings.release_delay_hours}
                      onChange={(e) => setSettings({ ...settings, release_delay_hours: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <Label className="text-base">Saque automático</Label>
                    <p className="text-sm text-muted-foreground">Se ativo, lojas recebem saldo direto na chave PIX cadastrada.</p>
                  </div>
                  <Switch
                    checked={settings.auto_withdrawal_enabled}
                    onCheckedChange={(c) => setSettings({ ...settings, auto_withdrawal_enabled: c })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>URL do Webhook (configure isto na ValidaPay)</Label>
                  <Input value={WEBHOOK_URL} readOnly className="font-mono text-xs" />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar configurações'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader><CardTitle>Saques recentes</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Bruto</TableHead>
                      <TableHead>Taxa</TableHead>
                      <TableHead>Líquido</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withdrawals.map((w) => (
                      <TableRow key={w.id}>
                        <TableCell className="text-xs">{format(new Date(w.created_at), 'dd/MM HH:mm', { locale: ptBR })}</TableCell>
                        <TableCell>{w.restaurants?.name || '—'}</TableCell>
                        <TableCell>R$ {Number(w.gross_amount).toFixed(2)}</TableCell>
                        <TableCell>R$ {Number(w.fee).toFixed(2)}</TableCell>
                        <TableCell>R$ {Number(w.net_amount).toFixed(2)}</TableCell>
                        <TableCell><StatusBadge status={w.status} /></TableCell>
                      </TableRow>
                    ))}
                    {withdrawals.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum saque solicitado</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="refunds">
            <Card>
              <CardHeader><CardTitle>Reembolsos</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Loja</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {refunds.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{format(new Date(r.created_at), 'dd/MM HH:mm', { locale: ptBR })}</TableCell>
                        <TableCell>{r.restaurants?.name || '—'}</TableCell>
                        <TableCell>R$ {Number(r.amount).toFixed(2)}</TableCell>
                        <TableCell className="text-xs">{r.reason || '—'}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                      </TableRow>
                    ))}
                    {refunds.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum reembolso</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="webhooks">
            <Card>
              <CardHeader>
                <CardTitle>Logs de Webhook</CardTitle>
                <CardDescription>Últimos 50 eventos recebidos da ValidaPay.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Evento</TableHead>
                      <TableHead>Assinatura</TableHead>
                      <TableHead>Processado</TableHead>
                      <TableHead>Erro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhookLogs.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs">{format(new Date(l.created_at), 'dd/MM HH:mm:ss', { locale: ptBR })}</TableCell>
                        <TableCell className="text-xs font-mono">{l.event_type || '—'}</TableCell>
                        <TableCell>
                          {l.signature_valid === false ? (
                            <Badge variant="destructive"><ShieldAlert className="h-3 w-3 mr-1" />Inválida</Badge>
                          ) : l.signature_valid === true ? (
                            <Badge className="bg-green-600 hover:bg-green-600">Ok</Badge>
                          ) : (<Badge variant="outline">—</Badge>)}
                        </TableCell>
                        <TableCell>
                          {l.processed ? <Badge className="bg-green-600 hover:bg-green-600">Sim</Badge> : <Badge variant="outline">Não</Badge>}
                        </TableCell>
                        <TableCell className="text-xs text-destructive max-w-[260px] truncate">{l.error_message || '—'}</TableCell>
                      </TableRow>
                    ))}
                    {webhookLogs.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum webhook recebido</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

function StatCard({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <Card className={alert ? 'border-destructive' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
          <span className="[&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
          {label}
        </div>
        <div className={`text-xl font-bold ${alert ? 'text-destructive' : ''}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className?: string; variant?: any }> = {
    pending: { label: 'Pendente', variant: 'outline' },
    processing: { label: 'Processando', className: 'bg-amber-500 hover:bg-amber-500 text-white' },
    completed: { label: 'Concluído', className: 'bg-green-600 hover:bg-green-600 text-white' },
    failed: { label: 'Falhou', variant: 'destructive' },
    cancelled: { label: 'Cancelado', variant: 'secondary' },
  };
  const m = map[status] || { label: status, variant: 'outline' };
  return <Badge variant={m.variant} className={m.className}>{m.label}</Badge>;
}

export default SuperAdminGateway;

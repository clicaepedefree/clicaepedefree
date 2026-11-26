import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Plus, QrCode, Trash2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Mode = "off" | "welcome" | "keywords";
type Rule = { keyword: string; match: "exact" | "contains"; response: string };
type Config = { botName: string; mode: Mode; notifyOrders: boolean; rules: Rule[]; connected: boolean };
type Draft = Omit<Config, "rules" | "connected"> & { rules: (Rule & { id: number })[] };

async function robot<T>(restaurantId: string, action: string, config?: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>("whatsapp-robot", {
    body: { ...config, restaurantId, action },
  });
  if (error) {
    const context = "context" in error ? error.context : null;
    const payload = context instanceof Response ? await context.json().catch(() => null) : null;
    throw new Error(payload?.error ?? "Não foi possível acessar a integração com WhatsApp.");
  }
  if (!data) throw new Error("O servidor não retornou a configuração.");
  return data;
}

export default function WhatsAppRobot() {
  const { user, restaurant, loading, logout } = useAuth();

  if (loading) return <p role="status" className="p-6">Carregando...</p>;
  if (!user) return <Navigate to="/entrar" replace />;
  if (!restaurant) return <Navigate to="/admin" replace />;

  return (
    <AppShell restaurant={restaurant} onLogout={logout} title="Robô de WhatsApp">
      <RobotSettings key={restaurant.id} restaurantId={restaurant.id} />
    </AppShell>
  );
}

function RobotSettings({ restaurantId }: { restaurantId: string }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [connected, setConnected] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const nextId = useRef(0);

  useEffect(() => {
    let live = true;
    robot<Config>(restaurantId, "load").then(config => {
      if (!live) return;
      setDraft({ botName: config.botName, mode: config.mode, notifyOrders: config.notifyOrders,
        rules: config.rules.map(rule => ({ ...rule, id: nextId.current++ })) });
      setConnected(config.connected);
      return robot<{ connected: boolean }>(restaurantId, "status").then(state => {
        if (live) setConnected(state.connected);
      }).catch(cause => { if (live) setConnectionError(cause.message); });
    }).catch(cause => { if (live) setError(cause.message); });
    return () => { live = false; };
  }, [restaurantId, attempt]);

  useEffect(() => {
    if (!pairing) return;
    let live = true;
    let inProgress = false;
    const interval = window.setInterval(async () => {
      if (inProgress) return;
      inProgress = true;
      try {
        const state = await robot<{ connected: boolean }>(restaurantId, "status");
        if (live && state.connected) {
          setConnected(true);
          setPairing(false);
          setQr(null);
          setConnectionError("");
          toast.success("WhatsApp conectado");
        }
      } catch (cause) {
        if (live) setConnectionError(cause instanceof Error ? cause.message : "Não foi possível verificar a conexão.");
      } finally { inProgress = false; }
    }, 5000);
    const expiration = window.setTimeout(() => {
      setPairing(false);
      setQr(null);
    }, 120000);
    return () => { live = false; window.clearInterval(interval); window.clearTimeout(expiration); };
  }, [pairing, restaurantId]);

  async function changeConnection(action: "connect" | "disconnect" | "status") {
    setConnectionBusy(true);
    setConnectionError("");
    setPairing(false);
    setQr(null);
    try {
      const result = await robot<{ connected: boolean; qr?: string | null }>(restaurantId, action);
      setConnected(result.connected);
      if (action === "connect" && !result.connected) {
        setPairing(true);
        setQr(result.qr ?? null);
      }
      if (action === "disconnect") toast.success("WhatsApp desconectado");
    } catch (cause) {
      setConnectionError(cause instanceof Error ? cause.message : "Não foi possível atualizar a conexão.");
    } finally { setConnectionBusy(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || saving) return;
    setSaving(true);
    setError("");
    try {
      await robot(restaurantId, "save", { ...draft, rules: draft.rules.map(({ keyword, match, response }) => ({ keyword, match, response })) });
      toast.success("Configurações salvas");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar as configurações.");
    } finally { setSaving(false); }
  }

  const update = (value: Partial<Draft>) => setDraft(previous => previous && { ...previous, ...value });
  const updateRule = (id: number, value: Partial<Rule>) => setDraft(previous => previous && ({
    ...previous, rules: previous.rules.map(rule => rule.id === id ? { ...rule, ...value } : rule),
  }));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Robô de WhatsApp</h1>
      {!draft ? (
        error ? <Card className="space-y-3 p-5">
          <p role="alert" className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => { setError(""); setAttempt(value => value + 1); }}>Tentar novamente</Button>
        </Card> : <p role="status" className="text-sm text-muted-foreground">Carregando configurações...</p>
      ) : <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg"><MessageCircle className="size-5 text-primary" aria-hidden="true" /> Conexão da loja</CardTitle>
            <CardDescription aria-live="polite">{connected ? "WhatsApp conectado" : "WhatsApp desconectado"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button type="button" disabled={connectionBusy} onClick={() => void changeConnection(connected ? "disconnect" : "connect")}>
                {!connected && <QrCode className="mr-2 size-4" aria-hidden="true" />}
                {connectionBusy ? "Aguarde…" : connected ? "Desconectar WhatsApp" : pairing ? "Atualizar QR Code" : "Conectar com QR Code"}
              </Button>
              <Button type="button" variant="outline" disabled={connectionBusy} onClick={() => void changeConnection("status")}>Verificar conexão</Button>
            </div>
            {connectionError && <p role="alert" className="text-sm text-destructive">{connectionError}</p>}
            {pairing && (qr ? (
              <div className="space-y-2 rounded-xl border p-4">
                <img src={qr} alt="QR Code para conectar o WhatsApp da loja" className="size-52 max-w-full rounded-lg bg-white p-2" />
                <p className="text-sm text-muted-foreground">No WhatsApp, abra Aparelhos conectados → Conectar um aparelho e escaneie o código.</p>
              </div>
            ) : <p role="status" className="text-sm text-muted-foreground">A Evolution está preparando o código. Se ele ainda não apareceu, use Atualizar QR Code.</p>)}
          </CardContent>
        </Card>

        <form onSubmit={save} className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="text-lg">Atendimento</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="max-w-sm space-y-2">
                <Label htmlFor="robot-name">Nome do assistente</Label>
                <Input id="robot-name" placeholder="Ex.: João" maxLength={60} value={draft.botName}
                  onChange={event => update({ botName: event.target.value })} disabled={saving} />
              </div>
              <fieldset className="space-y-2" disabled={saving}>
                <legend className="mb-2 text-sm font-medium">Respostas a mensagens recebidas</legend>
                <RadioGroup value={draft.mode} onValueChange={value => update({ mode: value as Mode })}>
                  {[
                    { id: "off", label: "Sem respostas automáticas" },
                    { id: "welcome", label: "Boas-vindas com link do cardápio" },
                    { id: "keywords", label: "Respostas por palavras-chave" },
                  ].map(mode => (
                    <Label htmlFor={`robot-mode-${mode.id}`} key={mode.id} className="flex items-center gap-2 rounded-lg border p-3">
                      <RadioGroupItem id={`robot-mode-${mode.id}`} value={mode.id} /> {mode.label}
                    </Label>
                  ))}
                </RadioGroup>
                {draft.mode !== "off" && <p className="text-xs text-muted-foreground">Fora do horário, o robô informa que a loja está fechada.</p>}
              </fieldset>
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <Label htmlFor="robot-notifications">Notificar mudanças no pedido</Label>
                  <p className="mt-1 text-xs text-muted-foreground">Envia aviso de preparo, entrega, finalização e outras mudanças de status.</p>
                </div>
                <Switch id="robot-notifications" checked={draft.notifyOrders} onCheckedChange={notifyOrders => update({ notifyOrders })} disabled={saving} />
              </div>
            </CardContent>
          </Card>

          {draft.mode === "keywords" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Regras de palavras-chave</CardTitle>
                <CardDescription>Use {"{nome}"}, {"{loja}"}, {"{robo}"} e {"{cardapio}"} nas mensagens.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {draft.rules.map(rule => (
                  <fieldset key={rule.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_1fr_auto]" disabled={saving}>
                    <div className="space-y-1">
                      <Label htmlFor={`keyword-${rule.id}`}>Palavra ou frase</Label>
                      <Input id={`keyword-${rule.id}`} required maxLength={120} value={rule.keyword} onChange={event => updateRule(rule.id, { keyword: event.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`keyword-match-${rule.id}`}>Quando responder</Label>
                      <Select value={rule.match} onValueChange={match => updateRule(rule.id, { match: match as Rule["match"] })}>
                        <SelectTrigger id={`keyword-match-${rule.id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Aparece na mensagem</SelectItem>
                          <SelectItem value="exact">Mensagem inteira</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="button" variant="outline" size="icon" className="self-end" aria-label={`Remover regra ${rule.keyword || "sem título"}`}
                      onClick={() => update({ rules: draft.rules.filter(candidate => candidate.id !== rule.id) })}><Trash2 className="size-4" aria-hidden="true" /></Button>
                    <div className="space-y-1 sm:col-span-3">
                      <Label htmlFor={`keyword-response-${rule.id}`}>Resposta</Label>
                      <Textarea id={`keyword-response-${rule.id}`} required maxLength={1000} value={rule.response}
                        onChange={event => updateRule(rule.id, { response: event.target.value })} />
                    </div>
                  </fieldset>
                ))}
                <Button type="button" variant="outline" disabled={saving || draft.rules.length >= 40}
                  onClick={() => update({ rules: [...draft.rules, { id: nextId.current++, keyword: "", match: "contains", response: "" }] })}>
                  <Plus className="mr-2 size-4" aria-hidden="true" /> Adicionar regra
                </Button>
              </CardContent>
            </Card>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Salvar configurações"}</Button>
        </form>
      </>}
    </div>
  );
}

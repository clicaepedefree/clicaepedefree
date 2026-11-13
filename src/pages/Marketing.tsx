import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { Sparkles, Facebook, Search, Save, BarChart3, Trash2, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AdPreview, CTA_LABELS } from "@/components/marketing/AdPreview";

interface Product { id: string; name: string; description: string | null; price: number; image_url: string | null }
interface Draft { id: string; product_id: string | null; headline: string | null; daily_budget_cents: number; duration_days: number; created_at: string; status: string }

const OBJECTIVES = [
  { value: "OUTCOME_TRAFFIC", label: "Tráfego — levar pessoas ao cardápio" },
  { value: "OUTCOME_SALES", label: "Vendas — pedidos pelo cardápio" },
  { value: "OUTCOME_ENGAGEMENT", label: "Engajamento — curtidas e comentários" },
];
const MIN_BUDGET = 6;
const brl = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

export default function Marketing() {
  const { user, restaurant, loading, logout } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [cta, setCta] = useState("ORDER_NOW");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [budget, setBudget] = useState("20");
  const [days, setDays] = useState("7");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState("5");
  const [ageMin, setAgeMin] = useState("18");
  const [ageMax, setAgeMax] = useState("65");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const menuUrl = restaurant?.slug ? `${window.location.origin}/cardapio/${restaurant.slug}` : "";

  const loadDrafts = async () => {
    if (!restaurant?.id) return;
    const { data } = await supabase.from("ad_drafts")
      .select("id, product_id, headline, daily_budget_cents, duration_days, created_at, status")
      .eq("restaurant_id", restaurant.id).order("created_at", { ascending: false });
    setDrafts((data as Draft[]) || []);
  };

  useEffect(() => {
    if (!restaurant?.id) return;
    supabase.from("products").select("id, name, description, price, image_url")
      .eq("restaurant_id", restaurant.id).eq("is_active", true).order("name").limit(2000)
      .then(({ data }) => setProducts((data as Product[]) || []));
    loadDrafts();
  }, [restaurant?.id]);

  const filtered = useMemo(
    () => products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [products, query],
  );

  const choose = (p: Product) => {
    setSelected(p);
    setHeadline(p.name.slice(0, 40));
    setPrimaryText(`${p.name}${p.description ? ` — ${p.description}` : ""}\nPor ${brl(Number(p.price))}. Peça agora pelo nosso cardápio digital!`);
  };

  const generate = async () => {
    if (!selected) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ad-copy", {
        body: { productId: selected.id, objective },
      });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { msg = (await error.context.json()).error ?? msg; } catch { /* keep */ }
        }
        throw new Error(msg);
      }
      setHeadline(data.headline ?? "");
      setPrimaryText(data.primaryText ?? "");
      if (data.cta) setCta(data.cta);
      toast.success("Texto gerado! Revise antes de salvar.");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível gerar o texto.");
    } finally {
      setGenerating(false);
    }
  };

  const budgetNum = Number(budget.replace(",", ".")) || 0;
  const daysNum = Math.max(1, Math.floor(Number(days) || 1));
  const total = budgetNum * daysNum;

  const save = async () => {
    if (!restaurant || !selected) return;
    if (budgetNum < MIN_BUDGET) return toast.error(`O orçamento diário mínimo é ${brl(MIN_BUDGET)}.`);
    if (!headline.trim() || !primaryText.trim()) return toast.error("Preencha título e texto do anúncio.");
    setSaving(true);
    const { error } = await supabase.from("ad_drafts").insert({
      restaurant_id: restaurant.id,
      product_id: selected.id,
      objective,
      daily_budget_cents: Math.round(budgetNum * 100),
      duration_days: daysNum,
      targeting: { city: city.trim(), radius_km: Number(radius) || 5, age_min: Number(ageMin) || 18, age_max: Number(ageMax) || 65 },
      headline: headline.trim().slice(0, 80),
      primary_text: primaryText.trim().slice(0, 1000),
      cta,
      destination_url: menuUrl,
    });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar o rascunho.");
    toast.success("Rascunho salvo.");
    loadDrafts();
  };

  const removeDraft = async (id: string) => {
    await supabase.from("ad_drafts").delete().eq("id", id);
    loadDrafts();
  };

  if (loading) return null;
  if (!user) return <Navigate to="/criar-conta" replace />;
  if (!restaurant) return <Navigate to="/admin" replace />;

  return (
    <AppShell restaurant={restaurant} onLogout={logout} title="Marketing com IA" subtitle="Anúncios no Facebook e Instagram com seus pratos">
      <div className="space-y-6">
        <Card>
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Facebook className="h-5 w-5" /></div>
              <div>
                <p className="font-semibold">Conta Meta (Facebook e Instagram)</p>
                <p className="text-sm text-muted-foreground">Status: <Badge variant="secondary">Não conectada</Badge></p>
              </div>
            </div>
            <div className="text-right">
              <Button disabled>Conectar conta Meta</Button>
              <p className="text-xs text-muted-foreground mt-1">Disponível em breve</p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="create">
          <TabsList>
            <TabsTrigger value="create">Criar anúncio</TabsTrigger>
            <TabsTrigger value="drafts">Rascunhos ({drafts.length})</TabsTrigger>
            <TabsTrigger value="results">Resultados</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
              <div className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="text-base">1. Escolha o prato</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" placeholder="Buscar prato" value={query} onChange={(e) => setQuery(e.target.value)} />
                    </div>
                    {products.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Você ainda não tem pratos ativos no cardápio.</p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 max-h-72 overflow-y-auto pr-1">
                        {filtered.map((p) => (
                          <button key={p.id} onClick={() => choose(p)}
                            className={`flex items-center gap-3 rounded-lg border p-2 text-left transition hover:bg-muted ${selected?.id === p.id ? "border-primary ring-1 ring-primary" : ""}`}>
                            <div className="h-12 w-12 rounded-md bg-muted overflow-hidden shrink-0">
                              {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground">{brl(Number(p.price))}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className={!selected ? "opacity-60 pointer-events-none" : ""}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                    <CardTitle className="text-base">2. Texto do anúncio</CardTitle>
                    <Button size="sm" onClick={generate} disabled={!selected || generating}>
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Gerar texto com IA
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Título ({headline.length}/40)</Label>
                      <Input value={headline} maxLength={80} onChange={(e) => setHeadline(e.target.value)} />
                    </div>
                    <div>
                      <Label>Texto principal</Label>
                      <Textarea rows={4} value={primaryText} maxLength={1000} onChange={(e) => setPrimaryText(e.target.value)} />
                    </div>
                    <div>
                      <Label>Botão</Label>
                      <Select value={cta} onValueChange={setCta}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(CTA_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card className={!selected ? "opacity-60 pointer-events-none" : ""}>
                  <CardHeader><CardTitle className="text-base">3. Campanha</CardTitle>
                    <CardDescription>Destino: seu cardápio digital — {menuUrl}</CardDescription></CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Label>Objetivo</Label>
                      <Select value={objective} onValueChange={setObjective}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{OBJECTIVES.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label>Orçamento diário (R$)</Label><Input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} /></div>
                    <div><Label>Duração (dias)</Label><Input type="number" min={1} max={90} value={days} onChange={(e) => setDays(e.target.value)} /></div>
                    <div><Label>Cidade</Label><Input placeholder="Ex.: São Paulo" value={city} onChange={(e) => setCity(e.target.value)} /></div>
                    <div><Label>Raio (km)</Label><Input type="number" min={1} max={80} value={radius} onChange={(e) => setRadius(e.target.value)} /></div>
                    <div><Label>Idade mínima</Label><Input type="number" min={18} max={65} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} /></div>
                    <div><Label>Idade máxima</Label><Input type="number" min={18} max={65} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} /></div>
                    <div className="sm:col-span-2 rounded-lg bg-muted p-3 text-sm">
                      <p>Previsão de gasto: <strong>{brl(budgetNum)}</strong>/dia × {daysNum} dias = <strong>{brl(total)}</strong> no máximo.</p>
                      <p className="text-xs text-muted-foreground mt-1">Valor estimado de investimento. Resultados (cliques, pedidos) não são garantidos.</p>
                      {budgetNum > 0 && budgetNum < MIN_BUDGET && <p className="text-xs text-destructive mt-1">Mínimo de {brl(MIN_BUDGET)} por dia.</p>}
                    </div>
                    <Button className="sm:col-span-2" onClick={save} disabled={saving}><Save className="h-4 w-4" />Salvar rascunho</Button>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:sticky lg:top-4 h-fit space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Prévia</p>
                <AdPreview restaurantName={restaurant.name} logoUrl={restaurant.logo_url} imageUrl={selected?.image_url}
                  headline={headline} primaryText={primaryText} cta={cta} url={menuUrl} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="drafts" className="mt-4">
            <Card><CardContent className="p-0 divide-y">
              {drafts.length === 0 && <p className="p-6 text-sm text-muted-foreground">Nenhum rascunho salvo ainda.</p>}
              {drafts.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{d.headline || "Sem título"}</p>
                    <p className="text-xs text-muted-foreground">{products.find((p) => p.id === d.product_id)?.name ?? "—"} · {brl(d.daily_budget_cents / 100)}/dia · {d.duration_days} dias</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Rascunho</Badge>
                    <Button size="icon" variant="ghost" aria-label="Excluir rascunho" onClick={() => removeDraft(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="results" className="mt-4">
            <Card><CardContent className="flex flex-col items-center text-center gap-2 p-10">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
              <p className="font-semibold">Conecte sua conta Meta para ver resultados</p>
              <p className="text-sm text-muted-foreground max-w-md">Investimento, impressões, cliques, CPC e CTR aparecerão aqui com dados reais das suas campanhas.</p>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

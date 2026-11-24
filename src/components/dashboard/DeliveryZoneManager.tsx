import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface DeliveryZone {
  id: string;
  neighborhood: string;
  delivery_fee: number;
  is_active: boolean;
}

interface DeliveryZoneManagerProps {
  restaurant: any;
}

export function DeliveryZoneManager({ restaurant }: DeliveryZoneManagerProps) {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingZone, setEditingZone] = useState<DeliveryZone | null>(null);
  const [newZone, setNewZone] = useState({ neighborhood: "", delivery_fee: 0 });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchZones();
  }, [restaurant.id]);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('neighborhood');

      if (error) throw error;
      setZones(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar zonas de entrega",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingZone) {
        const { error } = await supabase
          .from('delivery_zones')
          .update({
            neighborhood: editingZone.neighborhood,
            delivery_fee: editingZone.delivery_fee,
            is_active: editingZone.is_active
          })
          .eq('id', editingZone.id);

        if (error) throw error;
        setEditingZone(null);
      } else {
        const { error } = await supabase
          .from('delivery_zones')
          .insert({
            restaurant_id: restaurant.id,
            neighborhood: newZone.neighborhood,
            delivery_fee: newZone.delivery_fee
          });

        if (error) throw error;
        setNewZone({ neighborhood: "", delivery_fee: 0 });
      }

      setIsDialogOpen(false);
      fetchZones();
      toast({
        title: "Zona de entrega salva",
        description: "As informações foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar zona de entrega",
        description: error.message,
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('delivery_zones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchZones();
      toast({
        title: "Zona removida",
        description: "A zona de entrega foi removida com sucesso.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao remover zona",
        description: error.message,
      });
    }
  };

  const toggleActive = async (zone: DeliveryZone) => {
    try {
      const { error } = await supabase
        .from('delivery_zones')
        .update({ is_active: !zone.is_active })
        .eq('id', zone.id);

      if (error) throw error;
      fetchZones();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar zona",
        description: error.message,
      });
    }
  };

  if (loading) {
    return <div className="animate-pulse">Carregando zonas de entrega...</div>;
  }

  return (
    <div className="space-y-4">
      <DeliveryDistanceSettings key={restaurant.id} restaurantId={restaurant.id} />
      <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Zonas de Entrega</CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingZone(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Zona
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingZone ? 'Editar Zona de Entrega' : 'Nova Zona de Entrega'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="neighborhood">Bairro</Label>
                <Input
                  id="neighborhood"
                  value={editingZone ? editingZone.neighborhood : newZone.neighborhood}
                  onChange={(e) => 
                    editingZone 
                      ? setEditingZone({...editingZone, neighborhood: e.target.value})
                      : setNewZone({...newZone, neighborhood: e.target.value})
                  }
                  placeholder="Nome do bairro"
                />
              </div>
              <div>
                <Label htmlFor="delivery_fee">Taxa de Entrega (R$)</Label>
                <Input
                  id="delivery_fee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingZone ? editingZone.delivery_fee : newZone.delivery_fee}
                  onChange={(e) => 
                    editingZone 
                      ? setEditingZone({...editingZone, delivery_fee: parseFloat(e.target.value) || 0})
                      : setNewZone({...newZone, delivery_fee: parseFloat(e.target.value) || 0})
                  }
                  placeholder="0.00"
                />
              </div>
              <Button onClick={handleSave} className="w-full">
                {editingZone ? 'Atualizar' : 'Criar'} Zona
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {zones.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhuma zona de entrega cadastrada
          </p>
        ) : (
          <div className="space-y-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className={`flex items-center justify-between p-3 border rounded-lg ${
                  zone.is_active ? 'bg-background' : 'bg-muted opacity-60'
                }`}
              >
                <div className="flex-1">
                  <div className="font-medium">{zone.neighborhood}</div>
                  <div className="text-sm text-muted-foreground">
                    Taxa: R$ {zone.delivery_fee.toFixed(2)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={zone.is_active ? "default" : "secondary"}
                    size="sm"
                    onClick={() => toggleActive(zone)}
                  >
                    {zone.is_active ? 'Ativo' : 'Inativo'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingZone(zone);
                      setIsDialogOpen(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(zone.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      </Card>
    </div>
  );
}

type PriceBand = { upToMeters: number; feeCents: number };
type BandDraft = { id: string; limit: string; fee: string };

function decimal(value: string) {
  const number = value.trim().replace(",", ".");
  return /^\d+(\.\d{1,2})?$/.test(number) ? Number(number) : NaN;
}

function DeliveryDistanceSettings({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [origin, setOrigin] = useState("");
  const [bands, setBands] = useState<PriceBand[]>([]);
  const [drafts, setDrafts] = useState<BandDraft[] | null>(null);
  const [draftError, setDraftError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    void (async () => {
      const { data, error } = await supabase.from("delivery_distance_settings")
        .select("enabled, origin_address, max_km, delivery_fee, price_bands")
        .eq("restaurant_id", restaurantId).maybeSingle();
      if (!active) return;
      if (error) {
        setLoadError(["PGRST204", "PGRST205", "42P01", "42703"].includes(error.code)
          ? "A configuração por KM aguarda atualização no banco do Lovable Cloud."
          : "Não foi possível carregar a configuração por KM.");
      }
      if (data) {
        setExists(true);
        setEnabled(data.enabled);
        setOrigin(data.origin_address);
        setBands(Array.isArray(data.price_bands) ? data.price_bands as PriceBand[] : [{
          upToMeters: Math.round(data.max_km * 1000),
          feeCents: Math.round(data.delivery_fee * 100),
        }]);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [restaurantId, loadAttempt]);

  function openBands() {
    setDraftError("");
    setDrafts(bands.map(band => ({
      id: crypto.randomUUID(), limit: String(band.upToMeters / 1000), fee: String(band.feeCents / 100),
    })));
  }

  function applyBands() {
    if (!drafts) return;
    const next = drafts.map(draft => ({
      upToMeters: Math.round(decimal(draft.limit) * 1000),
      feeCents: Math.round(decimal(draft.fee) * 100),
    })).sort((a, b) => a.upToMeters - b.upToMeters);
    const invalid = next.some((band, index) => !Number.isInteger(band.upToMeters) || band.upToMeters <= 0 ||
      band.upToMeters > 100000 || !Number.isInteger(band.feeCents) || band.feeCents < 0 ||
      band.feeCents > 100000 || band.upToMeters === next[index - 1]?.upToMeters);
    if (invalid) {
      setDraftError("Defina limites diferentes entre 0,01 e 100 km e valores entre R$ 0,00 e R$ 1.000,00.");
      return;
    }
    setBands(next);
    setDrafts(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!exists && !enabled && !origin.trim() && bands.length === 0) return;
    if (origin.trim().length < 8 || (enabled && bands.length === 0)) {
      toast({ title: "Informe o endereço da loja e adicione pelo menos uma faixa para usar o modo KM.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("delivery_distance_settings").upsert({
        restaurant_id: restaurantId,
        enabled,
        origin_address: origin.trim(),
        max_km: (bands.at(-1)?.upToMeters ?? 10) / 1000,
        delivery_fee: (bands[0]?.feeCents ?? 0) / 100,
        price_bands: bands,
      });
      if (error) throw error;
      setExists(true);
      toast({ title: "Configuração de entrega salva." });
    } catch {
      toast({ title: "Não foi possível salvar a configuração.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader><CardTitle>Modo de entrega</CardTitle></CardHeader>
      <CardContent>
        {loading && <p role="status">Carregando configuração...</p>}
        {loadError && (
          <div className="space-y-2">
            <p role="alert">{loadError}</p>
            <Button variant="outline" onClick={() => setLoadAttempt(attempt => attempt + 1)}>Tentar novamente</Button>
          </div>
        )}
        {!loading && !loadError && (
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={saving} className="space-y-4">
              <legend className="mb-2 text-sm font-medium">Como a loja cobra a entrega?</legend>
              <RadioGroup value={enabled ? "distance" : "neighborhood"} onValueChange={value => setEnabled(value === "distance")}
                className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2"><RadioGroupItem value="neighborhood" id="delivery-neighborhood" /><Label htmlFor="delivery-neighborhood">Por bairro</Label></div>
                <div className="flex items-center gap-2"><RadioGroupItem value="distance" id="delivery-distance" /><Label htmlFor="delivery-distance">Por KM</Label></div>
              </RadioGroup>
              <div className="max-w-xl space-y-2">
                <Label htmlFor="distance-origin">Endereço de saída para entregas por KM</Label>
                <Input id="distance-origin" value={origin} onChange={event => setOrigin(event.target.value)}
                  placeholder="Rua, número, bairro, cidade, UF e CEP" maxLength={300} required={enabled} />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={openBands}>Configurar faixas por KM</Button>
                {bands.length > 0 && <span className="text-sm text-muted-foreground">
                  {bands.length} {bands.length === 1 ? "faixa" : "faixas"} · Até {((bands.at(-1)?.upToMeters ?? 0) / 1000).toLocaleString("pt-BR")} km de trajeto
                </span>}
              </div>
              <Button type="submit">{saving ? "Salvando..." : "Salvar configuração"}</Button>
            </fieldset>
          </form>
        )}

        <Dialog open={drafts !== null} onOpenChange={open => { if (!open) setDrafts(null); }}>
          <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Faixas de preço por KM</DialogTitle>
              <DialogDescription>
                As faixas começam em 0 km e são ordenadas pelo limite ao aplicar. Cada limite inclui a distância indicada.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_1fr_1fr_2.5rem] gap-2 text-sm font-medium">
                <span>De (km)</span><span>Até (km)</span><span>Taxa (R$)</span>
              </div>
              {drafts?.map((draft, index) => (
                <div className="grid grid-cols-[1fr_1fr_1fr_2.5rem] gap-2" key={draft.id}>
                  <Input readOnly aria-label={`Início da faixa ${index + 1}`} value={index === 0 ? "0" : drafts[index - 1].limit} className="bg-muted" />
                  <Input inputMode="decimal" aria-label={`Limite da faixa ${index + 1} em KM`} value={draft.limit}
                    onChange={event => setDrafts(rows => rows?.map(row => row.id === draft.id ? { ...row, limit: event.target.value } : row) ?? null)} />
                  <Input inputMode="decimal" aria-label={`Taxa da faixa ${index + 1} em reais`} value={draft.fee}
                    onChange={event => setDrafts(rows => rows?.map(row => row.id === draft.id ? { ...row, fee: event.target.value } : row) ?? null)} />
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remover faixa ${index + 1}`}
                    onClick={() => setDrafts(rows => rows?.filter(row => row.id !== draft.id) ?? null)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              {draftError && <p role="alert" className="text-sm text-destructive">{draftError}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" variant="outline" disabled={(drafts?.length ?? 0) >= 50}
                  onClick={() => setDrafts(rows => [...(rows ?? []), { id: crypto.randomUUID(), limit: "", fee: "" }])}>
                  <Plus className="h-4 w-4" /> Adicionar faixa
                </Button>
                <Button type="button" variant="ghost" disabled={!drafts?.length} onClick={() => setDrafts([])}>Limpar faixas</Button>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDrafts(null)}>Cancelar</Button>
              <Button onClick={applyBands}>Aplicar faixas</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

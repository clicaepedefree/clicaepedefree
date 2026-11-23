import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

function DeliveryDistanceSettings({ restaurantId }: { restaurantId: string }) {
  const { toast } = useToast();
  const [enabled, setEnabled] = useState(false);
  const [origin, setOrigin] = useState("");
  const [maxKm, setMaxKm] = useState("");
  const [fee, setFee] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const { data, error } = await supabase.from("delivery_distance_settings")
        .select("enabled, origin_address, max_km, delivery_fee")
        .eq("restaurant_id", restaurantId).maybeSingle();
      if (!active) return;
      setLoadFailed(Boolean(error));
      if (data) {
        setEnabled(data.enabled);
        setOrigin(data.origin_address);
        setMaxKm(String(data.max_km));
        setFee(String(data.delivery_fee));
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [restaurantId]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!enabled && !origin && !maxKm && !fee) return;
    const maxDistance = Number(maxKm);
    const deliveryFee = Number(fee);
    if (origin.trim().length < 8 || !Number.isFinite(maxDistance) || maxDistance <= 0 ||
        maxDistance > 100 || !fee || !Number.isFinite(deliveryFee) || deliveryFee < 0 || deliveryFee > 1000) {
      toast({ title: "Confira o endereço, a distância e a taxa.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("delivery_distance_settings").upsert({
      restaurant_id: restaurantId,
      enabled,
      origin_address: origin.trim(),
      max_km: maxDistance,
      delivery_fee: deliveryFee,
    });
    setSaving(false);
    toast(error
      ? { title: "Não foi possível salvar a configuração.", variant: "destructive" }
      : { title: "Configuração de entrega salva." });
  };

  return (
    <Card>
      <CardHeader><CardTitle>Entrega por distância</CardTitle></CardHeader>
      <CardContent>
        {loading && <p>Carregando configuração...</p>}
        {loadFailed && <p role="alert">Não foi possível carregar a configuração de distância.</p>}
        {!loading && !loadFailed && (
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={saving} className="space-y-4">
              <div className="flex items-center gap-3">
                <Switch id="distance-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={saving} />
                <Label htmlFor="distance-enabled">Usar distância no cardápio digital</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Quando ativada, a entrega é calculada pelo trajeto até o cliente. Desative para voltar à cobrança por bairro.
              </p>
              <div className="space-y-2">
                <Label htmlFor="distance-origin">Endereço completo da loja</Label>
                <Input id="distance-origin" value={origin} onChange={(event) => setOrigin(event.target.value)}
                  placeholder="Rua, número, bairro, cidade, UF e CEP" maxLength={300} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="distance-max">Distância máxima (km)</Label>
                  <Input id="distance-max" type="number" min="0.01" max="100" step="0.01" required
                    value={maxKm} onChange={(event) => setMaxKm(event.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="distance-fee">Taxa de entrega (R$)</Label>
                  <Input id="distance-fee" type="number" min="0" max="1000" step="0.01" required
                    value={fee} onChange={(event) => setFee(event.target.value)} />
                </div>
              </div>
              <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar entrega por distância"}</Button>
            </fieldset>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

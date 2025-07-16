import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  );
}
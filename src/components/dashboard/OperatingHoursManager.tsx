import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Save } from "lucide-react";

interface OperatingHour {
  id?: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_active: boolean;
}

interface OperatingHoursManagerProps {
  restaurant: any;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

export function OperatingHoursManager({ restaurant }: OperatingHoursManagerProps) {
  const [hours, setHours] = useState<OperatingHour[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOperatingHours();
  }, [restaurant.id]);

  const fetchOperatingHours = async () => {
    try {
      const { data, error } = await supabase
        .from('operating_hours')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('day_of_week');

      if (error) throw error;

      // Initialize all days with existing data or defaults
      const initializedHours = DAYS_OF_WEEK.map(day => {
        const existing = data?.find(h => h.day_of_week === day.value);
        return existing || {
          day_of_week: day.value,
          open_time: "08:00",
          close_time: "22:00",
          is_active: false
        };
      });

      setHours(initializedHours);
    } catch (error) {
      console.error('Erro ao buscar horários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar horários de funcionamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTimeChange = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    setHours(prev => prev.map((h, i) => 
      i === dayIndex ? { ...h, [field]: value } : h
    ));
  };

  const handleActiveChange = (dayIndex: number, isActive: boolean) => {
    setHours(prev => prev.map((h, i) => 
      i === dayIndex ? { ...h, is_active: isActive } : h
    ));
  };

  const saveHours = async () => {
    setSaving(true);
    try {
      for (const hour of hours) {
        const hourData = {
          restaurant_id: restaurant.id,
          day_of_week: hour.day_of_week,
          open_time: hour.open_time,
          close_time: hour.close_time,
          is_active: hour.is_active
        };

        if (hour.id) {
          // Update existing
          const { error } = await supabase
            .from('operating_hours')
            .update(hourData)
            .eq('id', hour.id);
          if (error) throw error;
        } else if (hour.is_active) {
          // Insert new only if active
          const { error } = await supabase
            .from('operating_hours')
            .upsert(hourData, { 
              onConflict: 'restaurant_id,day_of_week',
              ignoreDuplicates: false 
            });
          if (error) throw error;
        }
      }

      // Update restaurant open status based on current time
      const { error: rpcError } = await supabase.rpc('update_restaurants_open_status');
      if (rpcError) console.error('Error updating open status:', rpcError);

      toast({
        title: "Sucesso",
        description: "Horários de funcionamento salvos com sucesso",
      });

      await fetchOperatingHours();
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar horários de funcionamento",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div>Carregando horários...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Horário de Funcionamento
        </CardTitle>
        <CardDescription>
          Configure os dias e horários que seu estabelecimento funciona. O cardápio abrirá e fechará automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hours.map((hour, index) => {
          const day = DAYS_OF_WEEK.find(d => d.value === hour.day_of_week);
          return (
            <div 
              key={hour.day_of_week} 
              className={`flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-lg border ${
                hour.is_active ? 'bg-muted/50 border-primary/20' : 'bg-background'
              }`}
            >
              <div className="flex items-center gap-3 min-w-[180px]">
                <Switch
                  checked={hour.is_active}
                  onCheckedChange={(checked) => handleActiveChange(index, checked)}
                />
                <Label className={`font-medium ${hour.is_active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {day?.label}
                </Label>
              </div>
              
              {hour.is_active && (
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Abre:</Label>
                    <Input
                      type="time"
                      value={hour.open_time}
                      onChange={(e) => handleTimeChange(index, 'open_time', e.target.value)}
                      className="w-[130px]"
                    />
                  </div>
                  <span className="text-muted-foreground">até</span>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Fecha:</Label>
                    <Input
                      type="time"
                      value={hour.close_time}
                      onChange={(e) => handleTimeChange(index, 'close_time', e.target.value)}
                      className="w-[130px]"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div className="pt-4 border-t">
          <Button onClick={saveHours} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar Horários"}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            O status do seu cardápio (Aberto/Fechado) será atualizado automaticamente com base nestes horários.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

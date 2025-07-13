import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RestaurantSettingsProps {
  restaurant: any;
  onUpdate: (restaurant: any) => void;
}

export function RestaurantSettings({ restaurant, onUpdate }: RestaurantSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const name = formData.get("name") as string;
      const whatsapp = formData.get("whatsapp") as string;

      const { data, error } = await supabase
        .from('restaurants')
        .update({ name, whatsapp })
        .eq('id', restaurant.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Configurações atualizadas!",
        description: "As informações do restaurante foram salvas.",
      });

      onUpdate(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-muted-foreground">Gerencie as informações do seu restaurante</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Atualize as informações principais do seu restaurante
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Restaurante</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={restaurant.name}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  name="whatsapp"
                  defaultValue={restaurant.whatsapp}
                  required
                />
              </div>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Link Público</CardTitle>
            <CardDescription>
              Este é o link do seu cardápio que você pode compartilhar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={`${window.location.origin}/cardapio/${restaurant.slug}`}
                readOnly
                className="flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/cardapio/${restaurant.slug}`);
                  toast({ title: "Link copiado!" });
                }}
              >
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Store } from "lucide-react";

interface RestaurantSetupProps {
  user: User;
  onRestaurantCreated: (restaurant: any) => void;
}

export function RestaurantSetup({ user, onRestaurantCreated }: RestaurantSetupProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const restaurantName = formData.get("restaurantName") as string;
      const whatsapp = formData.get("whatsapp") as string;

      // Gerar slug único
      const { data: slugData, error: slugError } = await supabase
        .rpc('generate_unique_slug', { restaurant_name: restaurantName });

      if (slugError) throw slugError;

      // Criar restaurante
      const { data, error } = await supabase
        .from('restaurants')
        .insert({
          user_id: user.id,
          name: restaurantName,
          whatsapp: whatsapp,
          slug: slugData
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Restaurante criado com sucesso!",
        description: `Seu link público: ${window.location.origin}/cardapio/${data.slug}`,
      });

      onRestaurantCreated(data);
    } catch (error: any) {
      console.error('Erro ao criar restaurante:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar restaurante",
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Store className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Configure seu restaurante</CardTitle>
          <CardDescription>
            Vamos criar o perfil do seu restaurante para começar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurantName">Nome do Restaurante</Label>
              <Input
                id="restaurantName"
                name="restaurantName"
                placeholder="Ex: Pizzaria do João"
                defaultValue={user.user_metadata?.restaurant_name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp (com DDD)</Label>
              <Input
                id="whatsapp"
                name="whatsapp"
                placeholder="Ex: 11999999999"
                defaultValue={user.user_metadata?.whatsapp || ""}
                required
              />
              <p className="text-sm text-muted-foreground">
                Os pedidos serão enviados para este número
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Criando..." : "Criar Restaurante"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
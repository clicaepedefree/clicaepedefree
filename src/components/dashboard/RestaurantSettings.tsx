import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "./ImageUpload";
import { Truck, ShoppingBag } from "lucide-react";

interface RestaurantSettingsProps {
  restaurant: any;
  onUpdate: (restaurant: any) => void;
}

export function RestaurantSettings({ restaurant, onUpdate }: RestaurantSettingsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [deliveryEnabled, setDeliveryEnabled] = useState(restaurant.delivery_enabled ?? true);
  const [pickupEnabled, setPickupEnabled] = useState(restaurant.pickup_enabled ?? true);
  const { toast } = useToast();

  const handleImageUpdate = async (field: 'logo_url' | 'banner_url', url: string) => {
    try {
      const updatePayload = { [field]: url } as { logo_url?: string; banner_url?: string };
      const { data, error } = await supabase
        .from('restaurants')
        .update(updatePayload)
        .eq('id', restaurant.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Imagem atualizada!",
        description: `${field === 'logo_url' ? 'Logo' : 'Banner'} ${url ? 'carregado' : 'removido'} com sucesso.`,
      });

      onUpdate(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar imagem",
        description: error.message,
      });
    }
  };

  const handleOrderTypeToggle = async (type: 'delivery' | 'pickup', enabled: boolean) => {
    try {
      const updateData = type === 'delivery' 
        ? { delivery_enabled: enabled }
        : { pickup_enabled: enabled };

      const { data, error } = await supabase
        .from('restaurants')
        .update(updateData)
        .eq('id', restaurant.id)
        .select()
        .single();

      if (error) throw error;

      if (type === 'delivery') {
        setDeliveryEnabled(enabled);
      } else {
        setPickupEnabled(enabled);
      }

      toast({
        title: enabled ? "Modalidade ativada!" : "Modalidade desativada!",
        description: `${type === 'delivery' ? 'Delivery' : 'Retirada'} foi ${enabled ? 'ativado' : 'desativado'}.`,
      });

      onUpdate(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao atualizar",
        description: error.message,
      });
    }
  };

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

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPasswordLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const currentPassword = formData.get("currentPassword") as string;
      const newPassword = formData.get("newPassword") as string;
      const confirmPassword = formData.get("confirmPassword") as string;

      if (newPassword !== confirmPassword) {
        throw new Error("As senhas não coincidem");
      }

      if (newPassword.length < 6) {
        throw new Error("A nova senha deve ter pelo menos 6 caracteres");
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast({
        title: "Senha alterada!",
        description: "Sua senha foi atualizada com sucesso.",
      });

      // Limpar o formulário
      (e.target as HTMLFormElement).reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: error.message,
      });
    } finally {
      setIsPasswordLoading(false);
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
            <CardTitle>Imagens do Restaurante</CardTitle>
            <CardDescription>
              Faça upload da logo e banner do seu restaurante
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-medium">Logo do Restaurante</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Aparecerá no lado esquerdo do cardápio, ao lado do nome
              </p>
              <ImageUpload
                currentUrl={restaurant.logo_url}
                onImageUploaded={(url) => handleImageUpdate('logo_url', url)}
                type="logo"
                restaurantId={restaurant.id}
              />
            </div>
            
            <div>
              <Label className="text-base font-medium">Banner do Restaurante</Label>
              <p className="text-sm text-muted-foreground mb-3">
                Aparecerá no topo do cardápio, acima da logo e nome
              </p>
              <ImageUpload
                currentUrl={restaurant.banner_url}
                onImageUploaded={(url) => handleImageUpdate('banner_url', url)}
                type="banner"
                restaurantId={restaurant.id}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modalidades de Pedido</CardTitle>
            <CardDescription>
              Configure quais tipos de pedido seu estabelecimento aceita
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-base font-medium">Delivery</Label>
                  <p className="text-sm text-muted-foreground">Entrega no endereço do cliente</p>
                </div>
              </div>
              <Switch 
                checked={deliveryEnabled}
                onCheckedChange={(checked) => handleOrderTypeToggle('delivery', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-base font-medium">Retirada</Label>
                  <p className="text-sm text-muted-foreground">Cliente retira no local</p>
                </div>
              </div>
              <Switch 
                checked={pickupEnabled}
                onCheckedChange={(checked) => handleOrderTypeToggle('pickup', checked)}
              />
            </div>
            
            {!deliveryEnabled && !pickupEnabled && (
              <p className="text-sm text-destructive">
                ⚠️ Atenção: Nenhuma modalidade está ativa. Os clientes não poderão fazer pedidos.
              </p>
            )}
          </CardContent>
        </Card>

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

        <Card>
          <CardHeader>
            <CardTitle>Alterar Senha</CardTitle>
            <CardDescription>
              Atualize sua senha de acesso ao painel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={isPasswordLoading}>
                {isPasswordLoading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
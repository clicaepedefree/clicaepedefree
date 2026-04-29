import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Smartphone } from "lucide-react";

interface PaymentMethod {
  id: string;
  method_type: 'cash' | 'debit_card' | 'credit_card' | 'food_voucher' | 'meal_voucher' | 'pix';
  is_active: boolean;
  pix_key?: string;
  pix_online_enabled?: boolean;
  restaurant_pix_key?: string;
  restaurant_pix_key_type?: string;
}

interface PaymentMethodsManagerProps {
  restaurant: any;
}

export function PaymentMethodsManager({ restaurant }: PaymentMethodsManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pixKey, setPixKey] = useState("");
  const [pixOnlineEnabled, setPixOnlineEnabled] = useState(false);
  const [restaurantPixKey, setRestaurantPixKey] = useState("");
  const [restaurantPixKeyType, setRestaurantPixKeyType] = useState<string>("aleatoria");
  const [savingOnline, setSavingOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const methodLabels = {
    cash: { label: "Dinheiro", icon: DollarSign },
    debit_card: { label: "Cartão de Débito", icon: CreditCard },
    credit_card: { label: "Cartão de Crédito", icon: CreditCard },
    food_voucher: { label: "Vale Alimentação", icon: CreditCard },
    meal_voucher: { label: "Vale Refeição", icon: CreditCard },
    pix: { label: "PIX", icon: Smartphone }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, [restaurant.id]);

  const fetchPaymentMethods = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('restaurant_id', restaurant.id);

      if (error) throw error;

      const methods = (data || []) as PaymentMethod[];
      setPaymentMethods(methods);
      
      const pixMethod = methods.find(m => m.method_type === 'pix');
      if (pixMethod?.pix_key) setPixKey(pixMethod.pix_key);
      if (pixMethod?.pix_online_enabled) setPixOnlineEnabled(true);
      if (pixMethod?.restaurant_pix_key) setRestaurantPixKey(pixMethod.restaurant_pix_key);
      if (pixMethod?.restaurant_pix_key_type) setRestaurantPixKeyType(pixMethod.restaurant_pix_key_type);
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar formas de pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentMethod = async (methodType: 'cash' | 'card' | 'pix', isActive: boolean) => {
    try {
      const existingMethod = paymentMethods.find(m => m.method_type === methodType);

      if (existingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update({ is_active: isActive })
          .eq('id', existingMethod.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert({
            restaurant_id: restaurant.id,
            method_type: methodType,
            is_active: isActive,
            pix_key: methodType === 'pix' ? pixKey : null
          });

        if (error) throw error;
      }

      await fetchPaymentMethods();
      toast({
        title: "Sucesso",
        description: `Forma de pagamento ${isActive ? 'ativada' : 'desativada'}`,
      });
    } catch (error) {
      console.error('Erro ao atualizar forma de pagamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar forma de pagamento",
        variant: "destructive",
      });
    }
  };

  const updatePixKey = async () => {
    try {
      const existingMethod = paymentMethods.find(m => m.method_type === 'pix');

      if (existingMethod) {
        const { error } = await supabase
          .from('payment_methods')
          .update({ pix_key: pixKey })
          .eq('id', existingMethod.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert({
            restaurant_id: restaurant.id,
            method_type: 'pix',
            is_active: false,
            pix_key: pixKey
          });

        if (error) throw error;
      }

      await fetchPaymentMethods();
      toast({
        title: "Sucesso",
        description: "Chave PIX atualizada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao atualizar chave PIX:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar chave PIX",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div>Carregando formas de pagamento...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Formas de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(methodLabels).map(([type, { label, icon: Icon }]) => {
          const method = paymentMethods.find(m => m.method_type === type);
          const isActive = method?.is_active || false;

          return (
            <div key={type} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <Label>{label}</Label>
              </div>
              <Switch
                checked={isActive}
                onCheckedChange={(checked) => togglePaymentMethod(type as any, checked)}
              />
            </div>
          );
        })}



        <div className="space-y-4 pt-6 border-t bg-muted/30 -mx-6 px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-semibold">PIX Online (automático)</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Cliente paga via QR Code direto no cardápio. Repasse imediato à sua chave (taxa R$1,00/venda).
              </p>
            </div>
            <Switch
              checked={pixOnlineEnabled}
              onCheckedChange={setPixOnlineEnabled}
            />
          </div>

          {pixOnlineEnabled && (
            <div className="space-y-3 pt-2">
              <div>
                <Label htmlFor="pix-key-type">Tipo da chave para receber</Label>
                <select
                  id="pix-key-type"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background"
                  value={restaurantPixKeyType}
                  onChange={(e) => setRestaurantPixKeyType(e.target.value)}
                >
                  <option value="cpf">CPF</option>
                  <option value="cnpj">CNPJ</option>
                  <option value="email">Email</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Aleatória</option>
                </select>
              </div>
              <div>
                <Label htmlFor="restaurant-pix-key">Sua chave PIX para repasse</Label>
                <Input
                  id="restaurant-pix-key"
                  placeholder="Chave PIX onde você quer receber"
                  value={restaurantPixKey}
                  onChange={(e) => setRestaurantPixKey(e.target.value)}
                />
              </div>
            </div>
          )}

          <Button
            onClick={async () => {
              setSavingOnline(true);
              try {
                const existing = paymentMethods.find(m => m.method_type === 'pix');
                const payload = {
                  pix_online_enabled: pixOnlineEnabled,
                  restaurant_pix_key: restaurantPixKey || null,
                  restaurant_pix_key_type: restaurantPixKeyType,
                };
                if (existing) {
                  const { error } = await supabase
                    .from('payment_methods')
                    .update(payload)
                    .eq('id', existing.id);
                  if (error) throw error;
                } else {
                  const { error } = await supabase
                    .from('payment_methods')
                    .insert({
                      restaurant_id: restaurant.id,
                      method_type: 'pix',
                      is_active: pixOnlineEnabled,
                      ...payload,
                    });
                  if (error) throw error;
                }
                await fetchPaymentMethods();
                toast({ title: "Configuração salva", description: "PIX Online atualizado." });
              } catch (e) {
                console.error(e);
                toast({ title: "Erro", description: "Falha ao salvar PIX Online", variant: "destructive" });
              } finally {
                setSavingOnline(false);
              }
            }}
            disabled={savingOnline || (pixOnlineEnabled && !restaurantPixKey)}
          >
            {savingOnline ? "Salvando..." : "Salvar PIX Online"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
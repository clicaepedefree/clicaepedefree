import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard } from "lucide-react";
import { OFFLINE_CHECKOUT_METHODS, type OfflineCheckoutMethod } from "@/lib/payment-labels";

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
  const [savingMethod, setSavingMethod] = useState<OfflineCheckoutMethod | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [pixOnlineEnabled, setPixOnlineEnabled] = useState(false);
  const [restaurantPixKey, setRestaurantPixKey] = useState("");
  const [restaurantPixKeyType, setRestaurantPixKeyType] = useState<string>("aleatoria");
  const [savingOnline, setSavingOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      setLoadFailed(false);
      
      const pixMethod = methods.find(m => m.method_type === 'pix');
      setPixOnlineEnabled(Boolean(pixMethod?.pix_online_enabled));
      setRestaurantPixKey(pixMethod?.restaurant_pix_key ?? "");
      setRestaurantPixKeyType(pixMethod?.restaurant_pix_key_type ?? "aleatoria");
    } catch (error) {
      console.error('Erro ao buscar formas de pagamento:', error);
      setLoadFailed(true);
      toast({
        title: "Erro",
        description: "Erro ao carregar formas de pagamento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePaymentMethod = async (methodType: OfflineCheckoutMethod, isActive: boolean) => {
    if (savingMethod) return;
    setSavingMethod(methodType);
    try {
      const { data, error } = await supabase.from("payment_methods").upsert({
        restaurant_id: restaurant.id,
        method_type: methodType,
        is_active: isActive,
      }, { onConflict: "restaurant_id,method_type" }).select("id,method_type,is_active").single();
      if (error) throw error;
      setPaymentMethods(previous => [...previous.filter(method => method.method_type !== methodType),
        { id: data.id, method_type: methodType, is_active: data.is_active }]);
      toast({ title: isActive ? "Forma de pagamento ativada" : "Forma de pagamento desativada" });
    } catch {
      toast({ title: "Não foi possível atualizar a forma de pagamento", variant: "destructive" });
    } finally {
      setSavingMethod(null);
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
        {loadFailed && (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-destructive">Não foi possível carregar as formas de pagamento.</p>
            <Button variant="outline" onClick={() => void fetchPaymentMethods()}>Tentar novamente</Button>
          </div>
        )}
        <div className="space-y-3">
          <h2 className="font-semibold">Na entrega ou retirada</h2>
          <p className="text-sm text-muted-foreground">Ative as opções que a loja aceita cobrar pessoalmente.</p>
          {OFFLINE_CHECKOUT_METHODS.map(({ type, label }) => (
            <div key={type} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-3">
              <Label htmlFor={`payment-${type}`} className="flex items-center gap-2">
                <CreditCard className="size-4 text-muted-foreground" aria-hidden="true" /> {label}
              </Label>
              <Switch id={`payment-${type}`} checked={paymentMethods.some(method => method.method_type === type && method.is_active)}
                disabled={loadFailed || savingMethod !== null || savingOnline} onCheckedChange={checked => void togglePaymentMethod(type, checked)} />
            </div>
          ))}
        </div>

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
            disabled={loadFailed || savingOnline || savingMethod !== null || (pixOnlineEnabled && !restaurantPixKey)}
          >
            {savingOnline ? "Salvando..." : "Salvar PIX Online"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
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
  method_type: 'cash' | 'card' | 'pix';
  is_active: boolean;
  pix_key?: string;
}

interface PaymentMethodsManagerProps {
  restaurant: any;
}

export function PaymentMethodsManager({ restaurant }: PaymentMethodsManagerProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [pixKey, setPixKey] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const methodLabels = {
    cash: { label: "Dinheiro", icon: DollarSign },
    card: { label: "Cartão", icon: CreditCard },
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
      if (pixMethod?.pix_key) {
        setPixKey(pixMethod.pix_key);
      }
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

        <div className="space-y-4 pt-4 border-t">
          <Label htmlFor="pix-key">Chave PIX</Label>
          <div className="flex space-x-2">
            <Input
              id="pix-key"
              placeholder="Digite sua chave PIX (CPF, CNPJ, email ou telefone)"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
            <Button onClick={updatePixKey} disabled={!pixKey}>
              Salvar
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Esta chave será exibida para os clientes quando escolherem PIX como forma de pagamento.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
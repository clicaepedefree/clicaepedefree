import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Store, AlertTriangle, ExternalLink, TrendingUp, MessageCircle } from "lucide-react";

interface RestaurantControlsProps {
  restaurant: any;
  onRestaurantUpdate: (restaurant: any) => void;
}

export function RestaurantControls({ restaurant, onRestaurantUpdate }: RestaurantControlsProps) {
  const [loading, setLoading] = useState(false);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [isOpen, setIsOpen] = useState(restaurant.is_open ?? true);
  const [isBlocked, setIsBlocked] = useState(restaurant.is_blocked ?? false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchRevenue();
    checkRevenueLimit();
  }, [restaurant.id]);

  const fetchRevenue = async () => {
    try {
      // Get monthly revenue
      const { data: monthlyData, error: monthlyError } = await supabase
        .rpc('get_monthly_revenue', { restaurant_id_param: restaurant.id });

      if (monthlyError) throw monthlyError;
      setMonthlyRevenue(Number(monthlyData || 0));

      // Get total revenue
      const { data: totalData, error: totalError } = await supabase
        .from('orders')
        .select('total')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled');

      if (totalError) throw totalError;
      const total = totalData?.reduce((sum, order) => sum + Number(order.total || 0), 0) || 0;
      setTotalRevenue(total);

    } catch (error: any) {
      console.error('Error fetching revenue:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar faturamento",
        description: error.message,
      });
    }
  };

  const checkRevenueLimit = async () => {
    try {
      // Check and update restaurant status based on revenue
      const { error } = await supabase.rpc('check_revenue_limits');
      if (error) throw error;

      // Refresh restaurant data
      const { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurant.id)
        .single();

      if (fetchError) throw fetchError;
      if (data) {
        setIsBlocked(data.is_blocked);
        setMonthlyRevenue(Number(data.monthly_revenue || 0));
        
        // Show upgrade modal if blocked and revenue >= 1800
        if (data.is_blocked && Number(data.monthly_revenue || 0) >= 1800) {
          setShowUpgradeModal(true);
        }
        
        onRestaurantUpdate(data);
      }
    } catch (error: any) {
      console.error('Error checking revenue limits:', error);
    }
  };

  const toggleStoreStatus = async () => {
    if (isBlocked) {
      toast({
        variant: "destructive",
        title: "Loja bloqueada",
        description: "Sua loja está bloqueada. Entre em contato para liberação.",
      });
      return;
    }

    setLoading(true);
    try {
      const newStatus = !isOpen;
      const { error } = await supabase
        .from('restaurants')
        .update({ is_open: newStatus })
        .eq('id', restaurant.id);

      if (error) throw error;

      setIsOpen(newStatus);
      toast({
        title: newStatus ? "Loja aberta" : "Loja fechada",
        description: newStatus 
          ? "Sua loja está aberta e pode receber pedidos"
          : "Sua loja está fechada. Os clientes podem ver o cardápio mas não fazer pedidos",
      });

      onRestaurantUpdate({ ...restaurant, is_open: newStatus });

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Monthly Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(monthlyRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
            {monthlyRevenue >= 1800 && (
              <Badge variant="destructive" className="mt-2">
                Limite atingido
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Total Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              Desde o início
            </p>
          </CardContent>
        </Card>

        {/* Store Status Control */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status da Loja</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={isOpen && !isBlocked}
                    onCheckedChange={toggleStoreStatus}
                    disabled={loading || isBlocked}
                  />
                  <Label htmlFor="store-status">
                    {isBlocked ? "Bloqueada" : isOpen ? "Aberta" : "Fechada"}
                  </Label>
                </div>
                <Badge 
                  variant={isBlocked ? "destructive" : isOpen ? "default" : "secondary"}
                  className="text-xs"
                >
                  {isBlocked ? "Bloqueada pelo sistema" : isOpen ? "Recebendo pedidos" : "Apenas visualização"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blocked Store Alert */}
      {isBlocked && (
        <Alert className="mb-6 border-red-500">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Sua loja está bloqueada!</strong> Você atingiu o limite de R$ 1.800 em vendas no plano gratuito. 
            Realize o upgrade para continuar vendendo.
            <Button 
              onClick={() => setShowUpgradeModal(true)}
              className="ml-2 h-auto p-1 text-xs"
              variant="outline"
            >
              Ver detalhes
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Upgrade Necessário
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                Você ultrapassou o limite de <strong>R$ 1.800</strong> do plano gratuito.
              </p>
              <p className="text-sm text-muted-foreground">
                Está gostando? Apoie a continuação do projeto:
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-green-50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Plano Premium - R$ 34,90/mês</h3>
              <ul className="text-sm space-y-1">
                <li>✅ Vendas ilimitadas</li>
                <li>✅ Suporte prioritário</li>
                <li>✅ Relatórios avançados</li>
                <li>✅ Sem limites de faturamento</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                asChild
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <a 
                  href="https://www.asaas.com/c/s9mw6vv5r3ik8sdi" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Pagar R$ 34,90 e Continuar Vendendo
                </a>
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setShowUpgradeModal(false)}
                className="w-full"
              >
                Fechar
              </Button>

              <Button 
                asChild
                variant="ghost" 
                className="w-full border border-green-600 text-green-600 hover:bg-green-50"
              >
                <a 
                  href="https://wa.me/5511999999999?text=Preciso%20liberar%20meu%20cardápio" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  Fale com o Suporte
                </a>
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Após o pagamento, entre em contato para liberação imediata.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
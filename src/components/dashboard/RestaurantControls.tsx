import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, 
  Store, 
  AlertTriangle, 
  ExternalLink, 
  TrendingUp, 
  MessageCircle,
  Wallet
} from "lucide-react";

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
      const currentDate = new Date();
      
      const { data: monthlyData, error: monthlyError } = await supabase
        .rpc('get_monthly_revenue', { 
          restaurant_id_param: restaurant.id,
          target_time: currentDate.toISOString()
        });

      if (monthlyError) throw monthlyError;
      setMonthlyRevenue(Number(monthlyData || 0));

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
      const currentDate = new Date();
      
      const { error } = await supabase.rpc('check_revenue_limits', {
        target_time: currentDate.toISOString()
      });
      if (error) throw error;

      const { data, error: fetchError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurant.id)
        .single();

      if (fetchError) throw fetchError;
      if (data) {
        setIsBlocked(data.is_blocked);
        setMonthlyRevenue(Number(data.monthly_revenue || 0));
        
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

  const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <>
      {/* Blocked Store Alert */}
      {isBlocked && (
        <Alert className="mb-4 border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-destructive">Sua loja está bloqueada!</span>
            <span className="text-muted-foreground">
              Você atingiu o limite de R$ 1.800 em vendas no plano gratuito.
            </span>
            <Button 
              onClick={() => setShowUpgradeModal(true)}
              size="sm"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              Ver detalhes
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Monthly Revenue */}
        <Card className="group relative overflow-hidden border-border/50 bg-card hover:shadow-md transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Faturamento do Mês</p>
                <p className="text-2xl font-bold text-whatsapp tracking-tight">
                  {formatCurrency(monthlyRevenue)}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{currentMonth}</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-whatsapp/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <TrendingUp className="h-5 w-5 text-whatsapp" />
              </div>
            </div>
            {monthlyRevenue >= 1800 && (
              <Badge variant="destructive" className="mt-3 text-xs">
                Limite atingido
              </Badge>
            )}
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-whatsapp/50 to-whatsapp opacity-0 group-hover:opacity-100 transition-opacity" />
        </Card>

        {/* Total Revenue */}
        <Card className="group relative overflow-hidden border-border/50 bg-card hover:shadow-md transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Faturamento Total</p>
                <p className="text-2xl font-bold text-primary tracking-tight">
                  {formatCurrency(totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground">Desde o início</p>
              </div>
              <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
          <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary/50 to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </Card>

        {/* Store Status Control */}
        <Card className="group relative overflow-hidden border-border/50 bg-card hover:shadow-md transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Status da Loja</p>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={isOpen && !isBlocked}
                    onCheckedChange={toggleStoreStatus}
                    disabled={loading || isBlocked}
                    className="data-[state=checked]:bg-whatsapp"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {isBlocked ? "Bloqueada" : isOpen ? "Aberta" : "Fechada"}
                  </span>
                </div>
                <Badge 
                  variant={isBlocked ? "destructive" : isOpen ? "default" : "secondary"}
                  className={`text-xs ${isOpen && !isBlocked ? "bg-whatsapp hover:bg-whatsapp/90" : ""}`}
                >
                  {isBlocked ? "Bloqueada pelo sistema" : isOpen ? "Recebendo pedidos" : "Apenas visualização"}
                </Badge>
              </div>
              <div className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 ${
                isBlocked 
                  ? "bg-destructive/10" 
                  : isOpen 
                    ? "bg-whatsapp/10" 
                    : "bg-muted"
              }`}>
                <Store className={`h-5 w-5 ${
                  isBlocked 
                    ? "text-destructive" 
                    : isOpen 
                      ? "text-whatsapp" 
                      : "text-muted-foreground"
                }`} />
              </div>
            </div>
          </CardContent>
          <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity ${
            isBlocked 
              ? "from-destructive/50 to-destructive" 
              : isOpen 
                ? "from-whatsapp/50 to-whatsapp" 
                : "from-muted-foreground/30 to-muted-foreground/50"
          }`} />
        </Card>
      </div>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Upgrade Necessário
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                Você ultrapassou o limite de <strong>R$ 1.800</strong> do plano gratuito.
              </p>
              <p className="text-sm text-muted-foreground">
                Está gostando? Apoie a continuação do projeto:
              </p>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-whatsapp/5 p-5 rounded-xl border border-border/50">
              <h3 className="font-semibold mb-3 text-foreground">Plano Atual - Grátis até 100 pedidos/mês</h3>
              <ul className="text-sm space-y-2 text-muted-foreground">
                {[
                  "Grátis até 100 pedidos mensais",
                  "Suporte prioritário",
                  "Relatórios avançados",
                  "Sem limites de faturamento"
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-whatsapp">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                asChild
                className="w-full bg-whatsapp hover:bg-whatsapp/90 h-12 rounded-xl"
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
                className="w-full h-11 rounded-xl"
              >
                Fechar
              </Button>

              <Button 
                asChild
                variant="ghost" 
                className="w-full border border-whatsapp/30 text-whatsapp hover:bg-whatsapp/5 h-11 rounded-xl"
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

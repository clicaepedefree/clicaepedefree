import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Phone, Mail, Calendar, LogOut, Shield, DollarSign, Lock, Unlock, TrendingUp, CloudUpload } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useToast } from "@/hooks/use-toast";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

interface RestaurantWithEmail {
  id: string;
  name: string;
  responsible_name?: string;
  whatsapp: string;
  user_email: string;
  slug: string;
  created_at: string;
  logo_url?: string;
  banner_url?: string;
  total_revenue: number;
  monthly_revenue: number;
  is_open: boolean;
  is_blocked: boolean;
  revenue_block_exempt_until?: string;
  tax_id?: string;
}

const SuperAdmin = () => {
  const [restaurants, setRestaurants] = useState<RestaurantWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingAgendor, setSyncingAgendor] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, session, loading: authLoading, logout } = useSuperAdmin();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/super-admin/auth');
    }
  }, [authLoading, isAuthenticated, navigate]);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      // Executar verificação de limites com data específica (01/09/2025 22:24 Brasília)
      const specificDate = new Date('2025-09-01T22:24:00-03:00');
      await supabase.rpc('check_revenue_limits', { 
        target_time: specificDate.toISOString() 
      });
      
      // Update monthly revenues first with specific date
      await supabase.rpc('update_monthly_revenues', {
        target_time: specificDate.toISOString()
      });
      
      // Use the existing function to get restaurants with emails (now includes all fields)
      const { data: restaurantData, error } = await supabase.rpc('get_restaurants_with_emails');
      
      if (error) throw error;

      // Format restaurants data with fallback for email
      const restaurantsFormatted = (restaurantData || []).map(restaurant => ({
        ...restaurant,
        user_email: restaurant.user_email || 'Email não encontrado'
      }));

      setRestaurants(restaurantsFormatted);
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatWhatsApp = (whatsapp: string) => {
    // Format phone number for better display
    const cleaned = whatsapp.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    return whatsapp;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getTotalRevenue = () => {
    // Faturamento total desde o lançamento da plataforma
    return restaurants.reduce((sum, restaurant) => sum + Number(restaurant.total_revenue || 0), 0);
  };

  const getMonthlyRevenue = () => {
    // Faturamento apenas do mês atual
    return restaurants.reduce((sum, restaurant) => sum + Number(restaurant.monthly_revenue || 0), 0);
  };

  const toggleRestaurantBlock = async (restaurantId: string, isCurrentlyBlocked: boolean) => {
    try {
      // Usar data específica: 01/09/2025 22:24 Brasília
      const specificDate = new Date('2025-09-01T22:24:00-03:00');
      
      let exemptUntil = null;
      if (isCurrentlyBlocked) {
        // Se está liberando, definir isenção até fim do mês
        const endOfMonth = new Date(specificDate.getFullYear(), specificDate.getMonth() + 1, 0, 23, 59, 59);
        exemptUntil = endOfMonth.toISOString();
      }

      const { data, error } = await supabase.rpc('admin_set_restaurant_block', {
        restaurant_id: restaurantId,
        set_blocked: !isCurrentlyBlocked,
        exempt_until: exemptUntil
      });

      if (error) throw error;

      toast({
        title: !isCurrentlyBlocked ? "Restaurante bloqueado" : "Restaurante liberado",
        description: !isCurrentlyBlocked 
          ? "O restaurante não pode mais receber pedidos"
          : "O restaurante pode receber pedidos até o fim do mês",
      });

      fetchRestaurants();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const markRestaurantAsPaid = async (restaurantId: string) => {
    try {
      // Usar data específica: 01/09/2025 22:24 Brasília
      const specificDate = new Date('2025-09-01T22:24:00-03:00');

      const { data, error } = await supabase.rpc('admin_mark_restaurant_paid', {
        restaurant_id: restaurantId,
        for_time: specificDate.toISOString()
      });

      if (error) throw error;

      toast({
        title: "Pagamento confirmado",
        description: "Limite de faturamento liberado até o fim do mês.",
      });

      fetchRestaurants();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message,
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/super-admin/auth');
  };

  const handleSyncAgendor = async () => {
    setSyncingAgendor(true);
    try {
      console.log('Starting Agendor sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-all-agendor-deals');
      
      if (error) {
        console.error('Error syncing with Agendor:', error);
        throw error;
      }

      console.log('Agendor sync result:', data);

      toast({
        title: "Sincronização concluída!",
        description: `${data.synced} negócios criados no Agendor${data.failed > 0 ? ` (${data.failed} falharam)` : ''}`,
      });
    } catch (error: any) {
      console.error('Error:', error);
      toast({
        title: "Erro na sincronização",
        description: error.message || "Erro ao sincronizar com Agendor",
        variant: "destructive",
      });
    } finally {
      setSyncingAgendor(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Carregando...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Super Admin - Painel de Controle</h1>
            <p className="text-muted-foreground">
              Visão geral de todas as empresas cadastradas na plataforma
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Logado como: {session?.email}</span>
            </div>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSyncAgendor}
              disabled={syncingAgendor}
              className="flex items-center gap-2"
            >
              <CloudUpload className="h-4 w-4" />
              {syncingAgendor ? "Sincronizando..." : "Sincronizar Agendor"}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{restaurants.length}</div>
              <p className="text-xs text-muted-foreground">
                Restaurantes cadastrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(getTotalRevenue())}
              </div>
              <p className="text-xs text-muted-foreground">
                Receita total da plataforma
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Novos Este Mês</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {restaurants.filter(r => {
                  const created = new Date(r.created_at);
                  const now = new Date();
                  return created.getMonth() === now.getMonth() && 
                         created.getFullYear() === now.getFullYear();
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Cadastros recentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturamento Mensal</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(getMonthlyRevenue())}
              </div>
              <p className="text-xs text-muted-foreground">
                Receita deste mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Com Logo</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {restaurants.filter(r => r.logo_url).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Têm logo configurada
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Restaurants Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Empresas Cadastradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome do Estabelecimento</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Fat. Mensal</TableHead>
                    <TableHead>Fat. Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restaurants.map((restaurant) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {restaurant.logo_url && (
                            <img 
                              src={restaurant.logo_url} 
                              alt="Logo" 
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          {restaurant.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        {restaurant.responsible_name || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          {restaurant.user_email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          {formatWhatsApp(restaurant.whatsapp)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {restaurant.tax_id || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className={`font-semibold ${Number(restaurant.monthly_revenue || 0) >= 1800 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(Number(restaurant.monthly_revenue || 0))}
                          </span>
                          {Number(restaurant.monthly_revenue || 0) >= 1800 && (
                            <Badge variant="destructive" className="text-xs">LIMITE</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(Number(restaurant.total_revenue || 0))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={restaurant.is_blocked ? "destructive" : restaurant.is_open ? "default" : "secondary"}>
                            {restaurant.is_blocked ? "Bloqueada" : restaurant.is_open ? "Aberta" : "Fechada"}
                          </Badge>
                          {restaurant.logo_url && (
                            <Badge variant="outline" className="text-xs">Logo OK</Badge>
                          )}
                          {restaurant.revenue_block_exempt_until && new Date(restaurant.revenue_block_exempt_until) > new Date() && (
                            <Badge variant="secondary" className="text-xs">
                              Pago até {new Date(restaurant.revenue_block_exempt_until).toLocaleDateString('pt-BR')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant={restaurant.is_blocked ? "default" : "destructive"}
                            onClick={() => toggleRestaurantBlock(restaurant.id, restaurant.is_blocked)}
                            className="flex items-center gap-1 text-xs"
                          >
                            {restaurant.is_blocked ? (
                              <>
                                <Unlock className="h-3 w-3" />
                                Liberar
                              </>
                            ) : (
                              <>
                                <Lock className="h-3 w-3" />
                                Bloquear
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => markRestaurantAsPaid(restaurant.id)}
                            disabled={!!(restaurant.revenue_block_exempt_until && new Date(restaurant.revenue_block_exempt_until) > new Date())}
                            className="flex items-center gap-1 text-xs"
                          >
                            <DollarSign className="h-3 w-3" />
                            Pago
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {restaurants.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma empresa cadastrada ainda
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
};

export default SuperAdmin;
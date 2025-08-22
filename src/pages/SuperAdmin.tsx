import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Phone, Mail, Calendar, LogOut, Shield, DollarSign, Lock, Unlock, TrendingUp } from "lucide-react";
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
  tax_id?: string;
}

const SuperAdmin = () => {
  const [restaurants, setRestaurants] = useState<RestaurantWithEmail[]>([]);
  const [loading, setLoading] = useState(true);
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
      // Update monthly revenues first
      await supabase.rpc('update_monthly_revenues');
      
      // Then fetch restaurants with updated data - ordenados por data de cadastro (mais novos primeiro)
      const { data: restaurantData, error } = await supabase
        .from('restaurants')
        .select(`
          id, name, responsible_name, whatsapp, slug, created_at, 
          logo_url, banner_url, tax_id, is_open, is_blocked, monthly_revenue,
          user_id
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get user emails separately
      const restaurantsWithEmails = await Promise.all(
        (restaurantData || []).map(async (restaurant) => {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(restaurant.user_id);
          
          // Calculate total revenue desde o lançamento da plataforma
          const { data: ordersData } = await supabase
            .from('orders')
            .select('total')
            .eq('restaurant_id', restaurant.id)
            .neq('status', 'cancelled');
          
          const totalRevenue = ordersData?.reduce((sum, order) => sum + Number(order.total || 0), 0) || 0;

          return {
            ...restaurant,
            user_email: userData?.user?.email || 'Email não encontrado',
            total_revenue: totalRevenue
          };
        })
      );

      setRestaurants(restaurantsWithEmails);
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
      const { error } = await supabase
        .from('restaurants')
        .update({ is_blocked: !isCurrentlyBlocked })
        .eq('id', restaurantId);

      if (error) throw error;

      toast({
        title: !isCurrentlyBlocked ? "Restaurante bloqueado" : "Restaurante liberado",
        description: !isCurrentlyBlocked 
          ? "O restaurante não pode mais receber pedidos"
          : "O restaurante pode receber pedidos novamente",
      });

      // Refresh the list
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
                        </div>
                      </TableCell>
                      <TableCell>
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
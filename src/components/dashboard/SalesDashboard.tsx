import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, ShoppingCart, Calendar, ArrowUp, ArrowDown } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SalesDashboardProps {
  restaurant: any;
}

interface SalesStats {
  todayRevenue: number;
  todayOrders: number;
  weekRevenue: number;
  weekOrders: number;
  monthRevenue: number;
  monthOrders: number;
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  previousWeekRevenue: number;
  previousMonthRevenue: number;
}

export function SalesDashboard({ restaurant }: SalesDashboardProps) {
  const [stats, setStats] = useState<SalesStats>({
    todayRevenue: 0,
    todayOrders: 0,
    weekRevenue: 0,
    weekOrders: 0,
    monthRevenue: 0,
    monthOrders: 0,
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    previousWeekRevenue: 0,
    previousMonthRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, [restaurant.id]);

  const fetchSalesData = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at, status')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled');

      if (error) throw error;

      const orders = data || [];
      calculateStats(orders);
    } catch (error: any) {
      console.error('Erro ao buscar dados de vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (orders: any[]) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    // Previous periods for comparison
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
    const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    // Today
    const todayOrders = orders.filter(order => 
      new Date(order.created_at) >= todayStart
    );
    const todayRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);

    // This week
    const weekOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= weekStart && orderDate <= weekEnd;
    });
    const weekRevenue = weekOrders.reduce((sum, order) => sum + Number(order.total), 0);

    // This month
    const monthOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= monthStart && orderDate <= monthEnd;
    });
    const monthRevenue = monthOrders.reduce((sum, order) => sum + Number(order.total), 0);

    // Previous week
    const previousWeekOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= previousWeekStart && orderDate <= previousWeekEnd;
    });
    const previousWeekRevenue = previousWeekOrders.reduce((sum, order) => sum + Number(order.total), 0);

    // Previous month
    const previousMonthOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= previousMonthStart && orderDate <= previousMonthEnd;
    });
    const previousMonthRev = previousMonthOrders.reduce((sum, order) => sum + Number(order.total), 0);

    // Total
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setStats({
      todayRevenue,
      todayOrders: todayOrders.length,
      weekRevenue,
      weekOrders: weekOrders.length,
      monthRevenue,
      monthOrders: monthOrders.length,
      totalRevenue,
      totalOrders,
      averageOrderValue,
      previousWeekRevenue,
      previousMonthRevenue: previousMonthRev
    });
  };

  const calculatePercentageChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const renderChangeIndicator = (current: number, previous: number) => {
    const change = calculatePercentageChange(current, previous);
    const isPositive = change >= 0;
    
    if (change === 0) return null;
    
    return (
      <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        <span>{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados de vendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Dashboard de Vendas</h2>
        <p className="text-muted-foreground">
          Acompanhe o desempenho do seu restaurante
        </p>
      </div>

      {/* Status do Restaurante */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Status do Restaurante</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${restaurant.is_open ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium">
                {restaurant.is_open ? 'Aberto' : 'Fechado'}
              </span>
            </div>
            
            {restaurant.is_blocked && (
              <Badge variant="destructive">
                Bloqueado por limite de faturamento
              </Badge>
            )}
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <div>Faturamento mensal: {formatCurrency(restaurant.monthly_revenue || 0)}</div>
            <div>Limite: R$ 1.800,00</div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Hoje */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.todayOrders} pedido{stats.todayOrders !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* Esta Semana */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.weekRevenue)}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {stats.weekOrders} pedido{stats.weekOrders !== 1 ? 's' : ''}
              </p>
              {renderChangeIndicator(stats.weekRevenue, stats.previousWeekRevenue)}
            </div>
          </CardContent>
        </Card>

        {/* Este Mês */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthRevenue)}</div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {stats.monthOrders} pedido{stats.monthOrders !== 1 ? 's' : ''}
              </p>
              {renderChangeIndicator(stats.monthRevenue, stats.previousMonthRevenue)}
            </div>
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              Por pedido
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Total Geral */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo Total</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-sm text-muted-foreground">Faturamento Total</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {stats.totalOrders}
              </div>
              <p className="text-sm text-muted-foreground">Total de Pedidos</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(stats.averageOrderValue)}
              </div>
              <p className="text-sm text-muted-foreground">Ticket Médio Geral</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
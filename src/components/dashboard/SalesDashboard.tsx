import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DollarSign, 
  TrendingUp, 
  ShoppingCart, 
  Calendar, 
  ArrowUp, 
  ArrowDown,
  BarChart3,
  Wallet
} from "lucide-react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, subWeeks } from "date-fns";

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
    todayRevenue: 0, todayOrders: 0,
    weekRevenue: 0, weekOrders: 0,
    monthRevenue: 0, monthOrders: 0,
    totalRevenue: 0, totalOrders: 0,
    averageOrderValue: 0,
    previousWeekRevenue: 0, previousMonthRevenue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, [restaurant.id]);

  const fetchSalesData = async () => {
    try {
      const now = new Date();
      // Only fetch orders from the last 60 days + previous month for comparisons
      const previousMonthStart = startOfMonth(subMonths(now, 1));
      
      const { data, error } = await supabase
        .from('orders')
        .select('total, created_at, status')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled')
        .gte('created_at', previousMonthStart.toISOString());

      if (error) throw error;

      const recentOrders = data || [];

      // For total stats, use a separate lightweight count query
      const { count: totalCount, error: countError } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled');

      // Get total revenue via a simple query with no date filter but only total column
      const { data: allTotals, error: totalError } = await supabase
        .from('orders')
        .select('total')
        .eq('restaurant_id', restaurant.id)
        .neq('status', 'cancelled');

      const allOrderTotals = allTotals || [];
      const totalRevenue = allOrderTotals.reduce((sum, o) => sum + Number(o.total), 0);
      const totalOrders = totalCount || allOrderTotals.length;

      calculateStats(recentOrders, totalRevenue, totalOrders);
    } catch (error: any) {
      console.error('Erro ao buscar dados de vendas:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (orders: any[], totalRevenue: number, totalOrders: number) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    
    const previousWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
    const previousWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 0 });
    const previousMonthStart = startOfMonth(subMonths(now, 1));
    const previousMonthEnd = endOfMonth(subMonths(now, 1));

    const todayOrders = orders.filter(o => new Date(o.created_at) >= todayStart);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const weekOrders = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= weekStart && d <= weekEnd;
    });
    const weekRevenue = weekOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const monthOrders = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= monthStart && d <= monthEnd;
    });
    const monthRevenue = monthOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const previousWeekOrders = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= previousWeekStart && d <= previousWeekEnd;
    });
    const previousWeekRevenue = previousWeekOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const previousMonthOrders = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= previousMonthStart && d <= previousMonthEnd;
    });
    const previousMonthRev = previousMonthOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setStats({
      todayRevenue, todayOrders: todayOrders.length,
      weekRevenue, weekOrders: weekOrders.length,
      monthRevenue, monthOrders: monthOrders.length,
      totalRevenue, totalOrders,
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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const renderChangeIndicator = (current: number, previous: number) => {
    const change = calculatePercentageChange(current, previous);
    const isPositive = change >= 0;
    if (change === 0) return null;
    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-whatsapp' : 'text-destructive'}`}>
        {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        <span>{Math.abs(change).toFixed(0)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Carregando vendas...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Hoje", value: stats.todayRevenue, subtitle: `${stats.todayOrders} pedido${stats.todayOrders !== 1 ? 's' : ''}`, icon: DollarSign, color: "primary" },
    { title: "Esta Semana", value: stats.weekRevenue, subtitle: `${stats.weekOrders} pedido${stats.weekOrders !== 1 ? 's' : ''}`, icon: Calendar, color: "secondary", comparison: { current: stats.weekRevenue, previous: stats.previousWeekRevenue } },
    { title: "Este Mês", value: stats.monthRevenue, subtitle: `${stats.monthOrders} pedido${stats.monthOrders !== 1 ? 's' : ''}`, icon: TrendingUp, color: "whatsapp", comparison: { current: stats.monthRevenue, previous: stats.previousMonthRevenue } },
    { title: "Ticket Médio", value: stats.averageOrderValue, subtitle: "Por pedido", icon: ShoppingCart, color: "accent" }
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; gradient: string }> = {
      primary: { bg: "bg-primary/10", text: "text-primary", gradient: "from-primary/50 to-primary" },
      secondary: { bg: "bg-secondary/10", text: "text-secondary", gradient: "from-secondary/50 to-secondary" },
      whatsapp: { bg: "bg-whatsapp/10", text: "text-whatsapp", gradient: "from-whatsapp/50 to-whatsapp" },
      accent: { bg: "bg-accent/10", text: "text-accent-foreground", gradient: "from-accent/50 to-accent" }
    };
    return colors[color] || colors.primary;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Dashboard de Vendas</h2>
            <p className="text-sm text-muted-foreground">Acompanhe o desempenho do seu restaurante</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const colors = getColorClasses(stat.color);
          return (
            <Card key={stat.title} className="group relative overflow-hidden border-border/50 bg-card hover:shadow-md transition-all duration-300">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className={`h-9 w-9 rounded-lg ${colors.bg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-4 w-4 ${colors.text}`} />
                  </div>
                  {stat.comparison && renderChangeIndicator(stat.comparison.current, stat.comparison.previous)}
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                  <p className={`text-xl sm:text-2xl font-bold ${colors.text} tracking-tight`}>{formatCurrency(stat.value)}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </CardContent>
              <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </Card>
          );
        })}
      </div>

      <Card className="border-border/50 bg-card overflow-hidden">
        <CardContent className="p-0">
          <div className="p-5 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
            <h3 className="text-lg font-semibold text-foreground">Resumo Total</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/50">
            <div className="p-5 text-center group hover:bg-muted/30 transition-colors">
              <div className="inline-flex h-12 w-12 rounded-xl bg-whatsapp/10 items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Wallet className="h-6 w-6 text-whatsapp" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-whatsapp tracking-tight">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-sm text-muted-foreground mt-1">Faturamento Total</p>
            </div>
            <div className="p-5 text-center group hover:bg-muted/30 transition-colors">
              <div className="inline-flex h-12 w-12 rounded-xl bg-primary/10 items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">{stats.totalOrders}</p>
              <p className="text-sm text-muted-foreground mt-1">Total de Pedidos</p>
            </div>
            <div className="p-5 text-center group hover:bg-muted/30 transition-colors">
              <div className="inline-flex h-12 w-12 rounded-xl bg-secondary/10 items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-secondary tracking-tight">{formatCurrency(stats.averageOrderValue)}</p>
              <p className="text-sm text-muted-foreground mt-1">Ticket Médio Geral</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

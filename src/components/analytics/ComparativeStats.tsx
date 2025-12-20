import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  DollarSign, 
  ShoppingCart, 
  Receipt,
  Calendar
} from "lucide-react";
import { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  subWeeks, 
  subMonths,
  format
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComparativeStatsProps {
  restaurantId: string;
}

interface PeriodStats {
  revenue: number;
  orders: number;
  averageTicket: number;
}

interface Comparison {
  current: PeriodStats;
  previous: PeriodStats;
  percentChange: {
    revenue: number;
    orders: number;
    averageTicket: number;
  };
}

export function ComparativeStats({ restaurantId }: ComparativeStatsProps) {
  const [weeklyComparison, setWeeklyComparison] = useState<Comparison | null>(null);
  const [monthlyComparison, setMonthlyComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComparisons = async () => {
      setLoading(true);
      try {
        const now = new Date();

        // Weekly comparison
        const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
        const currentWeekEnd = endOfWeek(now, { weekStartsOn: 0 });
        const previousWeekStart = subWeeks(currentWeekStart, 1);
        const previousWeekEnd = subWeeks(currentWeekEnd, 1);

        // Monthly comparison
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const previousMonthStart = startOfMonth(subMonths(now, 1));
        const previousMonthEnd = endOfMonth(subMonths(now, 1));

        // Fetch all orders
        const { data: orders, error } = await supabase
          .from("orders")
          .select("created_at, total")
          .eq("restaurant_id", restaurantId)
          .neq("status", "cancelled")
          .gte("created_at", previousMonthStart.toISOString());

        if (error) throw error;

        const calculateStats = (ordersData: typeof orders, start: Date, end: Date): PeriodStats => {
          const filtered = ordersData?.filter((o) => {
            const date = new Date(o.created_at);
            return date >= start && date <= end;
          }) || [];

          const revenue = filtered.reduce((sum, o) => sum + o.total, 0);
          const ordersCount = filtered.length;
          const averageTicket = ordersCount > 0 ? revenue / ordersCount : 0;

          return { revenue, orders: ordersCount, averageTicket };
        };

        const calculatePercentChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        // Weekly stats
        const currentWeekStats = calculateStats(orders, currentWeekStart, currentWeekEnd);
        const previousWeekStats = calculateStats(orders, previousWeekStart, previousWeekEnd);

        setWeeklyComparison({
          current: currentWeekStats,
          previous: previousWeekStats,
          percentChange: {
            revenue: calculatePercentChange(currentWeekStats.revenue, previousWeekStats.revenue),
            orders: calculatePercentChange(currentWeekStats.orders, previousWeekStats.orders),
            averageTicket: calculatePercentChange(currentWeekStats.averageTicket, previousWeekStats.averageTicket),
          },
        });

        // Monthly stats
        const currentMonthStats = calculateStats(orders, currentMonthStart, currentMonthEnd);
        const previousMonthStats = calculateStats(orders, previousMonthStart, previousMonthEnd);

        setMonthlyComparison({
          current: currentMonthStats,
          previous: previousMonthStats,
          percentChange: {
            revenue: calculatePercentChange(currentMonthStats.revenue, previousMonthStats.revenue),
            orders: calculatePercentChange(currentMonthStats.orders, previousMonthStats.orders),
            averageTicket: calculatePercentChange(currentMonthStats.averageTicket, previousMonthStats.averageTicket),
          },
        });
      } catch (error) {
        console.error("Error fetching comparisons:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchComparisons();
  }, [restaurantId]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />;
    if (value < 0) return <TrendingDown className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600 bg-green-100";
    if (value < 0) return "text-red-500 bg-red-100";
    return "text-muted-foreground bg-muted";
  };

  const ComparisonCard = ({ 
    title, 
    comparison, 
    periodLabel 
  }: { 
    title: string; 
    comparison: Comparison | null;
    periodLabel: string;
  }) => {
    if (!comparison) return null;

    const metrics = [
      { 
        label: "Faturamento", 
        icon: DollarSign,
        current: formatCurrency(comparison.current.revenue),
        previous: formatCurrency(comparison.previous.revenue),
        change: comparison.percentChange.revenue,
      },
      { 
        label: "Pedidos", 
        icon: ShoppingCart,
        current: comparison.current.orders.toString(),
        previous: comparison.previous.orders.toString(),
        change: comparison.percentChange.orders,
      },
      { 
        label: "Ticket Médio", 
        icon: Receipt,
        current: formatCurrency(comparison.current.averageTicket),
        previous: formatCurrency(comparison.previous.averageTicket),
        change: comparison.percentChange.averageTicket,
      },
    ];

    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{periodLabel}</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric) => (
              <div 
                key={metric.label}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <metric.icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">{metric.label}</div>
                    <div className="font-semibold">{metric.current}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm font-medium ${getTrendColor(metric.change)}`}>
                    {getTrendIcon(metric.change)}
                    {metric.change >= 0 ? "+" : ""}{metric.change.toFixed(1)}%
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Anterior: {metric.previous}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const weekLabel = `${format(startOfWeek(now, { weekStartsOn: 0 }), "dd/MM", { locale: ptBR })} - ${format(endOfWeek(now, { weekStartsOn: 0 }), "dd/MM", { locale: ptBR })} vs semana anterior`;
  const monthLabel = `${format(now, "MMMM", { locale: ptBR })} vs ${format(subMonths(now, 1), "MMMM", { locale: ptBR })}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ComparisonCard 
        title="Comparativo Semanal" 
        comparison={weeklyComparison}
        periodLabel={weekLabel}
      />
      <ComparisonCard 
        title="Comparativo Mensal" 
        comparison={monthlyComparison}
        periodLabel={monthLabel}
      />
    </div>
  );
}

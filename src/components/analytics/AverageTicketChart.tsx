import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { format, eachDayOfInterval, parseISO, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Receipt, TrendingUp, TrendingDown } from "lucide-react";

interface AverageTicketChartProps {
  restaurantId: string;
  dateRange: DateRange | undefined;
}

interface DailyTicket {
  date: string;
  displayDate: string;
  averageTicket: number;
  ordersCount: number;
  totalRevenue: number;
}

export function AverageTicketChart({ restaurantId, dateRange }: AverageTicketChartProps) {
  const [data, setData] = useState<DailyTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    overallAverage: 0,
    trend: 0,
    highestDay: "",
    lowestDay: "",
  });

  useEffect(() => {
    const fetchAverageTicket = async () => {
      if (!dateRange?.from || !dateRange?.to) return;

      setLoading(true);
      try {
        const { data: orders, error } = await supabase
          .from("orders")
          .select("created_at, total")
          .eq("restaurant_id", restaurantId)
          .neq("status", "cancelled")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString())
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Generate all days in range
        const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        
        // Group orders by day
        const dailyMap = new Map<string, { total: number; count: number }>();
        
        allDays.forEach((day) => {
          const dateKey = format(day, "yyyy-MM-dd");
          dailyMap.set(dateKey, { total: 0, count: 0 });
        });

        orders?.forEach((order) => {
          const dateKey = format(parseISO(order.created_at), "yyyy-MM-dd");
          const existing = dailyMap.get(dateKey) || { total: 0, count: 0 };
          dailyMap.set(dateKey, {
            total: existing.total + order.total,
            count: existing.count + 1,
          });
        });

        // Convert to array
        const dailyData: DailyTicket[] = Array.from(dailyMap.entries())
          .map(([date, stats]) => ({
            date,
            displayDate: format(parseISO(date), "dd/MM", { locale: ptBR }),
            averageTicket: stats.count > 0 ? stats.total / stats.count : 0,
            ordersCount: stats.count,
            totalRevenue: stats.total,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Calculate stats
        const totalRevenue = dailyData.reduce((sum, d) => sum + d.totalRevenue, 0);
        const totalOrders = dailyData.reduce((sum, d) => sum + d.ordersCount, 0);
        const overallAverage = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Calculate trend (compare first half vs second half)
        const midPoint = Math.floor(dailyData.length / 2);
        const firstHalf = dailyData.slice(0, midPoint);
        const secondHalf = dailyData.slice(midPoint);

        const firstHalfAvg = firstHalf.reduce((sum, d) => sum + d.averageTicket, 0) / (firstHalf.length || 1);
        const secondHalfAvg = secondHalf.reduce((sum, d) => sum + d.averageTicket, 0) / (secondHalf.length || 1);
        const trend = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;

        // Find highest and lowest days with orders
        const daysWithOrders = dailyData.filter(d => d.ordersCount > 0);
        const highest = daysWithOrders.reduce((max, d) => d.averageTicket > max.averageTicket ? d : max, daysWithOrders[0]);
        const lowest = daysWithOrders.reduce((min, d) => d.averageTicket < min.averageTicket ? d : min, daysWithOrders[0]);

        setData(dailyData);
        setStats({
          overallAverage,
          trend,
          highestDay: highest?.displayDate || "-",
          lowestDay: lowest?.displayDate || "-",
        });
      } catch (error) {
        console.error("Error fetching average ticket:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAverageTicket();
  }, [restaurantId, dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Ticket Médio por Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasData = data.some(d => d.ordersCount > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Ticket Médio por Período
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Ticket Médio</div>
                <div className="text-2xl font-bold text-primary">
                  {formatCurrency(stats.overallAverage)}
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Tendência</div>
                <div className={`text-2xl font-bold flex items-center gap-1 ${
                  stats.trend >= 0 ? "text-green-600" : "text-red-500"
                }`}>
                  {stats.trend >= 0 ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                  {stats.trend >= 0 ? "+" : ""}{stats.trend.toFixed(1)}%
                </div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Melhor Dia</div>
                <div className="text-lg font-semibold">{stats.highestDay}</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground">Menor Ticket</div>
                <div className="text-lg font-semibold">{stats.lowestDay}</div>
              </div>
            </div>

            {/* Chart */}
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ticketGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(208, 55%, 35%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(208, 55%, 35%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="displayDate" 
                    tick={{ fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tickFormatter={(v) => `R$${v}`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => {
                      if (name === "averageTicket") return [formatCurrency(value), "Ticket Médio"];
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="averageTicket"
                    stroke="hsl(208, 55%, 35%)"
                    strokeWidth={2}
                    fill="url(#ticketGradient)"
                    dot={{ fill: "hsl(208, 55%, 35%)", strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

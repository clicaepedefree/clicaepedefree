import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, TrendingUp } from "lucide-react";

interface TopProductsChartProps {
  restaurantId: string;
  dateRange: DateRange | undefined;
}

interface ProductSales {
  name: string;
  quantity: number;
  revenue: number;
}

const COLORS = [
  "hsl(208, 55%, 35%)",
  "hsl(204, 71%, 63%)",
  "hsl(208, 55%, 45%)",
  "hsl(204, 71%, 73%)",
  "hsl(208, 55%, 55%)",
];

export function TopProductsChart({ restaurantId, dateRange }: TopProductsChartProps) {
  const [data, setData] = useState<ProductSales[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<"quantity" | "revenue">("quantity");

  useEffect(() => {
    const fetchTopProducts = async () => {
      if (!dateRange?.from || !dateRange?.to) return;

      setLoading(true);
      try {
        const { data: orders, error } = await supabase
          .from("orders")
          .select("items, total")
          .eq("restaurant_id", restaurantId)
          .neq("status", "cancelled")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());

        if (error) throw error;

        // Aggregate products from orders
        const productMap = new Map<string, { quantity: number; revenue: number }>();

        orders?.forEach((order) => {
          const items = order.items as Array<{
            name: string;
            quantity: number;
            unitPrice: number;
          }>;
          
          items?.forEach((item) => {
            const existing = productMap.get(item.name) || { quantity: 0, revenue: 0 };
            productMap.set(item.name, {
              quantity: existing.quantity + (item.quantity || 1),
              revenue: existing.revenue + ((item.unitPrice || 0) * (item.quantity || 1)),
            });
          });
        });

        // Convert to array and sort
        const productsArray = Array.from(productMap.entries())
          .map(([name, stats]) => ({
            name: name.length > 20 ? name.substring(0, 20) + "..." : name,
            quantity: stats.quantity,
            revenue: stats.revenue,
          }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 10);

        setData(productsArray);
      } catch (error) {
        console.error("Error fetching top products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, [restaurantId, dateRange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const sortedData = [...data].sort((a, b) => 
    viewType === "quantity" ? b.quantity - a.quantity : b.revenue - a.revenue
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produtos Mais Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produtos Mais Vendidos
          </CardTitle>
          <Tabs value={viewType} onValueChange={(v) => setViewType(v as "quantity" | "revenue")}>
            <TabsList>
              <TabsTrigger value="quantity">Quantidade</TabsTrigger>
              <TabsTrigger value="revenue">Faturamento</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart */}
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedData.slice(0, 5)} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis 
                    type="number" 
                    tickFormatter={viewType === "revenue" ? (v) => formatCurrency(v) : undefined}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={100}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => 
                      viewType === "revenue" ? formatCurrency(value) : `${value} unidades`
                    }
                    labelStyle={{ color: "hsl(20 14% 15%)" }}
                  />
                  <Bar 
                    dataKey={viewType} 
                    radius={[0, 4, 4, 0]}
                  >
                    {sortedData.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Ranking List */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-muted-foreground mb-4">Ranking Completo</h4>
              {sortedData.map((product, index) => (
                <div 
                  key={product.name}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    >
                      {index + 1}
                    </span>
                    <span className="font-medium text-sm">{product.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-sm">
                      {viewType === "quantity" 
                        ? `${product.quantity} un.`
                        : formatCurrency(product.revenue)
                      }
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {viewType === "quantity" 
                        ? formatCurrency(product.revenue)
                        : `${product.quantity} un.`
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

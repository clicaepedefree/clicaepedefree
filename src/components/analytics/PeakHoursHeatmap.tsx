import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";

interface PeakHoursHeatmapProps {
  restaurantId: string;
  dateRange: DateRange | undefined;
}

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function PeakHoursHeatmap({ restaurantId, dateRange }: PeakHoursHeatmapProps) {
  const [heatmapData, setHeatmapData] = useState<number[][]>([]);
  const [maxValue, setMaxValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPeakHours = async () => {
      if (!dateRange?.from || !dateRange?.to) return;

      setLoading(true);
      try {
        const { data: orders, error } = await supabase
          .from("orders")
          .select("created_at")
          .eq("restaurant_id", restaurantId)
          .neq("status", "cancelled")
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());

        if (error) throw error;

        // Initialize heatmap grid (7 days x 24 hours)
        const grid: number[][] = Array.from({ length: 7 }, () => 
          Array.from({ length: 24 }, () => 0)
        );

        let max = 0;

        orders?.forEach((order) => {
          const date = new Date(order.created_at);
          const day = date.getDay();
          const hour = date.getHours();
          grid[day][hour]++;
          if (grid[day][hour] > max) max = grid[day][hour];
        });

        setHeatmapData(grid);
        setMaxValue(max);
      } catch (error) {
        console.error("Error fetching peak hours:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPeakHours();
  }, [restaurantId, dateRange]);

  const getColor = (value: number) => {
    if (maxValue === 0 || value === 0) return "bg-muted";
    const intensity = value / maxValue;
    
    if (intensity > 0.8) return "bg-primary";
    if (intensity > 0.6) return "bg-primary/80";
    if (intensity > 0.4) return "bg-primary/60";
    if (intensity > 0.2) return "bg-primary/40";
    return "bg-primary/20";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horários de Pico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  // Find peak hours for summary
  const peakHours: { day: number; hour: number; count: number }[] = [];
  heatmapData.forEach((dayData, dayIndex) => {
    dayData.forEach((count, hourIndex) => {
      if (count > 0) {
        peakHours.push({ day: dayIndex, hour: hourIndex, count });
      }
    });
  });
  peakHours.sort((a, b) => b.count - a.count);
  const topPeaks = peakHours.slice(0, 5);

  // Filter hours that have at least some activity (8-23h typically for restaurants)
  const activeHours = HOURS.filter(h => h >= 8 && h <= 23);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Horários de Pico
        </CardTitle>
      </CardHeader>
      <CardContent>
        {maxValue === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Nenhum dado disponível para o período selecionado
          </div>
        ) : (
          <div className="space-y-6">
            {/* Heatmap Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Hours header */}
                <div className="flex mb-2">
                  <div className="w-12"></div>
                  {activeHours.map((hour) => (
                    <div 
                      key={hour} 
                      className="flex-1 text-center text-xs text-muted-foreground"
                    >
                      {hour}h
                    </div>
                  ))}
                </div>

                {/* Days rows */}
                {DAYS.map((day, dayIndex) => (
                  <div key={day} className="flex items-center mb-1">
                    <div className="w-12 text-xs font-medium text-muted-foreground">
                      {day}
                    </div>
                    {activeHours.map((hour) => (
                      <div
                        key={`${dayIndex}-${hour}`}
                        className={`flex-1 h-8 mx-0.5 rounded ${getColor(heatmapData[dayIndex]?.[hour] || 0)} 
                          transition-all hover:ring-2 hover:ring-primary/50 cursor-pointer`}
                        title={`${day} ${hour}h: ${heatmapData[dayIndex]?.[hour] || 0} pedidos`}
                      />
                    ))}
                  </div>
                ))}

                {/* Legend */}
                <div className="flex items-center justify-end gap-2 mt-4">
                  <span className="text-xs text-muted-foreground">Menos</span>
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded bg-muted"></div>
                    <div className="w-4 h-4 rounded bg-primary/20"></div>
                    <div className="w-4 h-4 rounded bg-primary/40"></div>
                    <div className="w-4 h-4 rounded bg-primary/60"></div>
                    <div className="w-4 h-4 rounded bg-primary/80"></div>
                    <div className="w-4 h-4 rounded bg-primary"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">Mais</span>
                </div>
              </div>
            </div>

            {/* Top Peak Hours Summary */}
            {topPeaks.length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-3">🔥 Horários mais movimentados</h4>
                <div className="flex flex-wrap gap-2">
                  {topPeaks.map((peak, index) => (
                    <div 
                      key={index}
                      className="bg-background px-3 py-1.5 rounded-full text-sm border"
                    >
                      <span className="font-medium">{DAYS[peak.day]}</span>
                      <span className="text-muted-foreground"> {peak.hour}h</span>
                      <span className="text-primary font-semibold ml-1">({peak.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

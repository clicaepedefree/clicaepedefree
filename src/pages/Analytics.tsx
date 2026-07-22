import { useState } from "react";
import { Navigate } from "react-router-dom";
import { BarChart3 } from "lucide-react";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/layout/AppShell";

import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { TopProductsChart } from "@/components/analytics/TopProductsChart";
import { PeakHoursHeatmap } from "@/components/analytics/PeakHoursHeatmap";
import { AverageTicketChart } from "@/components/analytics/AverageTicketChart";
import { ComparativeStats } from "@/components/analytics/ComparativeStats";

export default function Analytics() {
  const { user, restaurant, loading, logout } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/criar-conta" replace />;
  if (!restaurant) return <Navigate to="/admin" replace />;

  return (
    <AppShell restaurant={restaurant} onLogout={logout} title="Analytics" subtitle={restaurant.name}>
      <main className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Relatórios e Analytics</h2>
        </div>
        <AnalyticsFilters dateRange={dateRange} onDateRangeChange={setDateRange} />
        <div className="space-y-6">
          <ComparativeStats restaurantId={restaurant.id} />
          <TopProductsChart restaurantId={restaurant.id} dateRange={dateRange} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PeakHoursHeatmap restaurantId={restaurant.id} dateRange={dateRange} />
            <AverageTicketChart restaurantId={restaurant.id} dateRange={dateRange} />
          </div>
        </div>
      </main>
    </AppShell>
  );
}

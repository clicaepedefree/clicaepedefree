import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Navigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { subDays } from "date-fns";
import { DateRange } from "react-day-picker";

import { AnalyticsFilters } from "@/components/analytics/AnalyticsFilters";
import { TopProductsChart } from "@/components/analytics/TopProductsChart";
import { PeakHoursHeatmap } from "@/components/analytics/PeakHoursHeatmap";
import { AverageTicketChart } from "@/components/analytics/AverageTicketChart";
import { ComparativeStats } from "@/components/analytics/ComparativeStats";

export default function Analytics() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRestaurant(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRestaurant(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRestaurant = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setRestaurant(data);
    } catch (error: any) {
      console.error("Erro ao buscar restaurante:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

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

  if (!user) {
    return <Navigate to="/criar-conta" replace />;
  }

  if (!restaurant) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b bg-card flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold text-foreground">
              Relatórios e Analytics
            </h1>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {restaurant.name}
        </div>
      </header>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {/* Filters */}
        <AnalyticsFilters 
          dateRange={dateRange} 
          onDateRangeChange={setDateRange} 
        />

        {/* Analytics Grid */}
        <div className="space-y-6">
          {/* Comparative Stats */}
          <ComparativeStats restaurantId={restaurant.id} />

          {/* Top Products */}
          <TopProductsChart 
            restaurantId={restaurant.id} 
            dateRange={dateRange} 
          />

          {/* Peak Hours & Average Ticket */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PeakHoursHeatmap 
              restaurantId={restaurant.id} 
              dateRange={dateRange} 
            />
            <AverageTicketChart 
              restaurantId={restaurant.id} 
              dateRange={dateRange} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}

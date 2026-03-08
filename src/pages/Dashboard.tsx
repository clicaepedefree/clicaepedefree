import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { Navigate, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { RestaurantSetup } from "@/components/dashboard/RestaurantSetup";
import { useSuperAdminAccess } from "@/hooks/useSuperAdminAccess";
import { SuperAdminRestaurantSelector } from "@/components/dashboard/SuperAdminRestaurantSelector";
import { useAuth } from "@/hooks/useAuth";

export default function Dashboard() {
  const { user, restaurant, loading, isSuperAdminMode, superAdminSelectedId, updateRestaurant, logout } = useAuth();
  const [ownRestaurant, setOwnRestaurant] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { 
    isSuperAdmin, 
    allRestaurants, 
    selectedRestaurantId, 
    selectRestaurant, 
    clearSelection,
    loading: superAdminLoading 
  } = useSuperAdminAccess(user?.id);

  // Track own restaurant
  useEffect(() => {
    if (restaurant && !isSuperAdminMode) {
      setOwnRestaurant(restaurant);
    }
  }, [restaurant, isSuperAdminMode]);

  // When super admin selects a restaurant via dropdown, fetch it
  useEffect(() => {
    if (isSuperAdmin && selectedRestaurantId) {
      fetchRestaurantById(selectedRestaurantId);
    } else if (isSuperAdmin && !selectedRestaurantId && ownRestaurant) {
      updateRestaurant(ownRestaurant);
    }
  }, [isSuperAdmin, selectedRestaurantId, ownRestaurant]);

  const fetchRestaurantById = async (restaurantId: string) => {
    try {
      // Query only the specific restaurant, not ALL restaurants
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (error) throw error;
      updateRestaurant(data);
    } catch (error: any) {
      console.error('Erro ao buscar restaurante:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar restaurante",
        description: error.message,
      });
    }
  };

  const handleLogout = async () => {
    clearSelection();
    
    if (isSuperAdminMode) {
      localStorage.removeItem('superAdminSelectedRestaurant');
      navigate('/super-admin');
      return;
    }
    
    await logout();
    toast({ title: "Logout realizado", description: "Até logo!" });
  };

  const handleBackToSuperAdmin = () => {
    navigate('/super-admin');
  };

  if (loading && !isSuperAdminMode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  // Super admin mode via localStorage
  if (isSuperAdminMode && superAdminSelectedId && restaurant) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/10 border-b border-amber-500/30 px-4 py-3">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-amber-600 font-semibold">🛡️ Modo Super Admin</span>
              <span className="text-muted-foreground">|</span>
              <span className="font-medium">{restaurant.name}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleBackToSuperAdmin}>
              ← Voltar ao Painel Super Admin
            </Button>
          </div>
        </div>
        <div className="pt-16">
          <DashboardLayout 
            restaurant={restaurant} 
            user={user} 
            onLogout={handleLogout}
            onRestaurantUpdate={updateRestaurant}
            isSuperAdminMode={true}
          />
        </div>
      </>
    );
  }

  if (isSuperAdminMode && !restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando restaurante...</p>
        </div>
      </div>
    );
  }

  if (!user && !isSuperAdminMode) {
    return <Navigate to="/criar-conta" replace />;
  }

  if (isSuperAdmin && !ownRestaurant) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto mt-20">
          <SuperAdminRestaurantSelector
            restaurants={allRestaurants}
            selectedRestaurantId={selectedRestaurantId}
            onSelect={selectRestaurant}
            onClear={clearSelection}
          />
          {selectedRestaurantId && restaurant && (
            <DashboardLayout 
              restaurant={restaurant} 
              user={user} 
              onLogout={handleLogout}
              onRestaurantUpdate={updateRestaurant}
              isSuperAdminMode={true}
            />
          )}
          {!selectedRestaurantId && (
            <div className="text-center text-muted-foreground mt-8">
              Selecione um restaurante para começar a gerenciar.
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!restaurant && !isSuperAdmin) {
    return <RestaurantSetup user={user!} onRestaurantCreated={updateRestaurant} />;
  }

  return (
    <>
      {isSuperAdmin && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-background border-b px-4 py-2">
          <SuperAdminRestaurantSelector
            restaurants={allRestaurants}
            selectedRestaurantId={selectedRestaurantId}
            onSelect={selectRestaurant}
            onClear={clearSelection}
          />
        </div>
      )}
      <div className={isSuperAdmin ? "pt-32" : ""}>
        <DashboardLayout 
          restaurant={restaurant} 
          user={user} 
          onLogout={handleLogout}
          onRestaurantUpdate={updateRestaurant}
          isSuperAdminMode={isSuperAdmin && selectedRestaurantId !== null}
        />
      </div>
    </>
  );
}

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

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [ownRestaurant, setOwnRestaurant] = useState<any>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Verificar se veio do super admin via localStorage
  const [isSuperAdminMode, setIsSuperAdminMode] = useState(false);
  const [superAdminSelectedId, setSuperAdminSelectedId] = useState<string | null>(null);
  
  const { 
    isSuperAdmin, 
    allRestaurants, 
    selectedRestaurantId, 
    selectRestaurant, 
    clearSelection,
    loading: superAdminLoading 
  } = useSuperAdminAccess(user?.id);

  // Verificar super admin session do localStorage (sistema /super-admin)
  useEffect(() => {
    const superAdminSession = localStorage.getItem('superAdminSession');
    const selectedRestaurant = localStorage.getItem('superAdminSelectedRestaurant');
    
    if (superAdminSession && selectedRestaurant) {
      try {
        const session = JSON.parse(superAdminSession);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        const sessionAge = Date.now() - session.loginTime;
        
        if (sessionAge < twentyFourHours) {
          setIsSuperAdminMode(true);
          setSuperAdminSelectedId(selectedRestaurant);
          fetchRestaurantById(selectedRestaurant);
        }
      } catch (e) {
        console.error('Erro ao verificar super admin session:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Se já está em modo super admin, não precisa verificar auth do Supabase
    if (isSuperAdminMode) {
      return;
    }
    
    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRestaurant(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRestaurant(session.user.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [isSuperAdminMode]);

  // Quando super admin seleciona um restaurante, busca os dados dele
  useEffect(() => {
    if (isSuperAdmin && selectedRestaurantId) {
      fetchRestaurantById(selectedRestaurantId);
    } else if (isSuperAdmin && !selectedRestaurantId && ownRestaurant) {
      setRestaurant(ownRestaurant);
    }
  }, [isSuperAdmin, selectedRestaurantId, ownRestaurant]);

  const fetchRestaurant = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        throw error;
      }

      setRestaurant(data);
      setOwnRestaurant(data);
    } catch (error: any) {
      console.error('Erro ao buscar restaurante:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar dados",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantById = async (restaurantId: string) => {
    try {
      // Para super admin, buscar via RPC que tem acesso a todos
      const { data: restaurantsData, error } = await supabase.rpc('get_restaurants_with_emails');

      if (error) {
        throw error;
      }

      const foundRestaurant = restaurantsData?.find((r: any) => r.id === restaurantId);
      
      if (foundRestaurant) {
        setRestaurant(foundRestaurant);
      } else {
        throw new Error('Restaurante não encontrado');
      }
    } catch (error: any) {
      console.error('Erro ao buscar restaurante:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar restaurante",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      clearSelection();
      
      // Se for super admin mode (via localStorage), limpar e voltar para super-admin
      if (isSuperAdminMode) {
        localStorage.removeItem('superAdminSelectedRestaurant');
        navigate('/super-admin');
        return;
      }
      
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer logout",
        description: error.message,
      });
    }
  };

  const handleBackToSuperAdmin = () => {
    navigate('/super-admin');
  };

  // Loading state - só para usuários normais (não super admin mode)
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

  // Super admin mode via localStorage (veio da página /super-admin)
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
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBackToSuperAdmin}
            >
              ← Voltar ao Painel Super Admin
            </Button>
          </div>
        </div>
        <div className="pt-16">
          <DashboardLayout 
            restaurant={restaurant} 
            user={user} 
            onLogout={handleLogout}
            onRestaurantUpdate={setRestaurant}
            isSuperAdminMode={true}
          />
        </div>
      </>
    );
  }

  // Loading para super admin mode
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

  // Super admin sem restaurante próprio, mas pode acessar outros
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
              onRestaurantUpdate={setRestaurant}
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
    return <RestaurantSetup user={user!} onRestaurantCreated={setRestaurant} />;
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
          onRestaurantUpdate={setRestaurant}
          isSuperAdminMode={isSuperAdmin && selectedRestaurantId !== null}
        />
      </div>
    </>
  );
}
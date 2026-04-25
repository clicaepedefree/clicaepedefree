import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";

interface AuthState {
  user: User | null;
  restaurant: any | null;
  loading: boolean;
  isSuperAdminMode: boolean;
  superAdminSelectedId: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    restaurant: null,
    loading: true,
    isSuperAdminMode: false,
    superAdminSelectedId: null,
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    // Clean up any legacy insecure localStorage flag
    localStorage.removeItem('superAdminSession');

    const handleSession = async (user: User | null) => {
      setState(prev => ({ ...prev, user }));
      if (!user) {
        setState(prev => ({ ...prev, restaurant: null, loading: false, isSuperAdminMode: false, superAdminSelectedId: null }));
        return;
      }

      // Check if user is a super admin (server-side via RPC)
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { check_user_id: user.id });

      if (isSuperAdmin) {
        const selectedRestaurant = localStorage.getItem('superAdminSelectedRestaurant');
        if (selectedRestaurant) {
          setState(prev => ({
            ...prev,
            isSuperAdminMode: true,
            superAdminSelectedId: selectedRestaurant,
          }));
          fetchRestaurantById(selectedRestaurant);
          return;
        }
        setState(prev => ({ ...prev, isSuperAdminMode: false, superAdminSelectedId: null }));
      }

      fetchRestaurant(user.id);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchRestaurant = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setState(prev => ({ ...prev, restaurant: data, loading: false }));
    } catch (error: any) {
      console.error('Erro ao buscar restaurante:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchRestaurantById = async (restaurantId: string) => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (error) throw error;

      setState(prev => ({ ...prev, restaurant: data, loading: false }));
    } catch (error: any) {
      console.error('Erro ao buscar restaurante:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const updateRestaurant = useCallback((updated: any) => {
    setState(prev => ({ ...prev, restaurant: updated }));
  }, []);

  const logout = useCallback(async () => {
    queryClient.clear();
    localStorage.removeItem('superAdminSelectedRestaurant');
    localStorage.removeItem('superAdminSession');
    await supabase.auth.signOut();
  }, [queryClient]);

  return {
    ...state,
    updateRestaurant,
    logout,
  };
}

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

  // Check super admin session from localStorage
  useEffect(() => {
    const superAdminSession = localStorage.getItem('superAdminSession');
    const selectedRestaurant = localStorage.getItem('superAdminSelectedRestaurant');
    
    if (superAdminSession && selectedRestaurant) {
      try {
        const session = JSON.parse(superAdminSession);
        const twentyFourHours = 24 * 60 * 60 * 1000;
        if (Date.now() - session.loginTime < twentyFourHours) {
          setState(prev => ({
            ...prev,
            isSuperAdminMode: true,
            superAdminSelectedId: selectedRestaurant,
          }));
          fetchRestaurantById(selectedRestaurant);
          return;
        }
      } catch (e) {
        console.error('Erro ao verificar super admin session:', e);
      }
    }

    // Normal auth flow
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user ?? null;
      setState(prev => ({ ...prev, user }));
      if (user) {
        fetchRestaurant(user.id);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      setState(prev => ({ ...prev, user }));
      if (user) {
        fetchRestaurant(user.id);
      } else {
        setState(prev => ({ ...prev, restaurant: null, loading: false }));
      }
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
    
    if (state.isSuperAdminMode) {
      localStorage.removeItem('superAdminSelectedRestaurant');
    } else {
      await supabase.auth.signOut();
    }
  }, [state.isSuperAdminMode, queryClient]);

  return {
    ...state,
    updateRestaurant,
    logout,
  };
}

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

// Simple in-memory cache for restaurant data to avoid refetching on navigation
let cachedRestaurant: any | null = null;
let cachedUserId: string | null = null;
let cachedUser: User | null = null;
let authChecked = false;

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: cachedUser,
    restaurant: cachedRestaurant,
    loading: !authChecked,
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
      cachedUser = user;
      authChecked = true;
      setState(prev => ({ ...prev, user }));
      if (user) {
        // Use cache if same user
        if (cachedUserId === user.id && cachedRestaurant) {
          setState(prev => ({ ...prev, restaurant: cachedRestaurant, loading: false }));
        } else {
          fetchRestaurant(user.id);
        }
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ?? null;
      cachedUser = user;
      authChecked = true;
      setState(prev => ({ ...prev, user }));
      if (user) {
        if (cachedUserId === user.id && cachedRestaurant) {
          setState(prev => ({ ...prev, restaurant: cachedRestaurant, loading: false }));
        } else {
          fetchRestaurant(user.id);
        }
      } else {
        cachedRestaurant = null;
        cachedUserId = null;
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

      cachedRestaurant = data;
      cachedUserId = userId;
      setState(prev => ({ ...prev, restaurant: data, loading: false }));
    } catch (error: any) {
      console.error('Erro ao buscar restaurante:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchRestaurantById = async (restaurantId: string) => {
    try {
      // Query only the specific restaurant fields we need, not ALL restaurants
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
    cachedRestaurant = updated;
    setState(prev => ({ ...prev, restaurant: updated }));
  }, []);

  const logout = useCallback(async () => {
    cachedRestaurant = null;
    cachedUserId = null;
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

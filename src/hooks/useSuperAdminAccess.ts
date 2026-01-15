import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

// Hook para super admins do Supabase Auth (user_id)
export const useSuperAdminAccess = (userId: string | undefined) => {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      checkSuperAdminStatus(userId);
    } else {
      setLoading(false);
    }
  }, [userId]);

  const checkSuperAdminStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('is_super_admin', { check_user_id: userId });
      
      if (error) {
        console.error('Erro ao verificar super admin:', error);
        setIsSuperAdmin(false);
      } else {
        setIsSuperAdmin(data === true);
        
        if (data === true) {
          await fetchAllRestaurants();
        }
      }
    } catch (error) {
      console.error('Erro ao verificar super admin:', error);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, name, slug')
        .order('name');

      if (error) {
        console.error('Erro ao buscar restaurantes:', error);
      } else {
        setAllRestaurants(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar restaurantes:', error);
    }
  };

  const selectRestaurant = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    localStorage.setItem('superAdminSelectedRestaurant', restaurantId);
  };

  const clearSelection = () => {
    setSelectedRestaurantId(null);
    localStorage.removeItem('superAdminSelectedRestaurant');
  };

  // Recuperar seleção do localStorage ao carregar
  useEffect(() => {
    if (isSuperAdmin) {
      const savedSelection = localStorage.getItem('superAdminSelectedRestaurant');
      if (savedSelection) {
        setSelectedRestaurantId(savedSelection);
      }
    }
  }, [isSuperAdmin]);

  return {
    isSuperAdmin,
    allRestaurants,
    selectedRestaurantId,
    selectRestaurant,
    clearSelection,
    loading
  };
};

// Hook simplificado para a página /super-admin (já autenticada via localStorage)
export const useSuperAdminRestaurantAccess = () => {
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllRestaurants();
    
    // Recuperar seleção do localStorage
    const savedSelection = localStorage.getItem('superAdminSelectedRestaurant');
    if (savedSelection) {
      setSelectedRestaurantId(savedSelection);
    }
  }, []);

  const fetchAllRestaurants = async () => {
    try {
      // Usar a função RPC que já existe para super admins
      const { data, error } = await supabase.rpc('get_restaurants_with_emails');

      if (error) {
        console.error('Erro ao buscar restaurantes:', error);
      } else {
        setAllRestaurants((data || []).map(r => ({
          id: r.id,
          name: r.name,
          slug: r.slug
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar restaurantes:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectRestaurant = (restaurantId: string) => {
    setSelectedRestaurantId(restaurantId);
    localStorage.setItem('superAdminSelectedRestaurant', restaurantId);
  };

  const clearSelection = () => {
    setSelectedRestaurantId(null);
    localStorage.removeItem('superAdminSelectedRestaurant');
  };

  return {
    allRestaurants,
    selectedRestaurantId,
    selectRestaurant,
    clearSelection,
    loading
  };
};

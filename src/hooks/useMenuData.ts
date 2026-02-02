import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Restaurant {
  id: string;
  name: string;
  whatsapp: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  is_open?: boolean;
  is_blocked?: boolean;
  delivery_enabled?: boolean;
  pickup_enabled?: boolean;
}

interface Category {
  id: string;
  name: string;
  display_order: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url?: string;
  is_active: boolean;
  is_featured?: boolean;
  display_order: number;
}

export function useMenuData(slug: string | undefined) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchMenuData();
    }
  }, [slug]);

  const fetchMenuData = async () => {
    try {
      // Buscar restaurante usando função segura
      const { data: restaurantData, error: restaurantError } = await supabase
        .rpc('get_public_restaurant_by_slug', { slug_input: slug });

      if (restaurantError) throw restaurantError;
      if (!restaurantData || restaurantData.length === 0) {
        setLoading(false);
        return;
      }

      const restaurant = restaurantData[0];
      setRestaurant(restaurant);

      // Buscar categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('display_order', { ascending: true });

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Buscar produtos ativos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error) {
      console.error("Erro ao carregar cardápio:", error);
    } finally {
      setLoading(false);
    }
  };

  const getProductsByCategory = (categoryId: string) => {
    return products.filter(product => product.category_id === categoryId);
  };

  return {
    restaurant,
    categories,
    products,
    loading,
    getProductsByCategory
  };
}
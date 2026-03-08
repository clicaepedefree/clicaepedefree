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
      // Fetch restaurant first (needed for ID)
      const { data: restaurantData, error: restaurantError } = await supabase
        .rpc('get_public_restaurant_by_slug', { slug_input: slug });

      if (restaurantError) throw restaurantError;
      if (!restaurantData || restaurantData.length === 0) {
        setLoading(false);
        return;
      }

      const restaurant = restaurantData[0];
      setRestaurant(restaurant);

      // Fetch categories and products IN PARALLEL
      const [categoriesResult, productsResult] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, display_order')
          .eq('restaurant_id', restaurant.id)
          .order('display_order', { ascending: true }),
        supabase
          .from('products')
          .select('id, name, description, price, category_id, image_url, is_active, is_featured, display_order')
          .eq('restaurant_id', restaurant.id)
          .eq('is_active', true)
          .order('display_order', { ascending: true }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (productsResult.error) throw productsResult.error;

      setCategories(categoriesResult.data || []);
      setProducts(productsResult.data || []);
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

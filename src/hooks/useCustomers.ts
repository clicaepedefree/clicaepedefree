import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerFilters { search: string; registeredFrom: string; registeredTo: string; lastFrom: string; lastTo: string; sort: string; page: number }
export function useCustomers(restaurantId: string | undefined, filters: CustomerFilters) {
  return useQuery({ queryKey: ['customers', restaurantId, filters], enabled: Boolean(restaurantId), staleTime: 0, refetchOnWindowFocus: true, refetchInterval: 15000, queryFn: async () => {
    if (!restaurantId) return [];
    const { data, error } = await supabase.rpc('crm_customers', { _restaurant_id: restaurantId, _search: filters.search, _registered_from: filters.registeredFrom || undefined, _registered_to: filters.registeredTo || undefined, _last_from: filters.lastFrom || undefined, _last_to: filters.lastTo || undefined, _sort: filters.sort, _page: filters.page });
    if (error) throw error;
    return data || [];
  } });
}
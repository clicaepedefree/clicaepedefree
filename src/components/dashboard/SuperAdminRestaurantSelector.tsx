import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Shield, X } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

interface SuperAdminRestaurantSelectorProps {
  restaurants: Restaurant[];
  selectedRestaurantId: string | null;
  onSelect: (restaurantId: string) => void;
  onClear: () => void;
}

export const SuperAdminRestaurantSelector = ({
  restaurants,
  selectedRestaurantId,
  onSelect,
  onClear
}: SuperAdminRestaurantSelectorProps) => {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-5 w-5 text-amber-500" />
        <span className="font-semibold text-amber-600">Modo Super Admin</span>
      </div>
      
      <div className="flex items-center gap-3">
        <Select 
          value={selectedRestaurantId || ""} 
          onValueChange={onSelect}
        >
          <SelectTrigger className="flex-1 bg-background">
            <SelectValue placeholder="Selecione um restaurante para acessar" />
          </SelectTrigger>
          <SelectContent className="bg-background max-h-[300px]">
            {restaurants.map((restaurant) => (
              <SelectItem key={restaurant.id} value={restaurant.id}>
                {restaurant.name} ({restaurant.slug})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedRestaurantId && (
          <Button 
            variant="outline" 
            size="icon"
            onClick={onClear}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        Você está no modo super admin. Selecione um restaurante para visualizar e gerenciar.
      </p>
    </div>
  );
};

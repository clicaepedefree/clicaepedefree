import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface CartSummaryProps {
  cartItemsCount: number;
  cartTotal: number;
  onOpenConfirmation: () => void;
  restaurantStatus?: {
    is_open: boolean;
    is_blocked: boolean;
  };
}

export function CartSummary({ cartItemsCount, cartTotal, onOpenConfirmation, restaurantStatus }: CartSummaryProps) {
  if (cartItemsCount === 0) return null;
  
  // Don't show cart if restaurant is closed or blocked
  const isRestaurantUnavailable = restaurantStatus && (!restaurantStatus.is_open || restaurantStatus.is_blocked);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">Total sem entrega</span>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">
                R$ {cartTotal.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              <span className="text-sm text-muted-foreground">
                • {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}
              </span>
            </div>
          </div>
          
          <Button 
            onClick={onOpenConfirmation} 
            disabled={isRestaurantUnavailable}
            className="flex items-center gap-2 bg-[#4BA3C3] hover:bg-[#3d8aa8] text-white px-6 h-12 text-base font-semibold"
          >
            <ShoppingCart className="h-5 w-5" />
            <span>
              {isRestaurantUnavailable 
                ? (restaurantStatus?.is_blocked ? "Loja Bloqueada" : "Loja Fechada")
                : "Ver sacola"
              }
            </span>
          </Button>
        </div>
      </div>
      
      {/* Padding para o carrinho fixo */}
      <div className="h-24"></div>
    </>
  );
}
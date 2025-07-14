import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface CartSummaryProps {
  cartItemsCount: number;
  cartTotal: number;
  onOpenConfirmation: () => void;
}

export function CartSummary({ cartItemsCount, cartTotal, onOpenConfirmation }: CartSummaryProps) {
  if (cartItemsCount === 0) return null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {cartItemsCount} {cartItemsCount === 1 ? 'item' : 'itens'}
            </Badge>
            <div className="text-lg font-bold">
              Total: R$ {cartTotal.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </div>
          </div>
          
          <Button onClick={onOpenConfirmation} className="flex items-center space-x-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Confirmar Pedido</span>
          </Button>
        </div>
      </div>
      
      {/* Padding para o carrinho fixo */}
      <div className="h-20"></div>
    </>
  );
}
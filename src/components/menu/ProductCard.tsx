import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { numberToCurrency } from "@/components/ui/currency-input";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url?: string;
  is_active: boolean;
  display_order: number;
}

interface ProductCardProps {
  product: Product;
  cart: { [key: string]: { quantity: number; addons: any[]; unitPrice: number } };
  onProductClick: (product: Product) => void;
  onRemoveFromCart: (cartKey: string) => void;
}

export function ProductCard({ product, cart, onProductClick, onRemoveFromCart }: ProductCardProps) {
  const productInCart = Object.entries(cart).find(([key]) => key.startsWith(product.id));
  const totalQuantity = Object.entries(cart)
    .filter(([key]) => key.startsWith(product.id))
    .reduce((sum, [, item]) => sum + item.quantity, 0);

  return (
    <Card className="overflow-hidden">
      {product.image_url && (
        <div className="aspect-video overflow-hidden">
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">{product.name}</h3>
          {product.description && (
            <p className="text-muted-foreground text-sm">{product.description}</p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-lg font-bold">
                R$ {numberToCurrency(product.price)}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {productInCart ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const cartKey = Object.keys(cart).find(key => key.startsWith(product.id));
                      if (cartKey) onRemoveFromCart(cartKey);
                    }}
                  >
                    -
                  </Button>
                  <Badge variant="secondary">
                    {totalQuantity}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onProductClick(product)}
                  >
                    +
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onProductClick(product)}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { numberToCurrency } from "@/components/ui/currency-input";

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

interface ProductCardProps {
  product: Product;
  cart: { [key: string]: { quantity: number; addons: any[]; unitPrice: number } };
  onProductClick: (product: Product) => void;
  onRemoveFromCart: (cartKey: string) => void;
}

export function ProductCard({ product, cart, onProductClick, onRemoveFromCart }: ProductCardProps) {
  const totalQuantity = Object.entries(cart)
    .filter(([key]) => key.startsWith(product.id))
    .reduce((sum, [, item]) => sum + item.quantity, 0);

  return (
    <Card 
      className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => onProductClick(product)}
    >
      <CardContent className="p-4">
        <div className="flex gap-3 items-start">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1">{product.name}</h3>
            {product.description && (
              <p className="text-muted-foreground text-xs line-clamp-2 mb-2">{product.description}</p>
            )}
            <span className="text-lg font-bold text-primary">
              R$ {numberToCurrency(product.price)}
            </span>
          </div>
          
          {product.image_url && (
            <div className="relative w-20 h-20 flex-shrink-0">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg"
              />
              {totalQuantity > 0 && (
                <Badge 
                  variant="default" 
                  className="absolute -top-2 -right-2 bg-primary text-primary-foreground shadow-lg min-w-[24px] h-6 flex items-center justify-center"
                >
                  {totalQuantity}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
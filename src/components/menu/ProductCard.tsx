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
      <CardContent className="p-0">
        {product.image_url && (
          <div className="relative w-full h-48 md:h-56">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            {totalQuantity > 0 && (
              <Badge 
                variant="default" 
                className="absolute top-2 right-2 bg-primary text-primary-foreground shadow-lg"
              >
                {totalQuantity}
              </Badge>
            )}
          </div>
        )}
        
        <div className="p-4 space-y-2">
          <h3 className="font-semibold text-lg">{product.name}</h3>
          {product.description && (
            <p className="text-muted-foreground text-sm line-clamp-2">{product.description}</p>
          )}
          
          <div className="pt-2">
            <span className="text-xl font-bold text-primary">
              R$ {numberToCurrency(product.price)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
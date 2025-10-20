import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { numberToCurrency } from "@/components/ui/currency-input";
import { Star } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url?: string;
  is_active: boolean;
  display_order: number;
  is_featured?: boolean;
}

interface FeaturedProductsProps {
  products: Product[];
  cart: { [key: string]: { quantity: number; addons: any[]; unitPrice: number } };
  onProductClick: (product: Product) => void;
}

export function FeaturedProducts({ products, cart, onProductClick }: FeaturedProductsProps) {
  const featuredProducts = products.filter(p => p.is_featured);

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
        <h2 className="text-2xl font-bold">Destaques</h2>
      </div>
      
      <div className="overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
          {featuredProducts.map((product) => {
            const totalQuantity = Object.entries(cart)
              .filter(([key]) => key.startsWith(product.id))
              .reduce((sum, [, item]) => sum + item.quantity, 0);

            return (
              <Card 
                key={product.id}
                className="overflow-hidden cursor-pointer hover:shadow-lg transition-shadow flex-shrink-0"
                style={{ width: '280px' }}
                onClick={() => onProductClick(product)}
              >
                <CardContent className="p-0">
                  {product.image_url && (
                    <div className="relative w-full h-48">
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
                      <div className="absolute top-2 left-2">
                        <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      </div>
                    </div>
                  )}
                  
                  <div className="p-4 space-y-2">
                    <h3 className="font-semibold text-lg line-clamp-1">{product.name}</h3>
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
          })}
        </div>
      </div>
    </div>
  );
}

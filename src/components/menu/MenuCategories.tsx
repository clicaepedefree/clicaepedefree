import { ProductCard } from "./ProductCard";

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
  display_order: number;
}

interface MenuCategoriesProps {
  categories: Category[];
  getProductsByCategory: (categoryId: string) => Product[];
  cart: { [key: string]: { quantity: number; addons: any[]; unitPrice: number } };
  onProductClick: (product: Product) => void;
  onRemoveFromCart: (cartKey: string) => void;
}

export function MenuCategories({ 
  categories, 
  getProductsByCategory, 
  cart, 
  onProductClick, 
  onRemoveFromCart 
}: MenuCategoriesProps) {
  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const categoryProducts = getProductsByCategory(category.id);
        
        if (categoryProducts.length === 0) return null;

        return (
          <div key={category.id} className="space-y-4">
            <h2 className="text-2xl font-bold border-b pb-2">{category.name}</h2>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  cart={cart}
                  onProductClick={onProductClick}
                  onRemoveFromCart={onRemoveFromCart}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
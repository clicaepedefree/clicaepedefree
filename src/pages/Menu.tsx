import { useState } from "react";
import { useParams } from "react-router-dom";
import { ProductAddonSelector } from "@/components/menu/ProductAddonSelector";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { MenuLoadingState } from "@/components/menu/MenuLoadingState";
import { MenuNotFound } from "@/components/menu/MenuNotFound";
import { MenuEmptyState } from "@/components/menu/MenuEmptyState";
import { MenuCategories } from "@/components/menu/MenuCategories";
import { CartSummary } from "@/components/menu/CartSummary";
import { useMenuData } from "@/hooks/useMenuData";
import { useCart } from "@/hooks/useCart";

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

export default function Menu() {
  const { slug } = useParams<{ slug: string }>();
  const { restaurant, categories, products, loading, getProductsByCategory } = useMenuData(slug);
  const { cart, addToCart, removeFromCart, getCartTotal, sendWhatsAppOrder, getCartItemsCount } = useCart();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addonSelectorOpen, setAddonSelectorOpen] = useState(false);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setAddonSelectorOpen(true);
  };

  const handleSendOrder = () => {
    sendWhatsAppOrder(restaurant, products);
  };

  if (loading) {
    return <MenuLoadingState />;
  }

  if (!restaurant) {
    return <MenuNotFound />;
  }

  const cartItemsCount = getCartItemsCount();

  return (
    <div className="min-h-screen bg-background">
      <MenuHeader restaurantName={restaurant.name} />

      <div className="container mx-auto px-4 py-8">
        {categories.length === 0 ? (
          <MenuEmptyState />
        ) : (
          <MenuCategories
            categories={categories}
            getProductsByCategory={getProductsByCategory}
            cart={cart}
            onProductClick={handleProductClick}
            onRemoveFromCart={removeFromCart}
          />
        )}
      </div>

      <CartSummary
        cartItemsCount={cartItemsCount}
        cartTotal={getCartTotal()}
        onSendOrder={handleSendOrder}
      />

      {selectedProduct && (
        <ProductAddonSelector
          product={selectedProduct}
          open={addonSelectorOpen}
          onOpenChange={setAddonSelectorOpen}
          onAddToCart={addToCart}
        />
      )}
    </div>
  );
}
import { CartSummary } from "@/components/menu/CartSummary";
import { MenuCategories } from "@/components/menu/MenuCategories";
import { MenuEmptyState } from "@/components/menu/MenuEmptyState";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { MenuLoadingState } from "@/components/menu/MenuLoadingState";
import { MenuNotFound } from "@/components/menu/MenuNotFound";
import { OrderConfirmationModal } from "@/components/menu/OrderConfirmationModal";
import { ProductAddonSelector } from "@/components/menu/ProductAddonSelector";
import { CategoryMenu } from "@/components/menu/CategoryMenu";
import { useCart } from "@/hooks/useCart";
import { useMenuData } from "@/hooks/useMenuData";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Clock } from "lucide-react";

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
  const { cart, addToCart, removeFromCart, updateQuantity, removeItem, getCartTotal, sendWhatsAppOrder, getCartItemsCount } = useCart();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addonSelectorOpen, setAddonSelectorOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);

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
      <MenuHeader 
        restaurantName={restaurant.name} 
        logoUrl={restaurant.logo_url}
        bannerUrl={restaurant.banner_url}
      />

      {categories.length > 0 && <CategoryMenu categories={categories} />}

      <div className="container mx-auto px-4 py-8">
        {/* Restaurant Status Alert */}
        {restaurant.is_blocked && (
          <Alert className="mb-6 border-red-500 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              <strong>Loja temporariamente indisponível.</strong> Não é possível realizar pedidos no momento.
            </AlertDescription>
          </Alert>
        )}
        
        {!restaurant.is_blocked && !restaurant.is_open && (
          <Alert className="mb-6 border-orange-500 bg-orange-50">
            <Clock className="h-4 w-4" />
            <AlertDescription className="text-orange-800">
              <strong>Loja fechada.</strong> Você pode visualizar o cardápio, mas não é possível fazer pedidos no momento.
            </AlertDescription>
          </Alert>
        )}

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
        onOpenConfirmation={() => setConfirmationModalOpen(true)}
        restaurantStatus={{
          is_open: restaurant?.is_open ?? true,
          is_blocked: restaurant?.is_blocked ?? false
        }}
      />

      <OrderConfirmationModal
        open={confirmationModalOpen}
        onOpenChange={setConfirmationModalOpen}
        cart={cart}
        products={products}
        restaurant={restaurant}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onSendWhatsApp={(address, payment, deliveryFee) => sendWhatsAppOrder(restaurant, products, address, payment, deliveryFee)}
        getCartTotal={getCartTotal}
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
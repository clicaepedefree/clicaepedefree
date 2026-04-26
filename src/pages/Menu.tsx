import { CartSummary } from "@/components/menu/CartSummary";
import { MenuCategories } from "@/components/menu/MenuCategories";
import { MenuEmptyState } from "@/components/menu/MenuEmptyState";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { MenuLoadingState } from "@/components/menu/MenuLoadingState";
import { MenuNotFound } from "@/components/menu/MenuNotFound";
import { OrderConfirmationModal } from "@/components/menu/OrderConfirmationModal";
import { ProductAddonSelector } from "@/components/menu/ProductAddonSelector";
import { CategoryMenu } from "@/components/menu/CategoryMenu";
import { FeaturedProducts } from "@/components/menu/FeaturedProducts";
import { PixPaymentModal } from "@/components/menu/PixPaymentModal";
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
  is_featured?: boolean;
  display_order: number;
}

export default function Menu() {
  const { slug } = useParams<{ slug: string }>();
  const { restaurant, categories, products, loading, getProductsByCategory } = useMenuData(slug);
  const { cart, addToCart, removeFromCart, updateQuantity, removeItem, getCartTotal, sendWhatsAppOrder, generateWhatsAppMessage, clearCart, getCartItemsCount } = useCart();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addonSelectorOpen, setAddonSelectorOpen] = useState(false);
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);

  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixOrderId, setPixOrderId] = useState<string | null>(null);
  const [pixAmount, setPixAmount] = useState(0);
  const [pendingWhatsApp, setPendingWhatsApp] = useState<{ address: any; payment: any; deliveryFee?: number } | null>(null);

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setAddonSelectorOpen(true);
  };

  const handleSendOrder = async (address: any, payment: any, deliveryFee?: number) => {
    const result = await sendWhatsAppOrder(restaurant, products, address, payment, deliveryFee);
    if (result.isPixOnline && result.orderId) {
      setPixOrderId(result.orderId);
      setPixAmount(result.total);
      setPendingWhatsApp({ address, payment, deliveryFee });
      setPixModalOpen(true);
      setConfirmationModalOpen(false);
    }
  };

  const handlePixPaid = () => {
    if (restaurant && pendingWhatsApp) {
      const msg = generateWhatsAppMessage(
        restaurant, products,
        pendingWhatsApp.address,
        { ...pendingWhatsApp.payment, type: 'pix_online' },
        pendingWhatsApp.deliveryFee,
      );
      const url = `https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}?text=${msg}`;
      window.open(url, '_blank');
    }
    clearCart();
    setPixModalOpen(false);
    setPixOrderId(null);
    setPendingWhatsApp(null);
  };

  const handlePixExpired = () => {
    setPixModalOpen(false);
    setPixOrderId(null);
    setPendingWhatsApp(null);
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
        whatsapp={restaurant.whatsapp}
        isOpen={restaurant.is_open}
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
          <>
            <FeaturedProducts
              products={products}
              cart={cart}
              onProductClick={handleProductClick}
            />
            
            <MenuCategories
              categories={categories}
              getProductsByCategory={getProductsByCategory}
              cart={cart}
              onProductClick={handleProductClick}
              onRemoveFromCart={removeFromCart}
            />
          </>
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
        onSendWhatsApp={handleSendOrder}
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

      <PixPaymentModal
        open={pixModalOpen}
        onOpenChange={(open) => { if (!open) handlePixExpired(); }}
        orderId={pixOrderId}
        amount={pixAmount}
        onPaid={handlePixPaid}
        onExpired={handlePixExpired}
      />
    </div>
  );
}
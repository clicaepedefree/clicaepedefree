import { useState } from "react";
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

interface Restaurant {
  id: string;
  name: string;
  whatsapp: string;
  slug: string;
}

export function useCart() {
  const [cart, setCart] = useState<{ [key: string]: { quantity: number; addons: any[]; unitPrice: number } }>({});

  const addToCart = (product: Product, selectedAddons: any[], totalPrice: number) => {
    const cartKey = `${product.id}-${JSON.stringify(selectedAddons.map(a => a.option?.id).sort())}`;
    
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        quantity: (prev[cartKey]?.quantity || 0) + 1,
        addons: selectedAddons,
        unitPrice: totalPrice
      }
    }));
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[cartKey].quantity > 1) {
        newCart[cartKey].quantity--;
      } else {
        delete newCart[cartKey];
      }
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  };

  const generateWhatsAppMessage = (restaurant: Restaurant | null, products: Product[]) => {
    console.log('generateWhatsAppMessage called with:', { cart, restaurant, products });
    
    if (Object.keys(cart).length === 0) {
      console.log('Cart is empty');
      return "";
    }

    let message = `*Pedido - ${restaurant?.name}*\n\n`;
    
    Object.entries(cart).forEach(([cartKey, item]) => {
      const productId = cartKey.split('-')[0];
      const product = products.find(p => p.id === productId);
      console.log('Processing cart item:', { cartKey, item, productId, product });
      
      if (product) {
        message += `${item.quantity}x ${product.name}`;
        
        if (item.addons && item.addons.length > 0) {
          const addonNames = item.addons.map(a => a.option?.name).filter(Boolean).join(', ');
          if (addonNames) {
            message += ` (${addonNames})`;
          }
        }
        
        message += ` - R$ ${numberToCurrency(item.unitPrice * item.quantity)}\n`;
      }
    });

    message += `\n*Total: R$ ${numberToCurrency(getCartTotal())}*`;
    return encodeURIComponent(message);
  };

  const sendWhatsAppOrder = (restaurant: Restaurant | null, products: Product[]) => {
    if (!restaurant?.whatsapp || Object.keys(cart).length === 0) return;
    
    const message = generateWhatsAppMessage(restaurant, products);
    const whatsappUrl = `https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const getCartItemsCount = () => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    getCartTotal,
    sendWhatsAppOrder,
    getCartItemsCount
  };
}
import { useState } from "react";
import { numberToCurrency } from "@/components/ui/currency-input";
import { supabase } from "@/integrations/supabase/client";

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
  const [cart, setCart] = useState<{ [key: string]: { quantity: number; addons: any[]; unitPrice: number; observations?: string } }>({});

  const addToCart = (product: Product, selectedAddons: any[], totalPrice: number, observations?: string) => {
    const cartKey = `${product.id}-${JSON.stringify(selectedAddons.map(a => a.option?.id).sort())}-${observations || ''}`;
    
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        quantity: (prev[cartKey]?.quantity || 0) + 1,
        addons: selectedAddons,
        unitPrice: totalPrice,
        observations: observations || prev[cartKey]?.observations
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

  const updateQuantity = (cartKey: string, newQuantity: number) => {
    setCart(prev => ({
      ...prev,
      [cartKey]: {
        ...prev[cartKey],
        quantity: newQuantity
      }
    }));
  };

  const removeItem = (cartKey: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[cartKey];
      return newCart;
    });
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((total, item) => {
      return total + (item.unitPrice * item.quantity);
    }, 0);
  };

  const generateWhatsAppMessage = (restaurant: Restaurant | null, products: Product[], address?: any, payment?: { type: string; changeAmount?: number }, deliveryFee?: number) => {
    console.log('generateWhatsAppMessage called with:', { cart, restaurant, products, address });
    
    if (Object.keys(cart).length === 0) {
      console.log('Cart is empty');
      return "";
    }

    const isDelivery = address && address.street && address.number && address.neighborhood;
    let message = `*Pedido - ${restaurant?.name}*\n`;
    message += `*Tipo:* ${isDelivery ? 'Entrega' : 'Retirada'}\n\n`;
    
    Object.entries(cart).forEach(([cartKey, item]) => {
      // Extract product ID - format is: productId-[addons]-observations
      const parts = cartKey.split('-');
      const productId = parts.slice(0, 5).join('-');
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
        
        message += ` - R$ ${numberToCurrency(item.unitPrice * item.quantity)}`;
        
        // Add observations if present
        if (item.observations) {
          message += `\n   📝 _${item.observations}_`;
        }
        
        message += `\n`;
      }
    });

    const subtotal = getCartTotal();
    message += `\n*Subtotal: R$ ${numberToCurrency(subtotal)}*`;
    
    if (deliveryFee && deliveryFee > 0) {
      message += `\n*Taxa de Entrega: R$ ${numberToCurrency(deliveryFee)}*`;
      message += `\n*Total: R$ ${numberToCurrency(subtotal + deliveryFee)}*`;
    } else {
      message += `\n*Total: R$ ${numberToCurrency(subtotal)}*`;
    }
    
    message += `\n\n👤 *Cliente:* ${address?.name || 'Não informado'}`;
    message += `\n📞 *Telefone:* ${address?.phone || 'Não informado'}`;
    
    if (address && address.street && address.number && address.neighborhood) {
      message += `\n📍 *Endereço de Entrega:*\n`;
      message += `${address.street}, ${address.number}`;
      if (address.complement) {
        message += ` - ${address.complement}`;
      }
      message += `\n${address.neighborhood}`;
    } else {
      message += `\n🏪 *Retirada no local*`;
    }

    if (payment) {
      message += `\n\n💳 *Forma de Pagamento:* `;
      const paymentLabels: Record<string, string> = {
        debit_card: 'Cartão de Débito',
        credit_card: 'Cartão de Crédito',
        food_voucher: 'Vale Alimentação',
        meal_voucher: 'Vale Refeição',
        pix: 'PIX',
        cash: 'Dinheiro',
        card: 'Cartão', // Legacy support
        debit: 'Cartão de Débito', // Legacy support
        credit: 'Cartão de Crédito' // Legacy support
      };
      message += paymentLabels[payment.type] || payment.type;
      if (payment.type === 'cash' && payment.changeAmount) {
        message += ` (Troco para R$ ${payment.changeAmount.toFixed(2).replace('.', ',')})`;
      }
    }
    
    return encodeURIComponent(message);
  };

  const sanitizeString = (value: string | undefined | null, maxLength: number): string | null => {
    if (!value) return null;
    // Trim and limit length
    return value.trim().slice(0, maxLength);
  };

  const sanitizePhone = (value: string | undefined | null): string | null => {
    if (!value) return null;
    // Only allow digits, parentheses, spaces, dashes, and plus
    const cleaned = value.replace(/[^\d\s()\-+]/g, '').trim().slice(0, 20);
    return cleaned || null;
  };

  const saveOrderToDatabase = async (restaurant: Restaurant | null, products: Product[], address?: any, payment?: { type: string; changeAmount?: number }, deliveryFee?: number): Promise<string | null> => {
    if (!restaurant || Object.keys(cart).length === 0) return null;

    try {
      const orderItems = Object.entries(cart).map(([cartKey, item]) => {
        const parts = cartKey.split('-');
        const productId = parts.slice(0, 5).join('-');
        const product = products.find(p => p.id === productId);
        
        return {
          productId,
          productName: sanitizeString(product?.name, 200),
          quantity: Math.min(Math.max(1, Math.floor(item.quantity)), 100),
          unitPrice: Math.max(0, item.unitPrice),
          addons: item.addons,
          observations: sanitizeString(item.observations, 500),
          total: item.unitPrice * item.quantity
        };
      });

      const subtotal = getCartTotal();
      const total = subtotal + (deliveryFee || 0);

      const customerName = sanitizeString(address?.name, 100);
      const customerPhone = sanitizePhone(address?.phone);
      const fullAddress = address && address.street && address.number && address.neighborhood
        ? sanitizeString(`${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}, ${address.neighborhood}`, 500)
        : null;
      const paymentMethod = sanitizeString(payment?.type, 50);
      const isPixOnline = payment?.type === 'pix_online';

      const { data, error } = await supabase.from('orders').insert({
        restaurant_id: restaurant.id,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: orderItems,
        subtotal,
        delivery_fee: deliveryFee || 0,
        total,
        address: fullAddress,
        payment_method: paymentMethod,
        status: isPixOnline ? 'pending_payment' : 'new',
        payment_status: isPixOnline ? 'aguardando_pagamento' : 'not_required',
      }).select('id').single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Erro ao salvar pedido:', error);
      return null;
    }
  };

  const sendWhatsAppOrder = async (restaurant: Restaurant | null, products: Product[], address?: any, payment?: { type: string; changeAmount?: number }, deliveryFee?: number): Promise<{ orderId: string | null; isPixOnline: boolean; total: number }> => {
    if (!restaurant?.whatsapp || Object.keys(cart).length === 0) {
      return { orderId: null, isPixOnline: false, total: 0 };
    }
    
    const isPixOnline = payment?.type === 'pix_online';
    const total = getCartTotal() + (deliveryFee || 0);
    
    // Salvar pedido no banco antes de enviar WhatsApp
    const orderId = await saveOrderToDatabase(restaurant, products, address, payment, deliveryFee);
    
    // Para PIX online, NÃO envia WhatsApp ainda — só envia após pagamento confirmado
    if (isPixOnline) {
      return { orderId, isPixOnline: true, total };
    }

    const message = generateWhatsAppMessage(restaurant, products, address, payment, deliveryFee);
    const whatsappUrl = `https://wa.me/${restaurant.whatsapp.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    
    // Limpar carrinho após envio
    setCart({});
    return { orderId, isPixOnline: false, total };
  };

  const clearCart = () => setCart({});

  const getCartItemsCount = () => {
    return Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  };

  return {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    removeItem,
    getCartTotal,
    sendWhatsAppOrder,
    getCartItemsCount
  };
}
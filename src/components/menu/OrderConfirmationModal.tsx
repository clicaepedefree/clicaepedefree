import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { numberToCurrency } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Banknote, CreditCard, ExternalLink, MapPin, Minus, Phone, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

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

interface DeliveryAddress {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  phone: string;
  name: string;
  deliveryZoneId?: string;
}

interface DeliveryZone {
  id: string;
  neighborhood: string;
  delivery_fee: number;
  is_active: boolean;
}

interface PaymentMethod {
  type: 'debit' | 'credit' | 'pix' | 'cash';
  changeAmount?: number;
}

interface OrderConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: { [key: string]: { quantity: number; addons: any[]; unitPrice: number } };
  products: Product[];
  restaurant: Restaurant | null;
  onUpdateQuantity: (cartKey: string, newQuantity: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onSendWhatsApp: (address?: DeliveryAddress, payment?: PaymentMethod, deliveryFee?: number) => void;
  getCartTotal: () => number;
}

export function OrderConfirmationModal({
  open,
  onOpenChange,
  cart,
  products,
  restaurant,
  onUpdateQuantity,
  onRemoveItem,
  onSendWhatsApp,
  getCartTotal
}: OrderConfirmationModalProps) {
  const cartEntries = Object.entries(cart);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [selectedDeliveryZone, setSelectedDeliveryZone] = useState<DeliveryZone | null>(null);
  
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress>({
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    phone: '',
    name: '',
    deliveryZoneId: ''
  });
  
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>({
    type: 'pix'
  });
  
  const [changeAmount, setChangeAmount] = useState('');

  useEffect(() => {
    if (restaurant?.id && open) {
      fetchDeliveryZones();
    }
  }, [restaurant?.id, open]);

  const fetchDeliveryZones = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_zones')
        .select('*')
        .eq('restaurant_id', restaurant!.id)
        .eq('is_active', true)
        .order('neighborhood');

      if (error) throw error;
      setDeliveryZones(data || []);
    } catch (error) {
      console.error('Erro ao buscar zonas de entrega:', error);
    }
  };

  const handleDeliveryZoneChange = (zoneId: string) => {
    const zone = deliveryZones.find(z => z.id === zoneId);
    setSelectedDeliveryZone(zone || null);
    setDeliveryAddress(prev => ({ 
      ...prev, 
      deliveryZoneId: zoneId,
      neighborhood: zone?.neighborhood || ''
    }));
  };
  
  const handleSendOrder = () => {
    const payment: PaymentMethod = {
      type: paymentMethod.type,
      changeAmount: paymentMethod.type === 'cash' && changeAmount ? parseFloat(changeAmount) : undefined
    };
    const deliveryFee = selectedDeliveryZone?.delivery_fee || 0;
    onSendWhatsApp(deliveryAddress, payment, deliveryFee);
    onOpenChange(false);
  };

  const isAddressValid = deliveryAddress.street && deliveryAddress.number && deliveryAddress.name && deliveryAddress.phone && deliveryAddress.deliveryZoneId;
  const deliveryFee = selectedDeliveryZone?.delivery_fee || 0;
  const totalWithDelivery = getCartTotal() + deliveryFee;

  const updateQuantity = (cartKey: string, delta: number) => {
    const currentQuantity = cart[cartKey]?.quantity || 0;
    const newQuantity = currentQuantity + delta;
    
    if (newQuantity <= 0) {
      onRemoveItem(cartKey);
    } else {
      onUpdateQuantity(cartKey, newQuantity);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[85vh] sm:max-h-[80vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold">
            Confirmar Pedido - {restaurant?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
        {cartEntries.map(([cartKey, item]) => {
          // O productId é toda a parte antes do último hífen que precede o JSON dos addons
          const lastHyphenIndex = cartKey.lastIndexOf('-[');
          const productId = lastHyphenIndex !== -1 ? cartKey.substring(0, lastHyphenIndex) : cartKey.split('-').slice(0, 5).join('-');
          const product = products.find(p => p.id === productId);
            
            if (!product) return null;

            return (
              <div key={cartKey} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{product.name}</h3>
                    {product.description && (
                      <p className="text-muted-foreground text-sm">{product.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(cartKey)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {item.addons && item.addons.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Adicionais:</p>
                    <div className="flex flex-wrap gap-1">
                      {item.addons.map((addon, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {addon.option?.name}
                          {addon.option?.price && addon.option.price > 0 && 
                            ` (+R$ ${numberToCurrency(addon.option.price)})`
                          }
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(cartKey, -1)}
                      className="h-8 w-8"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold min-w-[2rem] text-center">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => updateQuantity(cartKey, 1)}
                      className="h-8 w-8"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      R$ {numberToCurrency(item.unitPrice)} cada
                    </p>
                    <p className="font-bold text-lg">
                      R$ {numberToCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span>Subtotal:</span>
              <span>R$ {numberToCurrency(getCartTotal())}</span>
            </div>
            {selectedDeliveryZone && (
              <div className="flex justify-between items-center">
                <span>Taxa de entrega ({selectedDeliveryZone.neighborhood}):</span>
                <span>R$ {numberToCurrency(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xl font-bold border-t pt-2">
              <span>Total:</span>
              <span>R$ {numberToCurrency(totalWithDelivery)}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Endereço de Entrega</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Seu nome"
                  value={deliveryAddress.name}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={deliveryAddress.phone}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              
              <div className="sm:col-span-2">
                <Label htmlFor="street">Endereço *</Label>
                <Input
                  id="street"
                  placeholder="Rua, Avenida..."
                  value={deliveryAddress.street}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, street: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="number">Número *</Label>
                <Input
                  id="number"
                  placeholder="123"
                  value={deliveryAddress.number}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, number: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="complement">Complemento</Label>
                <Input
                  id="complement"
                  placeholder="Apto, Bloco, Sala..."
                  value={deliveryAddress.complement}
                  onChange={(e) => setDeliveryAddress(prev => ({ ...prev, complement: e.target.value }))}
                />
              </div>
              
              <div className="sm:col-span-2">
                <Label htmlFor="deliveryZone">Bairro / Zona de Entrega *</Label>
                {deliveryZones.length > 0 ? (
                  <Select value={deliveryAddress.deliveryZoneId} onValueChange={handleDeliveryZoneChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione seu bairro" />
                    </SelectTrigger>
                    <SelectContent>
                      {deliveryZones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id}>
                          {zone.neighborhood} - R$ {numberToCurrency(zone.delivery_fee)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id="neighborhood"
                    placeholder="Nome do bairro"
                    value={deliveryAddress.neighborhood}
                    onChange={(e) => setDeliveryAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
                  />
                )}
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-semibold">Forma de Pagamento</h3>
            </div>
            
            <RadioGroup 
              value={paymentMethod.type} 
              onValueChange={(value) => setPaymentMethod({ type: value as PaymentMethod['type'] })}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debit" id="debit" />
                <Label htmlFor="debit">Cartão de Débito</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit">Cartão de Crédito</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix">PIX</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cash" id="cash" />
                <Label htmlFor="cash">Dinheiro</Label>
              </div>
            </RadioGroup>
            
            {paymentMethod.type === 'cash' && (
              <div className="ml-6">
                <Label htmlFor="change">Troco para (opcional)</Label>
                <Input
                  id="change"
                  type="number"
                  placeholder="50.00"
                  value={changeAmount}
                  onChange={(e) => setChangeAmount(e.target.value)}
                  className="w-32"
                />
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Continuar Comprando
            </Button>
            <Button 
              onClick={handleSendOrder}
              className="flex-1 flex items-center space-x-2"
              disabled={cartEntries.length === 0 || !isAddressValid}
            >
              <Phone className="h-4 w-4" />
              <span>Enviar para WhatsApp</span>
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
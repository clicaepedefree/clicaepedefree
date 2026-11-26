import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Loader2, Minus, Plus, Trash2, Truck, ShoppingBag, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { numberToCurrency } from '@/components/ui/currency-input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { maskCustomerPhone, normalizeCustomerPhone, readSavedCustomer, savedCustomerForPhone, saveCustomerLocally } from '@/lib/customers';
import { canCalculateDelivery, isCurrentDeliveryQuote, type DeliveryDistanceQuote } from '@/lib/delivery-distance';
import { queryDelivery } from '@/lib/delivery-api';
import { isOfflineCheckoutMethod, OFFLINE_CHECKOUT_METHODS, type OfflineCheckoutMethod } from '@/lib/payment-labels';
import { DistanceAddressFields } from './DistanceAddressFields';

interface Product {
  id: string; name: string; description: string; price: number; category_id: string;
  image_url?: string; is_active: boolean; display_order: number;
}
interface Restaurant {
  id: string; name: string; whatsapp: string; slug: string; delivery_enabled?: boolean; pickup_enabled?: boolean;
}
interface DeliveryAddress {
  street: string; number: string; complement: string; neighborhood: string; phone: string; name: string;
  deliveryZoneId?: string; cep?: string; city?: string; state?: string; distanceQuote?: DeliveryDistanceQuote;
}
interface DeliveryZone { id: string; neighborhood: string; delivery_fee: number; is_active: boolean }
type CheckoutPayment = 'pix_online' | OfflineCheckoutMethod;
interface PaymentMethod { type: CheckoutPayment }
interface OrderConfirmationModalProps {
  open: boolean; onOpenChange: (open: boolean) => void;
  cart: { [key: string]: { quantity: number; addons: any[]; unitPrice: number; observations?: string } };
  products: Product[]; restaurant: Restaurant | null;
  onUpdateQuantity: (cartKey: string, newQuantity: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onSendWhatsApp: (address?: DeliveryAddress, payment?: PaymentMethod, deliveryFee?: number) => Promise<boolean>;
  getCartTotal: () => number;
}
const emptyAddress: DeliveryAddress = { street: '', number: '', complement: '', neighborhood: '', phone: '', name: '', cep: '', city: '', state: '', deliveryZoneId: '' };

export function OrderConfirmationModal({ open, onOpenChange, cart, products, restaurant,
  onUpdateQuantity, onRemoveItem, onSendWhatsApp, getCartTotal }: OrderConfirmationModalProps) {
  const [step, setStep] = useState(1);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [address, setAddress] = useState<DeliveryAddress>(emptyAddress);
  const [quoteResult, setQuoteResult] = useState<{ key: string; quote: DeliveryDistanceQuote }>();
  const [quoting, setQuoting] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [payment, setPayment] = useState<CheckoutPayment>('pix_online');
  const [clock, setClock] = useState(Date.now());
  const deliveryEnabled = restaurant?.delivery_enabled ?? true;
  const pickupEnabled = restaurant?.pickup_enabled ?? true;
  const restaurantId = restaurant?.id;
  const entries = Object.entries(cart);
  const deliveryMode = useQuery({
    queryKey: ['delivery-distance-mode', restaurantId], enabled: open && deliveryEnabled && Boolean(restaurantId), staleTime: 0,
    queryFn: async () => {
      if (!restaurantId) throw new Error('Loja não encontrada.');
      const { data, error } = await supabase.rpc('delivery_uses_distance', { _restaurant_id: restaurantId });
      if (error) throw error;
      return data;
    },
  });
  const zones = useQuery({
    queryKey: ['checkout-delivery-zones', restaurantId], enabled: open && deliveryMode.data === false && Boolean(restaurantId),
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase.from('delivery_zones').select('id,neighborhood,delivery_fee,is_active')
        .eq('restaurant_id', restaurantId).eq('is_active', true).order('neighborhood');
      if (error) throw error;
      return data as DeliveryZone[];
    },
  });
  const paymentMethods = useQuery({
    queryKey: ['public-checkout-payments', restaurantId],
    enabled: open && Boolean(restaurantId),
    queryFn: async ({ signal }) => {
      if (!restaurantId) return [];
      const { data, error } = await supabase.rpc('get_public_payment_methods', { _restaurant_id: restaurantId }).abortSignal(signal);
      if (error) throw error;
      return (data ?? []).filter(method => method.is_active).map(method => method.method_type);
    },
  });
  const offlineOptions = OFFLINE_CHECKOUT_METHODS.filter(option => paymentMethods.data?.includes(option.type));
  const paymentAvailable = payment === 'pix_online' ||
    (paymentMethods.isSuccess && !paymentMethods.isFetching && offlineOptions.some(option => option.type === payment));
  const usesDistance = deliveryMode.data === true;
  const quoteKey = JSON.stringify([restaurantId, address.street, address.number, address.complement, address.neighborhood, address.cep, address.city, address.state]);
  const latest = useRef({ quoteKey, open });
  latest.current = { quoteKey, open };
  const currentQuote = quoteResult?.key === quoteKey && isCurrentDeliveryQuote(quoteResult.quote, clock) ? quoteResult.quote : undefined;
  const selectedZone = zones.data?.find(zone => zone.id === address.deliveryZoneId);
  const deliveryFee = orderType === 'pickup' ? 0 : usesDistance ? currentQuote?.fee ?? 0 : selectedZone?.delivery_fee ?? 0;
  const contactValid = Boolean(address.name.trim() && normalizeCustomerPhone(address.phone));
  const addressValid = orderType === 'pickup' || (deliveryMode.isSuccess && !deliveryMode.isFetching &&
    (usesDistance ? canCalculateDelivery(address) : Boolean(address.street.trim() && address.number.trim() && selectedZone)));
  const ready = contactValid && addressValid && (orderType === 'pickup' || !usesDistance || Boolean(currentQuote));

  useEffect(() => {
    if (!open || !restaurantId) return;
    const saved = readSavedCustomer(restaurantId);
    setAddress({ ...emptyAddress, phone: saved ? maskCustomerPhone(saved.phone) : '' });
    setStep(1); setQuoteResult(undefined); setError(''); setQuoting(false); setSending(false);
    setPayment('pix_online');
    setOrderType(deliveryEnabled ? 'delivery' : 'pickup');
  }, [open, restaurantId, deliveryEnabled]);
  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  function patchAddress(patch: Partial<DeliveryAddress>) {
    setAddress(previous => ({ ...previous, ...patch }));
    setError('');
  }
  function continuePhone() {
    if (!restaurantId || !normalizeCustomerPhone(address.phone)) return;
    const saved = savedCustomerForPhone(readSavedCustomer(restaurantId), address.phone);
    setAddress(previous => ({ ...emptyAddress, phone: previous.phone, ...(saved ? {
      name: saved.name, street: saved.address, number: saved.number, complement: saved.complement,
      neighborhood: saved.neighborhood, city: saved.city ?? '', state: saved.state ?? '', cep: saved.cep ?? '',
      deliveryZoneId: zones.data?.find(zone => zone.neighborhood === saved.neighborhood)?.id ?? '',
    } : {}) }));
    setQuoteResult(undefined); setError(''); setStep(2);
  }
  async function continueAddress() {
    if (!contactValid || !addressValid || quoting) return;
    if (orderType === 'pickup' || !usesDistance) { setStep(3); return; }
    if (!restaurantId) return;
    setQuoting(true); setQuoteResult(undefined); setError('');
    const key = quoteKey;
    try {
      const quote = await queryDelivery<DeliveryDistanceQuote>(restaurantId, { action: 'quote',
        street: address.street.trim(), number: address.number.trim(), complement: address.complement.trim(),
        neighborhood: address.neighborhood.trim(), city: address.city?.trim(), state: address.state, cep: address.cep ?? '',
      });
      if (latest.current.quoteKey !== key || !latest.current.open) return;
      if (!isCurrentDeliveryQuote(quote)) throw new Error('O cálculo não retornou uma entrega válida. Tente novamente.');
      setClock(Date.now()); setQuoteResult({ key, quote }); setStep(3);
    } catch (error) {
      if (latest.current.quoteKey === key && latest.current.open) setError(error instanceof Error ? error.message : 'Não foi possível calcular a entrega.');
    } finally { setQuoting(false); }
  }
  async function sendOrder() {
    if (!ready || !paymentAvailable || sending || !restaurantId || !entries.length) return;
    if (orderType === 'delivery' && usesDistance && !isCurrentDeliveryQuote(currentQuote)) {
      setQuoteResult(undefined); setStep(2); setError('O cálculo expirou. Confirme o endereço novamente.'); return;
    }
    const deliveryAddress = orderType === 'delivery' ? { ...address, distanceQuote: usesDistance ? currentQuote : undefined }
      : { ...address, street: '', number: '', complement: '', neighborhood: '', deliveryZoneId: '', cep: '', city: '', state: '' };
    setSending(true); setError('');
    try {
      const success = await onSendWhatsApp(deliveryAddress, { type: payment }, deliveryFee);
      if (!success) {
        if (usesDistance && orderType === 'delivery') { setQuoteResult(undefined); setStep(2); }
        if (payment !== 'pix_online') void paymentMethods.refetch();
        setError('Não foi possível registrar o pedido. Confira a entrega e a forma de pagamento.'); return;
      }
      const previous = savedCustomerForPhone(readSavedCustomer(restaurantId), address.phone);
      const savedAddress = orderType === 'delivery' ? address : {
        ...address, street: previous?.address ?? '', number: previous?.number ?? '', complement: previous?.complement ?? '',
        neighborhood: previous?.neighborhood ?? '', city: previous?.city ?? '', state: previous?.state ?? '', cep: previous?.cep ?? '',
      };
      saveCustomerLocally(restaurantId, { name: address.name.trim(), phone: address.phone, address: savedAddress.street,
        number: savedAddress.number, complement: savedAddress.complement, neighborhood: savedAddress.neighborhood,
        city: savedAddress.city, state: savedAddress.state, cep: savedAddress.cep });
      onOpenChange(false);
    } catch { setError('Não foi possível finalizar o pedido. Tente novamente.'); }
    finally { setSending(false); }
  }

  return <Dialog open={open} onOpenChange={value => { if (!sending) onOpenChange(value); }}>
    <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[90dvh] p-0 gap-0 flex flex-col" aria-describedby="checkout-description">
      <DialogHeader className="px-4 sm:px-6 pt-5 pb-4 border-b shrink-0">
        <DialogTitle className="text-lg break-words">Seu pedido · {restaurant?.name}</DialogTitle>
        <DialogDescription id="checkout-description">{step === 1 ? 'Qual é o seu telefone?' : step === 2 ? 'Confirme seus dados' : 'Revise seu pedido'}</DialogDescription>
        <ol className="flex items-center gap-2 pt-3 text-xs sm:text-sm" aria-label="Etapas do pedido">
          {['Telefone', 'Entrega', 'Pagamento'].map((label, index) => <li key={label} aria-current={step === index + 1 ? 'step' : undefined}
            className={`flex-1 flex items-center gap-2 ${step === index + 1 ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
            <span className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center border ${step > index + 1 ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>
              {step > index + 1 ? <Check className="h-3 w-3" /> : index + 1}</span><span>{label}</span>
          </li>)}
        </ol>
      </DialogHeader>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
        {step === 1 && <div className="space-y-3">
          <Label htmlFor="checkout-phone">Telefone com DDD *</Label>
          <Input id="checkout-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999" maxLength={16}
            value={address.phone} onChange={e => patchAddress({ phone: maskCustomerPhone(e.target.value) })}
            onKeyDown={e => { if (e.key === 'Enter') continuePhone(); }} />
        </div>}
        {step === 2 && <>
          {deliveryEnabled && pickupEnabled && <RadioGroup value={orderType} onValueChange={value => {
            setOrderType(value === 'delivery' ? 'delivery' : 'pickup'); setQuoteResult(undefined); setError('');
          }} className="flex flex-wrap gap-5">
            <div className="flex items-center gap-2"><RadioGroupItem id="checkout-delivery" value="delivery" /><Label htmlFor="checkout-delivery" className="flex items-center gap-2"><Truck className="h-4 w-4" />Entrega</Label></div>
            <div className="flex items-center gap-2"><RadioGroupItem id="checkout-pickup" value="pickup" /><Label htmlFor="checkout-pickup" className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" />Retirada</Label></div>
          </RadioGroup>}
          <div className="space-y-2"><Label htmlFor="checkout-name">Nome *</Label><Input id="checkout-name" autoComplete="name" maxLength={100} value={address.name} onChange={e => patchAddress({ name: e.target.value })} /></div>
          {orderType === 'delivery' && <>
            {deliveryMode.isPending && <p role="status">Carregando área de entrega...</p>}
            {deliveryMode.isError && <div className="space-y-2"><p role="alert" className="text-destructive">Não foi possível carregar a área de entrega.</p><Button variant="outline" onClick={() => void deliveryMode.refetch()}>Tentar novamente</Button></div>}
            {usesDistance && restaurantId && <DistanceAddressFields restaurantId={restaurantId} value={address} onChange={patchAddress} disabled={quoting} />}
            {deliveryMode.isSuccess && !usesDistance && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 space-y-2"><Label htmlFor="checkout-street">Rua *</Label><Input id="checkout-street" maxLength={300} value={address.street} onChange={e => patchAddress({ street: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="checkout-number">Número *</Label><Input id="checkout-number" maxLength={30} value={address.number} onChange={e => patchAddress({ number: e.target.value })} /></div>
              <div className="space-y-2"><Label htmlFor="checkout-complement">Complemento</Label><Input id="checkout-complement" maxLength={100} value={address.complement} onChange={e => patchAddress({ complement: e.target.value })} /></div>
              <div className="sm:col-span-2 space-y-2"><Label htmlFor="checkout-zone">Bairro *</Label>
                <Select value={address.deliveryZoneId} onValueChange={id => patchAddress({ deliveryZoneId: id, neighborhood: zones.data?.find(zone => zone.id === id)?.neighborhood ?? '' })}>
                  <SelectTrigger id="checkout-zone"><SelectValue placeholder="Selecione seu bairro" /></SelectTrigger>
                  <SelectContent>{zones.data?.map(zone => <SelectItem key={zone.id} value={zone.id}>{zone.neighborhood} · R$ {numberToCurrency(zone.delivery_fee)}</SelectItem>)}</SelectContent>
                </Select>
                {zones.isPending && <p role="status">Carregando bairros...</p>}
                {zones.isError && <Button variant="outline" onClick={() => void zones.refetch()}>Carregar bairros novamente</Button>}
                {zones.isSuccess && !zones.data?.length && <p role="alert" className="text-destructive">A loja ainda não cadastrou bairros para entrega.</p>}
              </div>
            </div>}
          </>}
          {orderType === 'pickup' && <p className="text-sm text-muted-foreground">Retirada na loja · Sem taxa de entrega</p>}
        </>}
        {step === 3 && <>
          <div className="space-y-1 text-sm border-b pb-4">
            <p className="font-semibold">{address.name} · {maskCustomerPhone(address.phone)}</p>
            <p className="text-muted-foreground break-words">{orderType === 'pickup' ? 'Retirada na loja' : currentQuote?.address ?? `${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ''}, ${address.neighborhood}`}</p>
          </div>
          <div className="divide-y">
            {entries.map(([key, item]) => {
              const product = products.find(product => product.id === key.slice(0, 36));
              if (!product) return null;
              return <div key={key} className="py-4 space-y-2">
                <div className="flex justify-between gap-3"><h3 className="font-semibold min-w-0 break-words">{product.name}</h3>
                  <Button variant="ghost" size="icon" aria-label={`Remover ${product.name}`} className="shrink-0 text-destructive" disabled={sending} onClick={() => onRemoveItem(key)}><Trash2 className="h-4 w-4" /></Button></div>
                {item.addons?.length > 0 && <div className="flex flex-wrap gap-1">{item.addons.map((addon, index) => <Badge key={index} variant="secondary">{addon.option?.name}</Badge>)}</div>}
                {item.observations && <p className="text-sm text-muted-foreground break-words">{item.observations}</p>}
                <div className="flex justify-between items-center gap-2"><div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" aria-label={`Diminuir ${product.name}`} disabled={sending} className="h-8 w-8" onClick={() => item.quantity > 1 ? onUpdateQuantity(key, item.quantity - 1) : onRemoveItem(key)}><Minus className="h-4 w-4" /></Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button variant="outline" size="icon" aria-label={`Aumentar ${product.name}`} disabled={sending} className="h-8 w-8" onClick={() => onUpdateQuantity(key, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                </div><span className="font-semibold">R$ {numberToCurrency(item.unitPrice * item.quantity)}</span></div>
              </div>;
            })}
          </div>
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between"><span>Subtotal</span><span>R$ {numberToCurrency(getCartTotal())}</span></div>
            <div className="flex justify-between gap-3"><span>Entrega{currentQuote ? ` · ${(currentQuote.meters / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} km` : ''}</span><span>{orderType === 'pickup' ? 'Retirada' : usesDistance && !currentQuote ? 'Recalcular' : `R$ ${numberToCurrency(deliveryFee)}`}</span></div>
            <div className="flex justify-between text-lg font-bold border-t pt-3"><span>Total</span><span>{usesDistance && orderType === 'delivery' && !currentQuote ? '—' : `R$ ${numberToCurrency(getCartTotal() + deliveryFee)}`}</span></div>
          </div>
          {usesDistance && orderType === 'delivery' && !currentQuote && <div className="space-y-2"><p role="alert" className="text-destructive text-sm">O cálculo da entrega expirou.</p><Button variant="outline" onClick={() => setStep(2)}>Recalcular entrega</Button></div>}
          <fieldset disabled={sending} className="space-y-2">
            <legend className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <CreditCard className="size-5 text-primary" aria-hidden="true" /> Forma de pagamento
            </legend>
            <RadioGroup value={payment} onValueChange={value => {
              if (value === 'pix_online' || isOfflineCheckoutMethod(value)) {
                setPayment(value);
                setError('');
              }
            }}>
              <Label htmlFor="checkout-payment-pix" className="flex items-center gap-3 rounded-lg border p-3">
                <RadioGroupItem id="checkout-payment-pix" value="pix_online" /> Pix Online · QR Code
              </Label>
              {offlineOptions.map(option => (
                <Label htmlFor={`checkout-payment-${option.type}`} key={option.type} className="flex items-center gap-3 rounded-lg border p-3">
                  <RadioGroupItem id={`checkout-payment-${option.type}`} value={option.type}
                    disabled={paymentMethods.isFetching || paymentMethods.isError} /> {option.label}
                </Label>
              ))}
            </RadioGroup>
            {offlineOptions.length > 0 && (
              <p className="text-xs text-muted-foreground">Cartões e vales são cobrados pela loja na entrega ou retirada.</p>
            )}
            {paymentMethods.isPending && <p role="status" className="text-sm text-muted-foreground">Carregando outras opções...</p>}
            {paymentMethods.isError && (
              <div className="flex flex-wrap items-center gap-2">
                <p role="alert" className="text-sm text-muted-foreground">Não foi possível carregar as outras opções.</p>
                <Button type="button" size="sm" variant="outline" onClick={() => void paymentMethods.refetch()}>Tentar novamente</Button>
              </div>
            )}
            {!paymentAvailable && !paymentMethods.isFetching && !paymentMethods.isError && (
              <p role="alert" className="text-sm text-destructive">Essa opção foi desativada. Selecione outra forma de pagamento.</p>
            )}
          </fieldset>
        </>}
        {!deliveryEnabled && !pickupEnabled && <p role="alert" className="text-destructive">Esta loja não oferece entrega nem retirada no momento.</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-col sm:flex-row gap-2 border-t pt-4">
          <Button variant="outline" disabled={sending || quoting} className="sm:flex-1" onClick={() => {
            if (step === 1) onOpenChange(false); else { setStep(step - 1); setError(''); }
          }}>{step === 1 ? 'Continuar comprando' : <><ArrowLeft className="h-4 w-4 mr-2" />Voltar</>}</Button>
          <Button className="sm:flex-1" disabled={sending || quoting || !entries.length || (!deliveryEnabled && !pickupEnabled) ||
            (step === 1 ? !normalizeCustomerPhone(address.phone) : step === 2 ? !contactValid || !addressValid : !ready || !paymentAvailable)}
            onClick={() => step === 1 ? continuePhone() : step === 2 ? void continueAddress() : void sendOrder()}>
            {sending || quoting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ArrowRight className="h-4 w-4 mr-2" />}
            {sending ? 'Registrando...' : quoting ? 'Calculando entrega...' : step === 3 ? (payment === 'pix_online' ? 'Finalizar e pagar com Pix' : 'Finalizar pedido') : step === 2 && orderType === 'delivery' && usesDistance ? 'Confirmar e calcular entrega' : 'Continuar'}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}

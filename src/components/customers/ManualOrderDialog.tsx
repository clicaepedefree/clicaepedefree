import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ImageOff, Minus, Plus, Search, ShoppingBag, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ProductAddonSelector, type AddonSelection } from '@/components/menu/ProductAddonSelector';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { COUNTER_CUSTOMER_NAME, type Customer, maskCustomerPhone, money, normalizeCustomerPhone } from '@/lib/customers';
import { queryDelivery } from '@/lib/delivery-api';
import { isCurrentDeliveryQuote, type DeliveryDistanceQuote } from '@/lib/delivery-distance';
import { CustomerDialog } from './CustomerDialog';

const blankCustomer = { name: '', phone: '', address: '', number: '', complement: '', neighborhood: '' };
const fields = {
  name: 'Nome *',
  phone: 'Telefone *',
  address: 'Endereço *',
  number: 'Número *',
  complement: 'Complemento',
  neighborhood: 'Bairro',
} as const;
const customerFields = Object.keys(fields) as (keyof typeof fields)[];

type Product = { id: string; name: string; price: number; image_url: string | null; category_id: string };
type OrderLine = {
  key: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  addons: AddonSelection[];
  observations: string | null;
};

interface ManualOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  onCreated: () => void;
}

function normalizeSearch(term: string) {
  return term.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
}

export function ManualOrderDialog({ open, onOpenChange, restaurantId, onCreated }: ManualOrderDialogProps) {
  const [customerTerm, setCustomerTerm] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState(blankCustomer);
  const [type, setType] = useState<'delivery' | 'counter'>('delivery');
  const [productTerm, setProductTerm] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [quoteAddressKey, setQuoteAddressKey] = useState('');
  const [expiredQuoteId, setExpiredQuoteId] = useState<string>();
  const [payment, setPayment] = useState('cash');
  const [newCustomer, setNewCustomer] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerTerm('');
    setCustomerId(null);
    setForm(blankCustomer);
    setType('delivery');
    setProductTerm('');
    setCategoryId('');
    setSelectedProduct(null);
    setLines([]);
    setCity('');
    setState('');
    setQuoteAddressKey('');
    setExpiredQuoteId(undefined);
    setPayment('cash');
    setNewCustomer(false);
  }, [open]);

  const catalog = useQuery({
    queryKey: ['manual-order-catalog', restaurantId],
    enabled: open,
    queryFn: async () => {
      const [products, categories] = await Promise.all([
        supabase.from('products').select('id,name,price,image_url,category_id')
          .eq('restaurant_id', restaurantId).eq('is_active', true).order('name').limit(1000),
        supabase.from('categories').select('id,name').eq('restaurant_id', restaurantId)
          .order('display_order').order('name'),
      ]);
      if (products.error) throw products.error;
      if (categories.error) throw categories.error;
      return { products: products.data, categories: categories.data };
    },
  });

  const customerSearch = customerTerm.trim();
  const matches = useQuery({
    queryKey: ['customer-search', restaurantId, customerSearch],
    enabled: open && type === 'delivery' && customerSearch.length >= 2 && !customerId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('crm_customers', { _restaurant_id: restaurantId, _search: customerSearch });
      if (error) throw error;
      return (data ?? []).slice(0, 6);
    },
  });

  const chooseCustomer = (customer: Customer) => {
    setCity('');
    setState('');
    setCustomerId(customer.id);
    setCustomerTerm(customer.name);
    setForm({
      name: customer.name,
      phone: maskCustomerPhone(customer.phone),
      address: customer.address,
      number: customer.number,
      complement: customer.complement || '',
      neighborhood: customer.neighborhood || '',
    });
  };

  const search = normalizeSearch(productTerm);
  const products = (catalog.data?.products ?? []).filter(product =>
    (!categoryId || product.category_id === categoryId) && normalizeSearch(product.name).includes(search));
  const displayCategories = (catalog.data?.categories ?? []).filter(category =>
    catalog.data?.products.some(product => product.category_id === category.id));

  const addProduct = (product: Pick<Product, 'id' | 'name'>, addons: AddonSelection[], price: number, observation?: string) => {
    const unitPrice = Math.round(price * 100) / 100;
    const observations = observation?.trim() || null;
    const key = JSON.stringify([product.id, addons.map(addon => [addon.group.id, addon.option.id]).sort(), unitPrice, observations]);
    setLines(previous => {
      const existing = previous.find(line => line.key === key);
      if (existing) {
        return previous.map(line => line.key === key ? { ...line, quantity: Math.min(100, line.quantity + 1) } : line);
      }
      return [...previous, {
        key, productId: product.id, productName: product.name, quantity: 1, unitPrice, addons, observations,
      }];
    });
  };

  const changeQuantity = (key: string, delta: number) => {
    setLines(previous => previous
      .map(line => line.key === key ? { ...line, quantity: Math.min(100, line.quantity + delta) } : line)
      .filter(line => line.quantity > 0));
  };

  const subtotal = lines.reduce((total, line) => total + Math.round(line.unitPrice * 100) * line.quantity, 0) / 100;
  const calculatingDelivery = open && type === 'delivery';
  const deliveryMode = useQuery({
    queryKey: ['delivery-distance-mode', restaurantId],
    enabled: calculatingDelivery,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('delivery_uses_distance', { _restaurant_id: restaurantId });
      if (error) throw error;
      return data;
    },
  });
  const usesDistance = deliveryMode.data === true;
  const zones = useQuery({
    queryKey: ['manual-delivery-zones', restaurantId],
    enabled: calculatingDelivery && deliveryMode.data === false,
    queryFn: async () => {
      const { data, error } = await supabase.from('delivery_zones').select('id,neighborhood,delivery_fee')
        .eq('restaurant_id', restaurantId).eq('is_active', true).order('neighborhood').order('id');
      if (error) throw error;
      return data;
    },
  });
  const details = {
    street: form.address.trim(),
    number: form.number.trim(),
    complement: form.complement.trim(),
    neighborhood: form.neighborhood.trim(),
  };
  const hasAddress = Boolean(details.street && details.number);
  const neighborhood = normalizeSearch(details.neighborhood);
  const zone = neighborhood
    ? zones.data?.find(item => normalizeSearch(item.neighborhood) === neighborhood)
    : undefined;
  const manualQuoteAddress = { ...details, city: city.trim(), state: state.trim().toUpperCase() };
  const validNumber = /^\d+[a-z]?(?:[-/]\d+[a-z]?)?$/i.test(details.number);
  const validCity = Boolean(manualQuoteAddress.city) === Boolean(manualQuoteAddress.state)
    && /^(?:[A-Z]{2})?$/.test(manualQuoteAddress.state);
  const addressKey = calculatingDelivery && usesDistance && hasAddress && validNumber && validCity
    ? JSON.stringify(manualQuoteAddress) : '';
  useEffect(() => {
    if (!addressKey) return;
    const timer = window.setTimeout(() => setQuoteAddressKey(addressKey), 600);
    return () => window.clearTimeout(timer);
  }, [addressKey]);

  const canQuote = Boolean(addressKey && addressKey === quoteAddressKey);
  const quoteQuery = useQuery({
    queryKey: ['manual-delivery-quote', restaurantId, canQuote ? quoteAddressKey : ''],
    enabled: canQuote,
    gcTime: 0,
    staleTime: Infinity,
    retry: false,
    queryFn: async () => {
      const result = await queryDelivery<DeliveryDistanceQuote>(restaurantId, { action: 'manual_quote', ...manualQuoteAddress });
      if (!isCurrentDeliveryQuote(result)) throw new Error('Não foi possível obter uma cotação válida.');
      return result;
    },
  });
  const quote = canQuote ? quoteQuery.data : undefined;
  useEffect(() => {
    if (!quote) return;
    const timer = window.setTimeout(() => setExpiredQuoteId(quote.id), Math.max(0, Date.parse(quote.expiresAt) - Date.now()));
    return () => window.clearTimeout(timer);
  }, [quote]);
  const currentQuote = quote && quote.id !== expiredQuoteId && !quoteQuery.isFetching && isCurrentDeliveryQuote(quote)
    ? quote : undefined;
  const zoneFee = hasAddress && zone && zones.isSuccess && !zones.isFetching
    ? Math.round(zone.delivery_fee * 100) / 100 : undefined;
  const shownFee = type === 'counter' ? 0 : usesDistance ? currentQuote?.fee : zoneFee;
  const feeReady = shownFee !== undefined && deliveryMode.isSuccess && !deliveryMode.isFetching;
  const feeMessage = deliveryMode.isError || (!usesDistance && zones.isError) ? 'Não foi possível consultar as regras de entrega.'
    : !hasAddress ? 'Informe rua e número para calcular.'
    : deliveryMode.isFetching ? 'Consultando regras de entrega...'
    : usesDistance && !validNumber ? 'Informe um número válido para calcular por distância.'
    : usesDistance && !validCity ? 'Informe a cidade e a UF ou deixe os dois campos vazios.'
    : usesDistance && canQuote && quoteQuery.isError ? quoteQuery.error.message
    : usesDistance && quote && !quoteQuery.isFetching ? 'A cotação expirou.'
    : !usesDistance && zones.isSuccess && !zones.isFetching ? (details.neighborhood
      ? 'Este bairro está fora da área de entrega da loja.' : 'Informe o bairro para calcular.')
    : 'Calculando a taxa...';
  const retryFee = deliveryMode.isError ? () => void deliveryMode.refetch()
    : usesDistance && canQuote && (quoteQuery.isError || (quote && expiredQuoteId === quote.id)) ? () => void quoteQuery.refetch()
    : zones.isError ? () => void zones.refetch() : undefined;

  const submit = async () => {
    if (busy || lines.length === 0) return;
    if (type === 'delivery' && (!form.name.trim() || !normalizeCustomerPhone(form.phone))) {
      toast.error('Informe nome e telefone válidos.');
      return;
    }
    if (type === 'delivery' && (!form.address.trim() || !form.number.trim())) {
      toast.error('Informe endereço e número para entrega.');
      return;
    }
    if (type === 'delivery' && (!feeReady || shownFee === undefined)) return;
    if (type === 'delivery' && usesDistance && !isCurrentDeliveryQuote(quote)) {
      void quoteQuery.refetch();
      return;
    }
    const orderDetails = quote
      ? { ...quote.details, delivery_quote_id: quote.id }
      : { ...details, neighborhood: zone?.neighborhood ?? details.neighborhood, delivery_zone_id: zone?.id };
    const address = quote?.address
      ?? `${details.street}, ${details.number}${details.complement ? ` - ${details.complement}` : ''}, ${orderDetails.neighborhood}`;
    const items = lines.map(({ key, ...line }) => ({
      ...line,
      addons: line.addons.map(({ option, group }) => ({ option: { ...option }, group: { ...group } })),
      total: Math.round(line.unitPrice * 100) * line.quantity / 100,
    }));
    setBusy(true);
    try {
      const order = {
        _restaurant_id: restaurantId,
        _items: items,
        _payment_method: payment,
      };
      const { error } = type === 'counter'
        ? await supabase.rpc('create_manual_counter_order', order)
        : await supabase.rpc('create_manual_order', {
            ...order,
            _customer_id: customerId as string,
            _name: form.name.trim(),
            _phone: form.phone,
            _details: orderDetails,
            _delivery_fee: shownFee ?? 0,
            _address: address,
          });
      if (error) {
        if (type === 'delivery' && /cotação|área de entrega|taxa de entrega|disponível para entrega/i.test(error.message)) {
          toast.error(error.message);
          void deliveryMode.refetch();
          if (usesDistance) void quoteQuery.refetch();
          else void zones.refetch();
          return;
        }
        toast.error(error.message.includes('incompatível')
          ? 'O telefone difere do cadastro selecionado. Remova a seleção ou corrija o telefone.'
          : 'Não foi possível lançar o pedido.');
        return;
      }
      toast.success(type === 'counter' ? 'Pedido de balcão lançado' : 'Pedido lançado e vinculado ao cliente');
      onCreated();
      onOpenChange(false);
    } catch {
      toast.error('Não foi possível lançar o pedido.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}>
        <DialogContent className="flex h-[100dvh] w-full max-w-[1440px] flex-col gap-0 overflow-hidden p-0 sm:h-[94dvh] sm:w-[96vw]">
          <DialogHeader className="border-b px-4 py-4 pr-12 text-left sm:px-6">
            <DialogTitle className="text-xl">Lançar pedido</DialogTitle>
            <DialogDescription>Monte o pedido e confira o total antes de finalizar.</DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] lg:overflow-hidden">
            <section aria-label="Catálogo de produtos" className="flex min-h-0 flex-col bg-muted/30 lg:border-r">
              <div className="space-y-3 border-b px-4 py-4 sm:px-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input aria-label="Buscar produto" placeholder="Buscar produto pelo nome" className="bg-background pl-9"
                    value={productTerm} onChange={event => setProductTerm(event.target.value)} />
                </div>
                {displayCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2" aria-label="Categorias de produtos">
                    {[{ id: '', name: 'Todas' }, ...displayCategories].map(category => (
                      <Button key={category.id} type="button" size="sm"
                        variant={categoryId === category.id ? 'default' : 'outline'}
                        aria-pressed={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
                        {category.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
              <div className="max-h-[44dvh] min-h-0 overflow-y-auto p-4 sm:p-6 lg:max-h-none lg:flex-1">
                {catalog.isPending && <p role="status" className="text-sm text-muted-foreground">Carregando produtos...</p>}
                {catalog.isError && (
                  <div className="space-y-2">
                    <p role="alert" className="text-sm text-destructive">Não foi possível carregar o catálogo.</p>
                    <Button variant="outline" onClick={() => void catalog.refetch()}>Tentar novamente</Button>
                  </div>
                )}
                {catalog.isSuccess && products.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">Nenhum produto encontrado.</p>
                )}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))]">
                  {products.map(product => (
                    <button type="button" key={product.id} onClick={() => setSelectedProduct(product)} disabled={busy}
                      className="group flex min-w-0 flex-col overflow-hidden rounded-xl border bg-card text-left shadow-sm transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">
                      <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted text-muted-foreground">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                        ) : <ImageOff className="h-6 w-6" aria-hidden="true" />}
                      </div>
                      <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                        <span className="break-words text-sm font-semibold leading-tight">{product.name}</span>
                        <span className="flex items-center justify-between gap-1 text-sm font-semibold text-primary">
                          {money(Number(product.price))}
                          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <aside aria-label="Resumo do pedido" className="flex min-h-0 flex-col">
              <div className="min-h-0 space-y-5 p-4 sm:p-5 lg:flex-1 lg:overflow-y-auto">
                <section className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="manual-type">Modalidade</Label>
                    <Select value={type} disabled={busy} onValueChange={(value: 'delivery' | 'counter') => setType(value)}>
                      <SelectTrigger id="manual-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="counter">PDV Balcão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {type === 'counter' ? (
                    <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                      Cliente da venda: <strong>{COUNTER_CUSTOMER_NAME}</strong>
                    </p>
                  ) : <>
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="customer-search">Cliente</Label>
                    <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setNewCustomer(true)}>
                      <UserPlus className="h-4 w-4" /> Novo cliente
                    </Button>
                  </div>
                  <div className="relative">
                    <Input id="customer-search" placeholder="Buscar por nome ou telefone" value={customerTerm} maxLength={100} disabled={busy}
                      onChange={event => { setCustomerTerm(event.target.value); setCustomerId(null); }} />
                    {!customerId && !!matches.data?.length && (
                      <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
                        {matches.data.map(customer => (
                          <button type="button" key={customer.id} className="block w-full px-3 py-2 text-left text-sm hover:bg-muted" disabled={busy}
                            onClick={() => chooseCustomer(customer)}>
                            {customer.name}
                            <span className="block text-xs text-muted-foreground">{customer.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {customerFields.map(field => (
                      <div key={field} className={field === 'address' ? 'col-span-2 space-y-1' : 'space-y-1'}>
                        <Label htmlFor={`manual-${field}`}>{fields[field]}</Label>
                        <Input id={`manual-${field}`} value={form[field]} disabled={busy} maxLength={field === 'address' ? 300 : 100}
                          type={field === 'phone' ? 'tel' : 'text'}
                          onChange={event => setForm(previous => ({
                            ...previous,
                            [field]: field === 'phone' ? maskCustomerPhone(event.target.value) : event.target.value,
                          }))} />
                      </div>
                    ))}
                    {usesDistance && (
                      <>
                        <div className="space-y-1">
                          <Label htmlFor="manual-city">Cidade</Label>
                          <Input id="manual-city" placeholder="Cidade da loja" value={city} maxLength={80} disabled={busy}
                            onChange={event => setCity(event.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="manual-state">UF</Label>
                          <Input id="manual-state" placeholder="UF da loja" value={state} maxLength={2} disabled={busy}
                            onChange={event => setState(event.target.value.toUpperCase())} />
                        </div>
                      </>
                    )}
                  </div>
                  </>}
                </section>

                <section className="space-y-2" aria-labelledby="manual-order-items">
                  <h3 id="manual-order-items" className="text-sm font-semibold">Itens do pedido</h3>
                  {lines.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                      <ShoppingBag className="h-5 w-5" aria-hidden="true" /> Nenhum item adicionado
                    </div>
                  ) : (
                    <ul className="divide-y rounded-lg border">
                      {lines.map(line => (
                        <li key={line.key} className="space-y-2 p-3">
                          <div className="flex justify-between gap-3 text-sm font-semibold">
                            <span className="min-w-0 break-words">{line.productName}</span>
                            <span className="shrink-0">{money(line.unitPrice * line.quantity)}</span>
                          </div>
                          {line.addons.length > 0 && (
                            <p className="text-xs text-muted-foreground">{line.addons.map(addon => addon.option.name).join(' · ')}</p>
                          )}
                          {line.observations && <p className="break-words text-xs text-muted-foreground">Obs. {line.observations}</p>}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                                aria-label={`Diminuir ${line.productName}`} disabled={busy} onClick={() => changeQuantity(line.key, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="min-w-5 text-center text-sm tabular-nums">{line.quantity}</span>
                              <Button type="button" size="icon" variant="outline" className="h-7 w-7"
                                aria-label={`Aumentar ${line.productName}`} disabled={busy || line.quantity >= 100} onClick={() => changeQuantity(line.key, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="text-xs text-muted-foreground">{money(line.unitPrice)} un.</span>
                            </div>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                              aria-label={`Remover ${line.productName}`} disabled={busy}
                              onClick={() => setLines(previous => previous.filter(item => item.key !== line.key))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="manual-payment">Pagamento</Label>
                    <Select value={payment} onValueChange={setPayment}>
                      <SelectTrigger id="manual-payment"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Dinheiro</SelectItem>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="credit_card">Cartão de crédito</SelectItem>
                        <SelectItem value="debit_card">Cartão de débito</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <footer className="space-y-3 border-t bg-background p-4 sm:p-5">
                <dl className="space-y-1 text-sm tabular-nums">
                  <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{money(subtotal)}</dd></div>
                  {type === 'delivery' && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Taxa de entrega</dt>
                      <dd aria-live="polite">{feeReady && shownFee !== undefined ? money(shownFee) : '—'}</dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 text-lg font-semibold">
                    <dt>Total</dt><dd aria-live="polite">{type === 'delivery' && !feeReady ? '—' : money(subtotal + (shownFee ?? 0))}</dd>
                  </div>
                </dl>
                {type === 'delivery' && !feeReady && (
                  <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <p role="status">{feeMessage}</p>
                    {retryFee && <Button type="button" variant="outline" size="sm" onClick={retryFee}>Recalcular</Button>}
                  </div>
                )}
                <Button className="w-full" onClick={submit} disabled={busy || lines.length === 0 || (type === 'delivery' && !feeReady)}>
                  {busy ? 'Salvando pedido...' : 'Finalizar pedido'}
                </Button>
              </footer>
            </aside>
          </div>
        </DialogContent>
      </Dialog>
      {open && selectedProduct && (
        <ProductAddonSelector key={selectedProduct.id} open pointOfSale
          product={{ ...selectedProduct, image_url: selectedProduct.image_url ?? undefined }}
          onOpenChange={value => { if (!value) setSelectedProduct(null); }} onAddToCart={addProduct} />
      )}
      <CustomerDialog open={open && type === 'delivery' && newCustomer} onOpenChange={setNewCustomer} restaurantId={restaurantId} onSaved={chooseCustomer} />
    </>
  );
}

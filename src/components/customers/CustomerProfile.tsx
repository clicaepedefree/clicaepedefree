import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ChevronRight, MapPin, Pencil, Phone, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Customer, dateLabel, maskCustomerPhone, money } from '@/lib/customers';

const statuses: Record<string, string> = {
  completed: 'Finalizado', cancelled: 'Cancelado', pending_payment: 'Aguardando pagamento',
  new: 'Novo', preparing: 'Preparando', delivered: 'Em entrega',
};

type OrderItem = {
  productName?: string;
  product_name?: string;
  name?: string;
  quantity?: number;
  total?: number;
  unitPrice?: number;
  observations?: string;
  addons?: { name?: string; option?: { name?: string } }[];
};

interface CustomerProfileProps {
  customer: Customer | null;
  restaurantId: string;
  onClose: () => void;
  restoreFocus: () => void;
  onEdit: (customer: Customer) => void;
}

function orderNumber(order: { id: string; order_number: number | null }) {
  return '#' + (order.order_number ? String(order.order_number).padStart(2, '0') : order.id.slice(-8));
}

export function CustomerProfile({ customer, restaurantId, onClose, restoreFocus, onEdit }: CustomerProfileProps) {
  const [page, setPage] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const customerId = customer?.id;
  const orders = useQuery({
    queryKey: ['customer-orders', restaurantId, customerId, page],
    enabled: Boolean(customerId),
    queryFn: async ({ signal }) => {
      const { data, error, count } = await supabase.from('orders').select('*', { count: 'exact' })
        .eq('restaurant_id', restaurantId).eq('customer_id', customerId!)
        .order('created_at', { ascending: false }).order('id').range(page * 20, page * 20 + 19).abortSignal(signal);
      if (error) throw error;
      return { data: data ?? [], count: count ?? 0 };
    },
  });
  const selected = orders.data?.data.find(order => order.id === orderId);
  const purchases = Number(customer?.purchases ?? 0);
  const total = Number(customer?.total_spent ?? 0);
  const address = [customer?.address, customer?.number, customer?.complement, customer?.neighborhood].filter(Boolean).join(', ');

  return (
    <Sheet open={Boolean(customer)} onOpenChange={open => {
      if (open) return;
      setPage(0);
      setOrderId(null);
      onClose();
    }}>
      <SheetContent className="flex w-full max-w-none flex-col gap-0 p-0 sm:max-w-xl" onCloseAutoFocus={event => {
        event.preventDefault();
        restoreFocus();
      }}>
        {customer && (
          <>
            <div className="min-w-0 space-y-1 border-b px-5 py-4 pr-12">
              {selected && (
                <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={() => setOrderId(null)}>
                  <ArrowLeft className="mr-2 size-4" aria-hidden="true" /> Voltar ao histórico
                </Button>
              )}
              <SheetTitle className="break-words">{selected ? `Pedido ${orderNumber(selected)}` : customer.name}</SheetTitle>
              <SheetDescription>
                {selected ? `${dateLabel(selected.created_at, true)} · ${statuses[selected.status] || selected.status}` : 'Perfil e histórico de pedidos'}
              </SheetDescription>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
              {selected ? (
                <>
                  <p className="flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="size-4 shrink-0" aria-hidden="true" />{selected.address || 'Retirada no local'}</p>
                  <section className="overflow-hidden rounded-xl border" aria-label="Itens do pedido">
                    {Array.isArray(selected.items) && selected.items.map((raw, index) => {
                      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
                      const item = raw as OrderItem;
                      const quantity = Number(item.quantity ?? 1);
                      const addons = item.addons?.map(addon => addon.option?.name ?? addon.name).filter(Boolean).join(', ');
                      return (
                        <div key={index} className="space-y-1 border-b p-3">
                          <div className="flex justify-between gap-3 text-sm font-medium">
                            <span className="min-w-0 break-words">{quantity}× {item.productName ?? item.product_name ?? item.name ?? 'Produto'}</span>
                            <span className="shrink-0 tabular-nums">{money(Number(item.total ?? (item.unitPrice ?? 0) * quantity))}</span>
                          </div>
                          {addons && <p className="break-words text-xs text-muted-foreground">{addons}</p>}
                          {item.observations && <p className="break-words text-xs text-muted-foreground">{item.observations}</p>}
                        </div>
                      );
                    })}
                    <div className="flex justify-between p-3 font-semibold"><span>Total</span><span>{money(selected.total)}</span></div>
                  </section>
                </>
              ) : (
                <>
                  <section aria-labelledby="customer-contact" className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h2 id="customer-contact" className="font-semibold">Contato</h2>
                      <Button variant="outline" size="sm" onClick={() => onEdit(customer)}>
                        <Pencil className="mr-2 size-4" aria-hidden="true" /> Editar cliente
                      </Button>
                    </div>
                    <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-primary hover:underline">
                      <Phone className="size-4 shrink-0" aria-hidden="true" />{maskCustomerPhone(customer.phone)}
                    </a>
                    <p className="flex items-start gap-2 break-words text-sm text-muted-foreground">
                      <MapPin className="size-4 shrink-0" aria-hidden="true" /><span className="min-w-0">{address || 'Endereço não informado'}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Cadastro {dateLabel(customer.created_at)}</p>
                  </section>

                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ['Compras', purchases],
                      ['Total gasto', money(total)],
                      ['Ticket médio', money(purchases ? total / purchases : 0)],
                      ['Último pedido', dateLabel(customer.last_order)],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0 rounded-lg bg-muted/60 p-3">
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="mt-1 break-words text-sm font-semibold tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <section aria-labelledby="customer-history" className="space-y-3">
                    <div>
                      <h2 id="customer-history" className="font-semibold">Histórico de pedidos</h2>
                      {customer.first_order && <p className="mt-1 text-xs text-muted-foreground">Primeira compra {dateLabel(customer.first_order)}</p>}
                    </div>
                    {orders.isError ? (
                      <div>
                        <p role="alert" className="text-sm text-destructive">Não foi possível carregar o histórico.</p>
                        <Button variant="link" className="px-0" onClick={() => void orders.refetch()}>Tentar novamente</Button>
                      </div>
                    ) : orders.isLoading ? <p role="status" className="text-sm text-muted-foreground">Carregando histórico...</p>
                      : orders.data?.data.length ? (
                        <ul className="divide-y rounded-xl border">
                          {orders.data.data.map(order => (
                            <li key={order.id}>
                              <Button variant="ghost" className="h-auto w-full justify-between gap-2 whitespace-normal p-3 text-left"
                                onClick={() => setOrderId(order.id)}>
                                <span className="min-w-0">
                                  <span className="block font-semibold">Pedido {orderNumber(order)}</span>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {dateLabel(order.created_at, true)} · {order.address ? 'Entrega' : 'Retirada'}
                                  </span>
                                </span>
                                <span className="flex shrink-0 items-center gap-1.5 text-right">
                                  <span className="space-y-1">
                                    <span className="block tabular-nums">{money(order.total)}</span>
                                    <Badge variant="secondary" className="max-w-24 text-right text-[10px] sm:max-w-none">{statuses[order.status] || order.status}</Badge>
                                  </span>
                                  <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
                                </span>
                              </Button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                          <ShoppingBag className="size-4" aria-hidden="true" /> Nenhum pedido registrado.
                        </p>
                      )}
                    {(page > 0 || (orders.data?.count ?? 0) > 20) && (
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(previous => previous - 1)}>Anterior</Button>
                        <span className="text-sm text-muted-foreground">Página {page + 1}</span>
                        <Button size="sm" variant="outline" disabled={(page + 1) * 20 >= (orders.data?.count ?? 0)}
                          onClick={() => setPage(previous => previous + 1)}>Próxima</Button>
                      </div>
                    )}
                  </section>
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

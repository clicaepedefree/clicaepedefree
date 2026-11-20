import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Customer, dateLabel, money, purchaseMetrics } from '@/lib/customers';
import { Pencil, ArrowLeft } from 'lucide-react';

const statuses: Record<string, string> = { completed: 'Finalizado', cancelled: 'Cancelado', pending_payment: 'Aguardando pagamento', new: 'Novo', preparing: 'Preparando', delivered: 'Em entrega' };
export function CustomerProfile({ customer, restaurantId, onClose, onEdit }: { customer: Customer | null; restaurantId: string; onClose: () => void; onEdit: (customer: Customer) => void }) {
  const [page, setPage] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const orders = useQuery({ queryKey: ['customer-orders', restaurantId, customer?.id, page], enabled: Boolean(customer), staleTime: 0, refetchOnWindowFocus: true, queryFn: async () => {
    if (!customer) return { data: [], count: 0 };
    const { data, error, count } = await supabase.from('orders').select('*', { count: 'exact' }).eq('restaurant_id', restaurantId).eq('customer_id', customer.id).order('created_at', { ascending: false }).range(page * 20, page * 20 + 19);
    if (error) throw error;
    return { data: data || [], count: count || 0 };
  } });
  const selected = orders.data?.data.find(order => order.id === orderId);
  const purchases = customer?.purchases || 0;
  const total = customer?.total_spent || 0;
  return <Dialog open={Boolean(customer)} onOpenChange={open => { if (!open) { onClose(); setPage(0); setOrderId(null); } }}><DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{selected ? `Pedido #${String(selected.order_number || '').padStart(2, '0')}` : customer?.name}</DialogTitle></DialogHeader>
    {selected ? <div className="space-y-4"><Button variant="ghost" onClick={() => setOrderId(null)}><ArrowLeft className="h-4 w-4 mr-2" />Histórico</Button><p>{dateLabel(selected.created_at, true)} · {statuses[selected.status] || selected.status}</p><p>{selected.address || 'Retirada no local'}</p><div className="divide-y">{Array.isArray(selected.items) && selected.items.map((raw, index) => { const item = raw as { productName?: string; quantity?: number; total?: number; observations?: string; addons?: { option?: { name?: string } }[] }; return <div key={index} className="py-3"><div className="flex justify-between gap-3"><span>{item.quantity}× {item.productName}</span><span>{money(Number(item.total || 0))}</span></div>{item.addons?.length ? <p className="text-sm text-muted-foreground">{item.addons.map(addon => addon.option?.name).filter(Boolean).join(', ')}</p> : null}{item.observations && <p className="text-sm text-muted-foreground">{item.observations}</p>}</div>; })}</div><div className="flex justify-between font-semibold"><span>Total</span><span>{money(selected.total)}</span></div></div> : <div className="space-y-6">
      <div className="flex justify-between items-start gap-3"><div className="space-y-1"><p>{customer?.phone}</p><p>{[customer?.address, customer?.number, customer?.complement, customer?.neighborhood].filter(Boolean).join(', ') || 'Endereço não informado'}</p><p className="text-sm text-muted-foreground">Cadastro: {dateLabel(customer?.created_at)}</p></div><Button variant="outline" size="sm" onClick={() => customer && onEdit(customer)}><Pencil className="h-4 w-4 mr-2" />Editar</Button></div>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-y py-4">{[['Compras', purchases], ['Total gasto', money(total)], ['Ticket médio', money(purchases ? total / purchases : 0)], ['Último pedido', dateLabel(customer?.last_order)]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold mt-1">{value}</dd></div>)}</dl>
      <div><h3 className="font-semibold mb-3">Histórico de compras</h3><p className="text-xs text-muted-foreground mb-3">Primeira compra: {dateLabel(customer?.first_order)}</p>{orders.isError ? <p role="alert" className="text-destructive">Não foi possível carregar o histórico.</p> : orders.isLoading ? <p>Carregando...</p> : <div className="divide-y">{orders.data?.data.length === 0 && <p className="py-6 text-muted-foreground">Nenhum pedido registrado.</p>}{orders.data?.data.map(order => <Button key={order.id} variant="ghost" className="w-full h-auto py-3 justify-between text-left gap-3 whitespace-normal" onClick={() => setOrderId(order.id)}><span><span className="font-medium">#{String(order.order_number || '').padStart(2, '0')}</span><span className="block text-xs text-muted-foreground">{dateLabel(order.created_at, true)} · {order.address ? 'Delivery' : 'Retirada'}</span></span><span className="text-right">{money(order.total)}<span className="block text-xs text-muted-foreground">{statuses[order.status] || order.status}</span></span></Button>)}</div>}<div className="flex items-center justify-end gap-3 mt-4"><Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button><span className="text-sm">{page + 1}</span><Button size="sm" variant="outline" disabled={(page + 1) * 20 >= (orders.data?.count || 0)} onClick={() => setPage(p => p + 1)}>Próxima</Button></div></div>
    </div>}
  </DialogContent></Dialog>;
}
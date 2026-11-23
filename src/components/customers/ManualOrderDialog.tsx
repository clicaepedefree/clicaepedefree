import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CustomerDialog } from './CustomerDialog';
import { Customer, maskCustomerPhone, money, normalizeCustomerPhone } from '@/lib/customers';
import { toast } from 'sonner';
import { Minus, Plus, UserPlus } from 'lucide-react';

const blank = { name: '', phone: '', address: '', number: '', complement: '', neighborhood: '' };
export function ManualOrderDialog({ open, onOpenChange, restaurantId, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; restaurantId: string; onCreated: () => void }) {
  const [term, setTerm] = useState('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [type, setType] = useState<'delivery' | 'pickup'>('delivery');
  const [qty, setQty] = useState<Record<string, number>>({});
  const [fee, setFee] = useState('0');
  const [payment, setPayment] = useState('cash');
  const [newCustomer, setNewCustomer] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setTerm(''); setCustomerId(null); setForm(blank); setQty({}); setFee('0'); } }, [open]);
  const products = useQuery({ queryKey: ['manual-products', restaurantId], enabled: open, queryFn: async () => (await supabase.from('products').select('id,name,price').eq('restaurant_id', restaurantId).eq('is_active', true).order('name').limit(1000)).data || [] });
  const matches = useQuery({ queryKey: ['customer-search', restaurantId, term], enabled: open && term.trim().length >= 2 && !customerId, queryFn: async () => { const { data, error } = await supabase.rpc('crm_customers', { _restaurant_id: restaurantId, _search: term.trim() }); if (error) throw error; return (data || []).slice(0, 6); } });
  const choose = (c: Customer) => { setCustomerId(c.id); setTerm(c.name); setForm({ name: c.name, phone: maskCustomerPhone(c.phone), address: c.address, number: c.number, complement: c.complement || '', neighborhood: c.neighborhood || '' }); };
  const items = (products.data || []).filter(p => qty[p.id] > 0).map(p => ({ productId: p.id, productName: p.name, quantity: qty[p.id], unitPrice: Number(p.price), addons: [], observations: null, total: Number(p.price) * qty[p.id] }));
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const deliveryFee = type === 'delivery' ? Math.max(0, Number(fee.replace(',', '.')) || 0) : 0;
  const submit = async () => {
    if (!form.name.trim() || !normalizeCustomerPhone(form.phone)) return toast.error('Informe nome e telefone válidos.');
    if (type === 'delivery' && (!form.address.trim() || !form.number.trim())) return toast.error('Informe endereço e número para delivery.');
    if (!items.length) return toast.error('Adicione ao menos um produto.');
    setBusy(true);
    const details = type === 'delivery' ? { street: form.address.trim(), number: form.number.trim(), complement: form.complement.trim(), neighborhood: form.neighborhood.trim() } : null;
    const address = details ? `${details.street}, ${details.number}${details.complement ? ` - ${details.complement}` : ''}${details.neighborhood ? `, ${details.neighborhood}` : ''}` : '';
    const { error } = await supabase.rpc('create_manual_order', { _restaurant_id: restaurantId, _customer_id: customerId as string, _name: form.name.trim(), _phone: form.phone, _details: details, _items: items, _delivery_fee: deliveryFee, _address: address, _payment_method: payment });
    setBusy(false);
    if (error) return toast.error(error.message.includes('incompatível') ? 'O telefone difere do cadastro selecionado. Remova a seleção ou corrija o telefone.' : 'Não foi possível lançar o pedido.');
    toast.success('Pedido lançado e vinculado ao cliente'); onCreated(); onOpenChange(false);
  };
  return <><Dialog open={open} onOpenChange={v => !busy && onOpenChange(v)}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Lançar pedido</DialogTitle></DialogHeader><div className="space-y-5">
    <div className="relative"><Label htmlFor="customer-search">Cliente</Label><div className="flex gap-2"><Input id="customer-search" placeholder="Pesquisar nome ou telefone" value={term} maxLength={100} onChange={e => { setTerm(e.target.value); setCustomerId(null); }} /><Button type="button" variant="outline" onClick={() => setNewCustomer(true)}><UserPlus className="h-4 w-4 mr-2" />Cadastrar novo cliente</Button></div>
      {!!matches.data?.length && <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">{matches.data.map(c => <button type="button" key={c.id} className="block w-full px-3 py-2 text-left hover:bg-muted" onClick={() => choose(c)}>{c.name}<span className="block text-xs text-muted-foreground">{c.phone}</span></button>)}</div>}</div>
    <div className="grid grid-cols-2 gap-3">{(['name', 'phone', 'address', 'number', 'complement', 'neighborhood'] as const).filter(f => type === 'delivery' || f === 'name' || f === 'phone').map(f => <div key={f}><Label htmlFor={`manual-${f}`}>{({ name: 'Nome *', phone: 'Telefone *', address: 'Endereço *', number: 'Número *', complement: 'Complemento', neighborhood: 'Bairro' })[f]}</Label><Input id={`manual-${f}`} value={form[f]} maxLength={f === 'address' ? 300 : 100} onChange={e => setForm(p => ({ ...p, [f]: f === 'phone' ? maskCustomerPhone(e.target.value) : e.target.value }))} /></div>)}</div>
    <p className="text-xs text-muted-foreground">Alterações aqui valem só para este pedido; o cadastro permanente não muda.</p>
    <div className="grid grid-cols-2 gap-3"><div><Label>Modalidade</Label><Select value={type} onValueChange={v => setType(v as 'delivery' | 'pickup')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="delivery">Delivery</SelectItem><SelectItem value="pickup">Retirada</SelectItem></SelectContent></Select></div><div><Label>Pagamento na loja</Label><Select value={payment} onValueChange={setPayment}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cash">Dinheiro</SelectItem><SelectItem value="pix">PIX</SelectItem><SelectItem value="credit_card">Cartão de crédito</SelectItem><SelectItem value="debit_card">Cartão de débito</SelectItem></SelectContent></Select></div></div>
    <div><Label>Produtos</Label><div className="max-h-60 overflow-y-auto divide-y border rounded-md">{(products.data || []).map(p => <div key={p.id} className="flex items-center justify-between px-3 py-2 gap-3"><span className="text-sm">{p.name}<span className="block text-xs text-muted-foreground">{money(Number(p.price))}</span></span><div className="flex items-center gap-2"><Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label={`Remover ${p.name}`} onClick={() => setQty(q => ({ ...q, [p.id]: Math.max(0, (q[p.id] || 0) - 1) }))}><Minus className="h-3 w-3" /></Button><span className="w-5 text-center">{qty[p.id] || 0}</span><Button type="button" size="icon" variant="outline" className="h-7 w-7" aria-label={`Adicionar ${p.name}`} onClick={() => setQty(q => ({ ...q, [p.id]: Math.min(100, (q[p.id] || 0) + 1) }))}><Plus className="h-3 w-3" /></Button></div></div>)}</div></div>
    {type === 'delivery' && <div className="w-40"><Label htmlFor="manual-fee">Taxa de entrega</Label><Input id="manual-fee" inputMode="decimal" value={fee} onChange={e => setFee(e.target.value)} /></div>}
    <div className="flex justify-between font-semibold"><span>Total</span><span>{money(subtotal + deliveryFee)}</span></div>
    <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button><Button onClick={submit} disabled={busy}>Lançar pedido</Button></div>
  </div></DialogContent></Dialog><CustomerDialog open={newCustomer} onOpenChange={setNewCustomer} restaurantId={restaurantId} onSaved={choose} /></>;
}
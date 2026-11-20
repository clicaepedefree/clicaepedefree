import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Customer, CustomerInput, customerSchema, maskCustomerPhone, normalizeCustomerPhone } from '@/lib/customers';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const empty: CustomerInput = { name: '', phone: '', address: '', number: '', complement: '', neighborhood: '' };
export function CustomerDialog({ open, onOpenChange, restaurantId, customer, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; restaurantId: string; customer?: Customer | null; onSaved: (customer: Customer) => void }) {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm(customer ? { ...customer, phone: maskCustomerPhone(customer.phone) } : empty); setError(''); } }, [open, customer]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = customerSchema.safeParse(form);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message || 'Confira os campos.'); return; }
    const phone = normalizeCustomerPhone(parsed.data.phone);
    if (!phone) return;
    setBusy(true); setError('');
    const values = { ...parsed.data, phone, restaurant_id: restaurantId };
    const query = customer ? supabase.from('customers').update(values).eq('id', customer.id).eq('restaurant_id', restaurantId) : supabase.from('customers').insert(values);
    const { data, error: saveError } = await query.select().single();
    setBusy(false);
    if (saveError) { setError(saveError.code === '23505' ? 'Já existe um cliente com este telefone nesta loja. Pesquise pelo número.' : 'Não foi possível salvar o cliente. Tente novamente.'); return; }
    toast.success(customer ? 'Cliente atualizado' : 'Cliente cadastrado'); onSaved(data); onOpenChange(false);
  };
  return <Dialog open={open} onOpenChange={value => !busy && onOpenChange(value)}><DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{customer ? 'Editar cliente' : 'Novo cliente'}</DialogTitle></DialogHeader><form onSubmit={submit} className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{(['name', 'phone', 'address', 'number', 'neighborhood', 'complement'] as const).map(field => <div key={field} className={field === 'name' || field === 'address' ? 'sm:col-span-2' : ''}><Label htmlFor={`customer-${field}`}>{({ name: 'Nome completo *', phone: 'Telefone / WhatsApp *', address: 'Endereço *', number: 'Número *', neighborhood: 'Bairro', complement: 'Complemento' })[field]}</Label><Input id={`customer-${field}`} required={['name', 'phone', 'address', 'number'].includes(field)} type={field === 'phone' ? 'tel' : 'text'} maxLength={field === 'address' ? 300 : field === 'phone' ? 20 : field === 'number' ? 30 : 100} value={form[field]} onChange={event => setForm(prev => ({ ...prev, [field]: field === 'phone' ? maskCustomerPhone(event.target.value) : event.target.value }))} /></div>)}</div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar Cliente</Button></div>
  </form></DialogContent></Dialog>;
}
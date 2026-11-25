import { z } from 'zod';

export function normalizeCustomerPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return `+${digits}`;
  return null;
}

export function maskCustomerPhone(value: string) {
  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length > 11) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  return digits.replace(/^(\d{2})(\d{0,5})(\d{0,4})$/, (_, ddd, first, last) => `(${ddd}) ${first}${last ? `-${last}` : ''}`);
}

export const customerSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome completo.').max(100),
  phone: z.string().refine(value => normalizeCustomerPhone(value) !== null, 'Informe um telefone com DDD válido.'),
  address: z.string().trim().min(1, 'Informe o endereço.').max(300),
  number: z.string().trim().min(1, 'Informe o número.').max(30),
  complement: z.string().trim().max(100),
  neighborhood: z.string().trim().max(100),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(2).optional(),
  cep: z.string().trim().max(9).optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export interface Customer extends CustomerInput {
  id: string;
  restaurant_id?: string;
  created_at: string;
  purchases?: number;
  total_spent?: number;
  last_order?: string | null;
  first_order?: string | null;
  total_count?: number;
}

export function isEffectivePurchase(order: { status: string; payment_status: string }) {
  return order.status === 'completed' && ['pago', 'not_required'].includes(order.payment_status);
}

export function purchaseMetrics(orders: { id: string; total: number; status: string; payment_status: string }[]) {
  const unique = [...new Map(orders.filter(isEffectivePurchase).map(order => [order.id, order])).values()];
  const total = unique.reduce((sum, order) => sum + Number(order.total), 0);
  return { count: unique.length, total, average: unique.length ? total / unique.length : 0 };
}

export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
export const dateLabel = (value?: string | null, time = false) => value ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', ...(time ? { timeStyle: 'short' as const } : {}) }).format(new Date(value)) : '—';

export function readSavedCustomer(restaurantId: string): CustomerInput | null {
  try {
    const raw = localStorage.getItem(`customer-checkout:${restaurantId}`);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - data.savedAt > 180 * 24 * 60 * 60 * 1000) return null;
    const result = customerSchema.partial().safeParse(data.customer);
    return result.success ? { name: '', phone: '', address: '', number: '', complement: '', neighborhood: '', ...result.data } : null;
  } catch { return null; }
}

export function saveCustomerLocally(restaurantId: string, customer: CustomerInput) {
  try { localStorage.setItem(`customer-checkout:${restaurantId}`, JSON.stringify({ savedAt: Date.now(), customer })); } catch { /* Storage may be unavailable in private browsing. */ }
}

export function savedCustomerForPhone(saved: CustomerInput | null, phone: string): CustomerInput | null {
  const normalized = normalizeCustomerPhone(phone);
  return saved && normalized && normalizeCustomerPhone(saved.phone) === normalized ? saved : null;
}
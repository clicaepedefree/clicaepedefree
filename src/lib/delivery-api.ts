import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

const sessions = new Map<string, Promise<{ sessionToken: string; expiresAt: string }>>();
async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T & { error?: string }>('delivery-distance', { body });
  if (error) {
    let message = 'Não foi possível consultar a entrega. Tente novamente.';
    if (error instanceof FunctionsHttpError) {
      try {
        const details = await error.context.json();
        message = details.error || message;
      } catch { /* Do not replace with an opaque transport error. */ }
      if (error.context.status === 401 && typeof body.restaurantId === 'string') sessions.delete(body.restaurantId);
    }
    throw new Error(message);
  }
  if (!data) throw new Error('A consulta não retornou um resultado. Tente novamente.');
  if (data.error) throw new Error(data.error);
  return data;
}

export async function queryDelivery<T>(restaurantId: string, body: Record<string, unknown>): Promise<T> {
  let pending = sessions.get(restaurantId);
  if (pending) {
    const session = await pending;
    if (Date.parse(session.expiresAt) <= Date.now()) pending = undefined;
  }
  if (!pending) {
    pending = invoke<{ sessionToken: string; expiresAt: string }>({ action: 'session', restaurantId });
    sessions.set(restaurantId, pending);
    pending.catch(() => sessions.delete(restaurantId));
  }
  const session = await pending;
  return invoke<T>({ ...body, restaurantId, sessionToken: session.sessionToken });
}
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@4';
import { destinationHashInput, routeMeters } from './rules.ts';

const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
const GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_maps';
const text = (max: number) => z.string().trim().max(max).refine(value => !/[<>\u0000-\u001f]/.test(value));
const common = { restaurantId: z.string().uuid(), sessionToken: z.string().uuid() };
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('session'), restaurantId: z.string().uuid() }),
  z.object({ action: z.literal('search'), ...common, query: text(120).min(3) }),
  z.object({ action: z.literal('cep'), ...common, cep: z.string().regex(/^\d{5}-?\d{3}$/) }),
  z.object({ action: z.literal('quote'), ...common, street: text(180).min(1), number: text(30).regex(/^\d+[a-z]?(?:[-/]\d+[a-z]?)?$/i),
    complement: text(100).default(''), neighborhood: text(80).min(1), city: text(80).min(1), state: z.string().regex(/^[A-Z]{2}$/),
    cep: z.string().regex(/^(?:\d{5}-?\d{3})?$/).default('') }),
]);
type Component = { long_name: string; short_name: string; types: string[] };
type GeoResult = { formatted_address: string; partial_match?: boolean; address_components: Component[] };
class DeliveryError extends Error {
  constructor(message: string, public status = 400, public details?: string) { super(message); }
}
const cache = new Map<string, { until: number; value: unknown }>();
async function hash(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
function part(result: GeoResult, ...types: string[]) {
  return result.address_components.find(component => types.some(type => component.types.includes(type)));
}
function candidate(result: GeoResult) {
  const cep = (part(result, 'postal_code')?.long_name ?? '').replace(/\D/g, '');
  return {
    street: part(result, 'route')?.long_name ?? '', number: part(result, 'street_number')?.long_name ?? '',
    neighborhood: part(result, 'sublocality_level_1', 'sublocality', 'neighborhood')?.long_name ?? '',
    city: part(result, 'administrative_area_level_2', 'locality')?.long_name ?? '',
    state: part(result, 'administrative_area_level_1')?.short_name ?? '',
    cep: cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : '', label: result.formatted_address,
  };
}
async function google(path: string, init: RequestInit = {}) {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  const mapsKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!lovableKey || !mapsKey) throw new DeliveryError('O cálculo está indisponível. A loja precisa configurar o Google Maps.', 503);
  const key = await hash(path + (init.body ?? ''));
  const hit = cache.get(key);
  if (hit && hit.until > Date.now()) return hit.value as any;
  const response = await fetch(`${GATEWAY_URL}/${path}`, { ...init,
    headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': mapsKey, ...init.headers }, signal: AbortSignal.timeout(10000) });
  if (!response.ok) {
    const body = await response.text();
    console.error(`Google Maps failed [${response.status}]: ${body}`);
    if (response.status === 403) {
      let reason = '';
      try { reason = JSON.parse(body)?.error?.details?.find((item: { reason?: string }) => item.reason)?.reason ?? ''; } catch { /* Preserve original body. */ }
      const fix = reason === 'API_KEY_HTTP_REFERRER_BLOCKED'
        ? 'A chave de servidor do Google Maps está restrita a sites. A loja deve configurar essa chave para servidor no Google Cloud.'
        : reason === 'API_KEY_SERVICE_BLOCKED'
        ? 'A chave do Google Maps não permite esta consulta. A loja deve habilitar Geocoding API e Routes API na chave de servidor.'
        : 'O Google Maps negou a consulta. A loja deve verificar as permissões da conexão.';
      throw new DeliveryError(fix, 403, body);
    }
    throw new DeliveryError('O Google Maps não conseguiu consultar este endereço. Tente novamente mais tarde.', response.status, body);
  }
  const value = await response.json();
  if (cache.size >= 500) cache.clear();
  cache.set(key, { until: Date.now() + 300000, value });
  return value;
}
async function geocode(address: string) {
  const result = await google(`maps/api/geocode/json?region=br&language=pt-BR&components=country:BR&address=${encodeURIComponent(address)}`);
  if (result.status === 'ZERO_RESULTS') return [] as GeoResult[];
  if (result.status !== 'OK') {
    console.error('Google Geocoding rejected:', result.status, result.error_message);
    throw new DeliveryError('Não foi possível consultar o endereço no Google Maps. A loja deve verificar a conexão.', 502, JSON.stringify(result));
  }
  return result.results as GeoResult[];
}
Deno.serve(async request => {
  const respond = (data: unknown, status = 200) => Response.json(data, { status, headers });
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return respond({ error: 'Método inválido.' }, 405);
  try {
    let body: unknown;
    try { body = await request.json(); } catch { return respond({ error: 'Solicitação inválida.' }, 400); }
    const parsed = schema.safeParse(body);
    if (!parsed.success) return respond({ error: 'Confira os campos do endereço e tente novamente.' }, 400);
    const input = parsed.data;
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new DeliveryError('Serviço de entrega indisponível.', 503);
    const db = createClient(url, key);
    const { data: restaurant, error: restaurantError } = await db.from('restaurants')
      .select('id,is_blocked,delivery_enabled').eq('id', input.restaurantId).maybeSingle();
    if (restaurantError) throw restaurantError;
    if (!restaurant || restaurant.is_blocked || restaurant.delivery_enabled === false) throw new DeliveryError('Esta loja não está disponível para entrega.');
    const { data: settings, error } = await db.from('delivery_distance_settings')
      .select('origin_address').eq('restaurant_id', input.restaurantId).eq('enabled', true).maybeSingle();
    if (error) throw error;
    if (!settings) throw new DeliveryError('Esta loja não oferece entrega por distância.');
    if (input.action !== 'session') {
      const { data: valid, error: sessionError } = await db.rpc('reserve_delivery_checkout_request', {
        _token_hash: await hash(input.sessionToken), _restaurant_id: input.restaurantId,
      });
      if (sessionError) throw sessionError;
      if (!valid) throw new DeliveryError('A consulta expirou ou atingiu o limite. Reabra o pedido para continuar.', 401);
    }
    const { data: allowed, error: rateError } = await db.rpc('reserve_delivery_route_request', { _restaurant_id: input.restaurantId });
    if (rateError) throw rateError;
    if (!allowed) throw new DeliveryError('Aguarde um minuto e tente novamente.', 429);
    if (input.action === 'session') {
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 20 * 60000).toISOString();
      const { error: sessionError } = await db.from('delivery_checkout_sessions').insert({
        token_hash: await hash(sessionToken), restaurant_id: input.restaurantId, expires_at: expiresAt,
      });
      if (sessionError) throw sessionError;
      await db.from('delivery_checkout_sessions').delete().lt('expires_at', new Date().toISOString());
      return respond({ sessionToken, expiresAt });
    }
    // Never resolve an ambiguous origin containing only street and number.
    if (settings.origin_address.split(',').length < 3) throw new DeliveryError('O endereço da loja está incompleto. A loja precisa incluir cidade e estado nas configurações de entrega.');
    const origins = await geocode(settings.origin_address);
    const origin = origins[0];
    if (!origin || origins.length !== 1 || origin.partial_match || !part(origin, 'route') || !part(origin, 'street_number')) {
      throw new DeliveryError('Não foi possível confirmar o endereço de saída. A loja deve conferir rua, número, cidade e estado.');
    }
    const originData = candidate(origin);
    if (input.action === 'cep' || input.action === 'search') {
      const query = input.action === 'cep' ? `${input.cep}, Brasil` : `${input.query}, ${originData.city} - ${originData.state}`;
      const results = await geocode(query);
      const candidates = results.map(candidate).filter(item => input.action === 'cep' ? Boolean(item.city) : Boolean(item.street)).slice(0, 5);
      return respond({ candidates });
    }
    const cep = input.cep.replace(/\D/g, '');
    const formattedCep = cep ? `${cep.slice(0, 5)}-${cep.slice(5)}` : '';
    const results = await geocode(`${input.street}, ${input.number} - ${input.neighborhood}, ${input.city} - ${input.state}${formattedCep ? `, ${formattedCep}` : ''}`);
    const destination = results[0];
    if (!destination || results.length !== 1 || destination.partial_match || !part(destination, 'route') ||
      part(destination, 'street_number')?.long_name.toLowerCase() !== input.number.toLowerCase()) {
      throw new DeliveryError('Não foi possível confirmar a rua e o número. Confira o endereço completo.');
    }
    const result = await google('routes/directions/v2:computeRoutes', { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-FieldMask': 'routes.distanceMeters' },
      body: JSON.stringify({ origin: { address: origin.formatted_address }, destination: { address: destination.formatted_address }, travelMode: 'DRIVE', regionCode: 'BR' }),
    });
    const meters = routeMeters(result);
    if (meters === null) throw new DeliveryError('Não foi possível encontrar uma rota de entrega para esse endereço.');
    const { data: fee, error: feeError } = await db.rpc('delivery_fee_for_distance', {
      _restaurant_id: input.restaurantId, _meters: meters, _origin_address: settings.origin_address,
    });
    if (feeError) throw feeError;
    if (fee === null) throw new DeliveryError('Este endereço está fora da área de entrega da loja.');
    const address = `${input.street}, ${input.number}${input.complement ? ` - ${input.complement}` : ''}, ${input.neighborhood}, ${input.city} - ${input.state}${formattedCep ? `, CEP ${formattedCep}` : ''}`;
    const details = { street: input.street, number: input.number, complement: input.complement, neighborhood: input.neighborhood, cep: formattedCep, city: input.city, state: input.state };
    await db.from('delivery_distance_quotes').delete().lt('expires_at', new Date().toISOString());
    const { data: quote, error: quoteError } = await db.from('delivery_distance_quotes').insert({
      restaurant_id: input.restaurantId, destination_hash: await hash(destinationHashInput(address, details)),
      origin_address: settings.origin_address, distance_meters: meters, delivery_fee: fee,
    }).select('id,expires_at').single();
    if (quoteError) throw quoteError;
    return respond({ id: quote.id, expiresAt: quote.expires_at, address, details, meters, fee: Number(fee) });
  } catch (error) {
    if (error instanceof DeliveryError) return respond({ error: error.message, ...(error.details ? { details: error.details, status: error.status } : {}) }, error.status);
    console.error('Delivery failed:', error instanceof Error ? error.message : 'internal error');
    return respond({ error: 'Não foi possível calcular a entrega agora. Tente novamente.' }, 503);
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function textField(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max) : "";
}

type Component = { long_name: string; short_name: string; types: string[] };
type GeoResult = { formatted_address: string; types: string[]; partial_match?: boolean; address_components: Component[] };

function part(result: GeoResult, ...types: string[]) {
  return result.address_components.find((c) => types.some((t) => c.types.includes(t)));
}

async function geocode(address: string) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!lovableKey || !mapsKey) throw new Error("missing_maps_credentials");
  const response = await fetch(
    `${GATEWAY_URL}/maps/api/geocode/json?region=br&language=pt-BR&components=country:BR&address=${encodeURIComponent(address)}`,
    { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": mapsKey }, signal: AbortSignal.timeout(8000) },
  );
  if (!response.ok) {
    console.error(`Geocoding failed [${response.status}]: ${await response.text()}`);
    throw new Error("geocoding_failed");
  }
  const data = await response.json();
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") console.error("Geocoding status:", data.status, data.error_message);
  return (data.results ?? []) as GeoResult[];
}

function toCandidate(result: GeoResult) {
  const cep = (part(result, "postal_code")?.long_name ?? "").replace(/\D/g, "");
  return {
    street: part(result, "route")?.long_name ?? "",
    number: part(result, "street_number")?.long_name ?? "",
    neighborhood: part(result, "sublocality_level_1", "sublocality", "neighborhood")?.long_name ?? "",
    city: part(result, "administrative_area_level_2", "locality")?.long_name ?? "",
    state: part(result, "administrative_area_level_1")?.short_name ?? "",
    cep: cep.length === 8 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : "",
    label: result.formatted_address,
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return Response.json({ error: "Método inválido." }, { status: 405, headers });

  const respond = (data: Record<string, unknown>) => Response.json(data, { headers });
  try {
    const input = await request.json();
    const restaurantId = textField(input.restaurantId, 36);
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(restaurantId)) return respond({ error: "Loja inválida." });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings, error } = await db.from("delivery_distance_settings")
      .select("origin_address").eq("restaurant_id", restaurantId).eq("enabled", true).maybeSingle();
    if (error) throw error;
    if (!settings) return respond({ error: "Esta loja não oferece entrega por distância." });

    const { data: allowed, error: rateError } = await db.rpc("reserve_delivery_route_request", { _restaurant_id: restaurantId });
    if (rateError) throw rateError;
    if (!allowed) return respond({ error: "Aguarde um minuto e tente novamente." });

    const [origin] = await geocode(settings.origin_address);
    if (!origin) return respond({ error: "O endereço da loja não foi encontrado. Entre em contato com a loja." });
    const city = part(origin, "administrative_area_level_2", "locality")?.long_name ?? "";
    const state = part(origin, "administrative_area_level_1")?.short_name ?? "";

    // Busca de ruas: o cliente digitou rua e número sem saber o CEP.
    if (input.action === "search") {
      const query = textField(input.query, 120);
      if (query.length < 3) return respond({ error: "Digite a rua e o número." });
      const results = await geocode(`${query}, ${city} - ${state}`);
      const candidates = results.map(toCandidate).filter((c) => c.street).slice(0, 5);
      return respond({ candidates });
    }

    const street = textField(input.street, 180);
    const number = textField(input.number, 30);
    const neighborhood = textField(input.neighborhood, 80);
    const destCity = textField(input.city, 80) || city;
    const destState = textField(input.state, 2) || state;
    const rawCep = textField(input.cep, 9);
    const complement = textField(input.complement, 100);
    if (!street || !/^\d+[a-z]?(?:[-/]\d+[a-z]?)?$/i.test(number) || !neighborhood || (rawCep && !/^\d{5}-?\d{3}$/.test(rawCep))) {
      return respond({ error: "Informe rua, número e bairro válidos." });
    }
    const cep = rawCep.replace("-", "");
    const formattedCep = cep ? `${cep.slice(0, 5)}-${cep.slice(5)}` : "";

    const [destination] = await geocode(`${street}, ${number} - ${neighborhood}, ${destCity} - ${destState}${formattedCep ? `, ${formattedCep}` : ""}`);
    if (!destination || !part(destination, "route")) {
      return respond({ error: "Não encontramos o endereço. Confira a rua e o número." });
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY")!;
    const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
    const maps = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { address: origin.formatted_address },
        destination: { address: destination.formatted_address },
        travelMode: "DRIVE",
        regionCode: "BR",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!maps.ok) {
      console.error(`Routes failed [${maps.status}]: ${await maps.text()}`);
      return respond({ error: "Não foi possível calcular a rota até esse endereço." });
    }
    const result = await maps.json();
    const meters = result.routes?.[0]?.distanceMeters ?? (result.routes?.[0] ? 0 : undefined);
    if (!Number.isInteger(meters) || meters < 0) {
      return respond({ error: "Não foi possível confirmar a rota. Confira o endereço ou fale com a loja." });
    }
    const { data: fee, error: feeError } = await db.rpc("delivery_fee_for_distance", {
      _restaurant_id: restaurantId, _meters: meters, _origin_address: settings.origin_address,
    });
    if (feeError) throw feeError;
    if (fee === null) return respond({ error: "Este endereço está fora da área de entrega da loja." });

    const address = `${street}, ${number}${complement ? ` - ${complement}` : ""}, ${neighborhood}, ${destCity} - ${destState}${formattedCep ? `, CEP ${formattedCep}` : ""}`;
    const details = { street, number, complement, neighborhood, cep: formattedCep };
    const destinationBytes = new TextEncoder().encode(
      [address, street, number, complement, neighborhood, formattedCep].join(String.fromCharCode(31)),
    );
    const digest = await crypto.subtle.digest("SHA-256", destinationBytes);
    const destinationHash = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    const { error: cleanupError } = await db.from("delivery_distance_quotes").delete().lt("expires_at", new Date().toISOString());
    if (cleanupError) console.error("Falha ao limpar cotações vencidas:", cleanupError.code);

    const { data: quote, error: quoteError } = await db.from("delivery_distance_quotes").insert({
      restaurant_id: restaurantId, destination_hash: destinationHash, origin_address: settings.origin_address,
      distance_meters: meters, delivery_fee: fee,
    }).select("id, expires_at").single();
    if (quoteError) throw quoteError;
    return respond({ id: quote.id, expiresAt: quote.expires_at, address, details, meters, fee: Number(fee) });
  } catch (error) {
    console.error("Falha na cotação de entrega:", error instanceof Error ? error.message : "database");
    return respond({ error: "Não foi possível calcular a entrega agora. Tente novamente." });
  }
});

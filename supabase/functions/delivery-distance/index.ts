import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function textField(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, max) : "";
}

type GeocodedWaypoint = {
  geocoderStatus?: { code?: number };
  partialMatch?: boolean;
  type?: string[];
};

function exactAddress(waypoint?: GeocodedWaypoint) {
  return Boolean(waypoint && !waypoint.geocoderStatus?.code && !waypoint.partialMatch &&
    waypoint.type?.some((type) => ["street_address", "premise", "subpremise"].includes(type)));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers });
  if (request.method !== "POST") return Response.json({ error: "Método inválido." }, { status: 405, headers });

  const respond = (data: Record<string, unknown>) => Response.json(data, { headers });
  try {
    const input = await request.json();
    const restaurantId = textField(input.restaurantId, 36);
    const street = textField(input.street, 180);
    const number = textField(input.number, 30);
    const neighborhood = textField(input.neighborhood, 80);
    const rawCep = textField(input.cep, 9);
    const cep = rawCep.replace("-", "");
    const complement = textField(input.complement, 100);
    if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(restaurantId) ||
        !street || !/^\d+[a-z]?(?:[-/]\d+[a-z]?)?$/i.test(number) || !neighborhood || !/^\d{5}-?\d{3}$/.test(rawCep)) {
      return respond({ error: "Informe rua, número, bairro e CEP válidos." });
    }

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings, error } = await db.from("delivery_distance_settings")
      .select("origin_address").eq("restaurant_id", restaurantId).eq("enabled", true).maybeSingle();
    if (error) throw error;
    if (!settings) return respond({ error: "Esta loja não oferece entrega por distância." });

    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) return respond({ error: "O cálculo da entrega está indisponível. Entre em contato com a loja." });

    const { data: allowed, error: rateError } = await db.rpc("reserve_delivery_route_request", { _restaurant_id: restaurantId });
    if (rateError) throw rateError;
    if (!allowed) return respond({ error: "Aguarde um minuto e tente calcular a entrega novamente." });

    const formattedCep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    const routeAddress = `${street}, ${number}, ${neighborhood}, ${formattedCep}, Brasil`;
    const maps = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.distanceMeters,geocodingResults.origin,geocodingResults.destination",
      },
      body: JSON.stringify({
        origin: { address: settings.origin_address },
        destination: { address: routeAddress },
        travelMode: "DRIVE",
        regionCode: "BR",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!maps.ok) {
      console.error("Routes API status:", maps.status);
      if (maps.status === 400 || maps.status === 404) {
        return respond({ error: "Não encontramos o endereço. Confira a rua, o número, o bairro e o CEP." });
      }
      throw new Error("Routes API indisponível");
    }
    const result = await maps.json();
    const meters = result.routes?.[0]?.distanceMeters;
    if (!Number.isInteger(meters) || meters < 0 ||
        !exactAddress(result.geocodingResults?.origin) || !exactAddress(result.geocodingResults?.destination)) {
      return respond({ error: "Não foi possível confirmar a rota. Confira o endereço ou fale com a loja." });
    }
    const { data: fee, error: feeError } = await db.rpc("delivery_fee_for_distance", {
      _restaurant_id: restaurantId,
      _meters: meters,
      _origin_address: settings.origin_address,
    });
    if (feeError) throw feeError;
    if (fee === null) {
      return respond({ error: "Este endereço está fora da área de entrega da loja." });
    }

    const address = `${street}, ${number}${complement ? ` - ${complement}` : ""}, ${neighborhood}, CEP ${formattedCep}`;
    const details = { street, number, complement, neighborhood, cep: formattedCep };
    const destinationBytes = new TextEncoder().encode(
      [address, street, number, complement, neighborhood, formattedCep].join(String.fromCharCode(31)),
    );
    const digest = await crypto.subtle.digest("SHA-256", destinationBytes);
    const destinationHash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    const { error: cleanupError } = await db.from("delivery_distance_quotes").delete().lt("expires_at", new Date().toISOString());
    if (cleanupError) console.error("Falha ao limpar cotações vencidas:", cleanupError.code);

    const { data: quote, error: quoteError } = await db.from("delivery_distance_quotes").insert({
      restaurant_id: restaurantId,
      destination_hash: destinationHash,
      origin_address: settings.origin_address,
      distance_meters: meters,
      delivery_fee: fee,
    }).select("id, expires_at").single();
    if (quoteError) throw quoteError;
    return respond({ id: quote.id, expiresAt: quote.expires_at, address, details, meters, fee: Number(fee) });
  } catch (error) {
    console.error("Falha na cotação de entrega:", error instanceof Error ? error.name : "database");
    return respond({ error: "Não foi possível calcular a entrega agora. Tente novamente." });
  }
});

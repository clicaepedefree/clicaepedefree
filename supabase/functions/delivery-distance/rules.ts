export type PriceBand = { upToMeters: number; feeCents: number };

export function distanceFee(bands: PriceBand[], meters: number): number | null {
  if (!Number.isInteger(meters) || meters < 0) return null;
  const band = bands.find(band => meters <= band.upToMeters);
  return band ? band.feeCents / 100 : null;
}

export function routeMeters(result: { routes?: { distanceMeters?: number }[] }): number | null {
  const route = result.routes?.[0];
  if (!route) return null;
  const meters = route.distanceMeters ?? 0;
  return Number.isInteger(meters) && meters >= 0 ? meters : null;
}

export function destinationHashInput(address: string, details: { street: string; number: string; complement: string; neighborhood: string; cep: string }) {
  return [address, details.street, details.number, details.complement, details.neighborhood, details.cep].join(String.fromCharCode(31));
}
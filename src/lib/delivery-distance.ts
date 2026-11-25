export interface DeliveryDistanceQuote {
  id: string;
  address: string;
  expiresAt: string;
  meters: number;
  fee: number;
  details: {
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    cep: string;
    city?: string;
    state?: string;
  };
}

export interface DeliveryAddressCandidate {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  label: string;
}

export function canCalculateDelivery(address: { street: string; number: string; neighborhood: string; city?: string; state?: string; cep?: string }) {
  return Boolean(address.street.trim() && /^\d+[a-z]?(?:[-/]\d+[a-z]?)?$/i.test(address.number.trim()) &&
    address.neighborhood.trim() && address.city?.trim() && /^[A-Z]{2}$/.test(address.state ?? '') &&
    (!address.cep || /^\d{5}-?\d{3}$/.test(address.cep)));
}

export function isCurrentDeliveryQuote(quote: DeliveryDistanceQuote | undefined, now = Date.now()) {
  return Boolean(quote && Date.parse(quote.expiresAt) > now && Number.isInteger(quote.meters) && quote.meters >= 0 &&
    Number.isFinite(quote.fee) && quote.fee >= 0 && quote.id && quote.address);
}

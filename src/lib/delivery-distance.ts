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
  };
}

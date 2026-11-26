export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Dinheiro",
  debit_card: "Cartão de Débito",
  credit_card: "Cartão de Crédito",
  food_voucher: "Vale Alimentação",
  meal_voucher: "Vale Refeição",
  pix: "PIX",
  pix_online: "PIX Online",
};

export function formatPaymentMethod(method?: string | null): string {
  if (!method) return "Não informado";
  return PAYMENT_LABELS[method] || method;
}

export function isPixOnline(method?: string | null): boolean {
  return method === "pix_online";
}


export const OFFLINE_CHECKOUT_METHODS = [
  { type: "credit_card", label: "Cartão de crédito" },
  { type: "debit_card", label: "Cartão de débito" },
  { type: "meal_voucher", label: "Vale-refeição (VR)" },
  { type: "food_voucher", label: "Vale-alimentação (VA)" },
] as const;

export type OfflineCheckoutMethod = (typeof OFFLINE_CHECKOUT_METHODS)[number]["type"];

export function isOfflineCheckoutMethod(method: string | undefined): method is OfflineCheckoutMethod {
  return OFFLINE_CHECKOUT_METHODS.some(option => option.type === method);
}

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

// ValidaPay API client — shared across edge functions
// Docs: https://docs.validapay.com.br/

const ENV = Deno.env.get("VALIDAPAY_ENVIRONMENT") || "sandbox";
const CLIENT_ID = Deno.env.get("VALIDAPAY_CLIENT_ID") || "";
const CLIENT_SECRET = Deno.env.get("VALIDAPAY_CLIENT_SECRET") || "";
const USE_STUBS =
  Deno.env.get("VALIDAPAY_USE_STUBS") !== "false" && ENV !== "production";

export const VALIDAPAY_BASE_URL =
  ENV === "production"
    ? "https://api.validapay.com.br"
    : "https://sandbox.validapay.com.br";

export const VALIDAPAY_OAUTH_URL =
  ENV === "production"
    ? "https://oauth2.validapay.com.br/auth/token"
    : "https://oauth2-sandbox.validapay.com.br/auth/token";

const DEFAULT_SCOPES = "pix.cob/write pix.cob/read";
const WALLET_SCOPES = "wallet/write";
const PROPOSALS_SCOPES = "proposals/write proposals/read";

interface TokenCache {
  token: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

export async function getAccessToken(scope = DEFAULT_SCOPES, forceRefresh = false): Promise<string> {
  if (USE_STUBS) return "stub-token";

  const cached = tokenCache.get(scope);
  if (!forceRefresh && cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("ValidaPay credentials not configured (VALIDAPAY_CLIENT_ID/SECRET)");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope,
  });

  const res = await fetch(VALIDAPAY_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ValidaPay auth failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  const token = data.access_token || data.token;
  const expiresIn = Number(data.expires_in || 3600);
  if (!token) throw new Error("ValidaPay auth returned no token");

  tokenCache.set(scope, { token, expiresAt: Date.now() + expiresIn * 1000 });
  return token;
}

async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  scope = DEFAULT_SCOPES,
  accountId?: string,
  retryOnUnauthorized = true,
): Promise<T> {
  const token = await getAccessToken(scope);
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> || {}),
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (accountId) headers["accountId"] = accountId;

  const res = await fetch(`${VALIDAPAY_BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  let json: any = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { raw: text }; }

  if (!res.ok) {
    if (res.status === 401 && retryOnUnauthorized) {
      tokenCache.delete(scope);
      return apiRequest<T>(path, init, scope, accountId, false);
    }
    throw new Error(`ValidaPay ${path} failed [${res.status}]: ${text}`);
  }
  return json as T;
}

// ============================================================
// PIX charges
// ============================================================

export interface CreateChargeResult {
  chargeId: string;
  emv: string;
  qrcodeBase64?: string;
}

export async function createPixCharge(amount: number, accountId?: string): Promise<CreateChargeResult> {
  if (USE_STUBS) {
    const chargeId = `stub_${crypto.randomUUID()}`;
    const cents = Math.round(amount * 100);
    return {
      chargeId,
      emv: `00020126580014BR.GOV.BCB.PIX0136${chargeId}520400005303986540${cents}5802BR5925CLICA E PEDE PAGAMENTO6009SAO PAULO62070503***6304TEST`,
    };
  }

  const data = await apiRequest<any>("/v1/charges/pix", {
    method: "POST",
    body: JSON.stringify({ amount }),
  }, DEFAULT_SCOPES, accountId);
  return {
    chargeId: data.chargeId || data.id,
    emv: data.emv || data.copia_cola,
    qrcodeBase64: data.qrcodeBase64 || data.qrCodeImage,
  };
}

export async function getChargeStatus(chargeId: string, accountId?: string): Promise<any> {
  if (USE_STUBS) return { id: chargeId, status: "pending" };
  return apiRequest(`/v1/charges/${chargeId}`, { method: "GET" }, DEFAULT_SCOPES, accountId);
}

// ============================================================
// Refunds
// ============================================================

export type RefundReasonCode =
  | "BANK_ERROR" | "FRAUD" | "CUSTOMER_REQUEST" | "PIX_CHANGE_ERROR";

export async function createRefund(params: {
  chargeId: string;
  amount: number;
  reasonCode: RefundReasonCode;
  accountId?: string;
}): Promise<any> {
  if (USE_STUBS) {
    return { id: `stub_refund_${crypto.randomUUID()}`, chargeId: params.chargeId, amount: params.amount, status: "completed" };
  }
  return apiRequest("/v1/wallet/refunds", {
    method: "POST",
    body: JSON.stringify({ chargeId: params.chargeId, amount: params.amount, reasonCode: params.reasonCode }),
  }, WALLET_SCOPES, params.accountId);
}

// ============================================================
// Withdrawals
// ============================================================

export async function createWithdrawal(params: {
  amount: number;
  pixKey: string;
  pixKeyType: string;
  holderDocument?: string;
  holderName?: string;
  description?: string;
  accountId?: string;
}): Promise<any> {
  if (USE_STUBS) {
    return { id: `stub_withdrawal_${crypto.randomUUID()}`, withdrawalId: `stub_withdrawal_${crypto.randomUUID()}`, amount: params.amount, status: "completed" };
  }

  const typeMap: Record<string, string> = {
    cpf: "CPF", cnpj: "CNPJ", email: "EMAIL", phone: "PHONE",
    celular: "PHONE", telefone: "PHONE",
    evp: "EVP", aleatoria: "EVP", random: "EVP",
  };
  const normalizedType =
    typeMap[(params.pixKeyType || "").toLowerCase()] || params.pixKeyType.toUpperCase();

  const body: Record<string, unknown> = {
    amount: params.amount,
    pixKey: params.pixKey,
    pixKeyType: normalizedType,
  };
  if (params.description) body.description = params.description;

  // /wallet/withdraw is restricted to the same holder as the origin account.
  // For marketplace payouts to restaurant PIX keys, ValidaPay's official route
  // is pix-transfer, which supports third-party destination keys.
  return apiRequest("/v1/wallet/pix-transfer", {
    method: "POST",
    body: JSON.stringify(body),
  }, WALLET_SCOPES, params.accountId);
}

// ============================================================
// Wallet balance
// ============================================================

export async function getWalletBalance(accountId?: string): Promise<any> {
  if (USE_STUBS) return { balance: 0 };
  return apiRequest("/v1/wallet/balance", { method: "GET" }, WALLET_SCOPES, accountId);
}

// ============================================================
// Subaccount onboarding (Proposals)
// Docs: https://docs.validapay.com.br/documentacao-validapay2/post-proposta
// ============================================================

export interface ProposalAddress {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export interface CreateProposalPF {
  type: "PF";
  fullName: string;
  document: string; // CPF
  birthDate: string; // YYYY-MM-DD
  email: string;
  phone: string;
  motherName?: string;
  address: ProposalAddress;
  financialDetails?: Record<string, unknown>;
}

export interface CreateProposalPJ {
  type: "PJ";
  companyName: string;
  tradingName?: string;
  document: string; // CNPJ
  email: string;
  phone: string;
  foundedAt?: string;
  address: ProposalAddress;
  legalRepresentative: {
    fullName: string;
    document: string;
    birthDate: string;
    email: string;
    phone: string;
    motherName?: string;
  };
  financialDetails?: Record<string, unknown>;
}

const digitsOnly = (value: unknown) => String(value || "").replace(/\D/g, "");
const formatBrazilianPhone = (value: unknown) => {
  const digits = digitsOnly(value);
  if (!digits) return "";
  return digits.startsWith("55") ? `+${digits}` : `+55${digits}`;
};
const formatValidaPayDate = (value: unknown) => {
  const text = String(value || "");
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return iso ? `${iso[3]}-${iso[2]}-${iso[1]}` : text;
};
const defaultWebhookUrl = () => {
  const baseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  return baseUrl ? `${baseUrl}/functions/v1/validapay-onboarding-webhook` : undefined;
};

export async function createProposal(payload: CreateProposalPF | CreateProposalPJ): Promise<any> {
  if (USE_STUBS) {
    return {
      formId: `stub_form_${crypto.randomUUID()}`,
      status: "pending",
    };
  }

  // Normalize to ValidaPay's expected camelCase schema
  const addr = (payload as any).address || {};
  const normalizedAddress = {
    postalCode: digitsOnly(addr.zipCode),
    street: addr.street,
    number: addr.number,
    addressComplement: addr.complement || "",
    neighborhood: addr.neighborhood,
    city: addr.city,
    state: addr.state,
  };

  let apiPayload: Record<string, unknown>;
  if (payload.type === "PF") {
    apiPayload = {
      documentNumber: digitsOnly(payload.document),
      phoneNumber: formatBrazilianPhone(payload.phone),
      email: payload.email,
      motherName: payload.motherName,
      fullName: payload.fullName,
      socialName: "",
      birthDate: formatValidaPayDate(payload.birthDate),
      address: normalizedAddress,
      isPoliticallyExposedPerson: false,
      financialDetails: payload.financialDetails || {
        declaredIncome: "DINP01",
        occupation: "ONP01",
        netWorth: "NWNP01",
      },
      webhookUrl: defaultWebhookUrl(),
    };
  } else {
    const rep = payload.legalRepresentative;
    apiPayload = {
      contactNumber: formatBrazilianPhone(payload.phone),
      documentNumber: digitsOnly(payload.document),
      businessEmail: payload.email,
      businessName: payload.companyName,
      tradingName: payload.tradingName || payload.companyName,
      companyType: "PJ",
      owner: [{
        ownerType: "SOCIO",
        documentNumber: digitsOnly(rep.document),
        fullName: rep.fullName,
        phoneNumber: formatBrazilianPhone(rep.phone),
        email: rep.email,
        motherName: rep.motherName,
        socialName: "",
        birthDate: formatValidaPayDate(rep.birthDate),
        address: normalizedAddress,
        isPoliticallyExposedPerson: false,
        financialOwnerDetails: {
          ownerDeclaredIncome: "ODIB01",
          ownerDeclaredRevenue: "ODRB01",
        },
      }],
      businessAddress: normalizedAddress,
      webhookUrl: defaultWebhookUrl(),
    };
  }

  const clean = (obj: any): any => {
    if (Array.isArray(obj)) return obj.map(clean);
    if (obj && typeof obj === "object") {
      return Object.fromEntries(
        Object.entries(obj).filter(([, v]) => v !== undefined && v !== null).map(([k, v]) => [k, clean(v)]),
      );
    }
    return obj;
  };

  return apiRequest("/v1/proposals", {
    method: "POST",
    body: JSON.stringify(clean(apiPayload)),
  }, PROPOSALS_SCOPES);
}

export async function getProposal(formId: string): Promise<any> {
  if (USE_STUBS) return { formId, status: "pending" };
  return apiRequest(`/v1/proposals/${formId}`, { method: "GET" }, PROPOSALS_SCOPES);
}

// ============================================================
// Webhook signature verification (HMAC-SHA256)
// ============================================================

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret = Deno.env.get("VALIDAPAY_WEBHOOK_SECRET");
  if (!secret) return false;
  if (!signature) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0")).join("");

  const clean = signature.replace(/^sha256=/, "").toLowerCase();
  if (computed.length !== clean.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ clean.charCodeAt(i);
  }
  return diff === 0;
}

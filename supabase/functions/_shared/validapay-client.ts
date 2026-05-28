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

const DEFAULT_SCOPES =
  "pix.cob/write pix.cob/read accounts/read accounts/write checkouts/write checkouts/read";

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

/**
 * Get a Bearer token via OAuth2 client_credentials on ValidaPay's oauth2 host.
 * Docs: https://docs.validapay.com.br/documentacao-validapay2/post-autenticacao
 */
export async function getAccessToken(): Promise<string> {
  if (USE_STUBS) return "stub-token";

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("ValidaPay credentials not configured (VALIDAPAY_CLIENT_ID/SECRET)");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: DEFAULT_SCOPES,
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

  tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}


async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${VALIDAPAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const text = await res.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }

  if (!res.ok) {
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

export async function createPixCharge(amount: number): Promise<CreateChargeResult> {
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
  });
  return {
    chargeId: data.chargeId || data.id,
    emv: data.emv || data.copia_cola,
    qrcodeBase64: data.qrcodeBase64 || data.qrCodeImage,
  };
}

export async function getChargeStatus(chargeId: string): Promise<any> {
  if (USE_STUBS) return { id: chargeId, status: "pending" };
  return apiRequest(`/v1/charges/${chargeId}`, { method: "GET" });
}

// ============================================================
// Refunds (devoluções)
// ============================================================

export type RefundReasonCode =
  | "BANK_ERROR"
  | "FRAUD"
  | "CUSTOMER_REQUEST"
  | "PIX_CHANGE_ERROR";

export async function createRefund(params: {
  chargeId: string;
  amount: number;
  reasonCode: RefundReasonCode;
}): Promise<any> {
  if (USE_STUBS) {
    return {
      id: `stub_refund_${crypto.randomUUID()}`,
      chargeId: params.chargeId,
      amount: params.amount,
      status: "completed",
    };
  }

  return apiRequest("/v1/wallet/refunds", {
    method: "POST",
    body: JSON.stringify({
      chargeId: params.chargeId,
      amount: params.amount,
      reasonCode: params.reasonCode,
    }),
  });
}

// ============================================================
// Withdrawals (saques)
// ============================================================

export async function createWithdrawal(params: {
  amount: number;
  pixKey: string;
  pixKeyType: string;
  holderName?: string;
  holderDocument?: string;
}): Promise<any> {
  if (USE_STUBS) {
    return {
      id: `stub_withdrawal_${crypto.randomUUID()}`,
      withdrawalId: `stub_withdrawal_${crypto.randomUUID()}`,
      amount: params.amount,
      status: "completed",
    };
  }

  return apiRequest("/v1/wallet/withdraw", {
    method: "POST",
    body: JSON.stringify({
      amount: params.amount,
      pixKey: params.pixKey,
      pixKeyType: params.pixKeyType,
      holderName: params.holderName,
      holderDocument: params.holderDocument,
    }),
  });
}

// ============================================================
// Webhook signature verification (HMAC-SHA256)
// ============================================================

export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  const secret = Deno.env.get("VALIDAPAY_WEBHOOK_SECRET");
  if (!secret) return false; // dev mode: no validation possible
  if (!signature) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const clean = signature.replace(/^sha256=/, "").toLowerCase();
  if (computed.length !== clean.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ clean.charCodeAt(i);
  }
  return diff === 0;
}

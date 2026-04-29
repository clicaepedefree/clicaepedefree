// EFI Pay client — handles mTLS auth + OAuth token + PIX endpoints
// Used by: create-pix-charge, pix-webhook (repasse)

const EFI_ENV = Deno.env.get("EFI_ENVIRONMENT") || "production";
const EFI_CLIENT_ID = Deno.env.get("EFI_CLIENT_ID")!;
const EFI_CLIENT_SECRET = Deno.env.get("EFI_CLIENT_SECRET")!;
const EFI_CERTIFICATE_BASE64 = Deno.env.get("EFI_CERTIFICATE_BASE64")!;
const EFI_PIX_KEY = Deno.env.get("EFI_PIX_KEY")!;

const EFI_BASE_URL = EFI_ENV === "production"
  ? "https://pix.api.efipay.com.br"
  : "https://pix-h.api.efipay.com.br";

// Cache token in memory between invocations (best-effort)
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Build a Deno HTTP client using the .p12 certificate (mTLS required by EFI).
 * EFI sends the cert as PKCS#12 — Deno needs PEM. We use the base64 directly with
 * Deno.createHttpClient that supports certChain + privateKey OR p12 via undici/Node compat.
 *
 * Approach: convert p12 -> PEM at runtime using forge (npm) or use Deno's built-in
 * `Deno.createHttpClient` with `caCerts`. Since Deno Deploy doesn't expose Node TLS,
 * we use the `node:https` compat with the certificate as a Buffer.
 */
async function buildHttpsAgent() {
  // Lazy import (Deno Deploy supports node:https compat)
  const https = await import("node:https");
  const Buffer = (await import("node:buffer")).Buffer;

  const pfx = Buffer.from(EFI_CERTIFICATE_BASE64, "base64");

  return new https.Agent({
    pfx,
    passphrase: "", // certificado sem senha (confirmado pelo usuário)
    keepAlive: true,
  });
}

async function efiFetch(path: string, init: RequestInit & { agent?: any } = {}) {
  const agent = await buildHttpsAgent();
  const url = `${EFI_BASE_URL}${path}`;

  // Use node-fetch via node:https Agent
  const nodeFetch = (await import("npm:node-fetch@2")).default as any;
  const res = await nodeFetch(url, { ...init, agent });
  return res;
}

export async function getEfiAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const credentials = btoa(`${EFI_CLIENT_ID}:${EFI_CLIENT_SECRET}`);
  const res = await efiFetch("/oauth/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EFI OAuth failed [${res.status}]: ${text}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
  return data.access_token;
}

export interface CreatePixChargeInput {
  amount: number;        // BRL, e.g. 49.90
  txid?: string;         // 26-35 chars [a-zA-Z0-9]; auto if omitted
  expirationSeconds: number;
  description: string;   // max 140 chars
  payerCpf?: string;
  payerName?: string;
}

export interface PixChargeResponse {
  txid: string;
  loc_id: number;
  qrcode: string;        // base64 image
  copia_cola: string;    // BR Code string
  expires_at: string;
}

function generateTxid(): string {
  // 26-char [a-zA-Z0-9]
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 26; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function createPixCharge(input: CreatePixChargeInput): Promise<PixChargeResponse> {
  const token = await getEfiAccessToken();
  const txid = input.txid || generateTxid();

  const body: any = {
    calendario: { expiracao: input.expirationSeconds },
    valor: { original: input.amount.toFixed(2) },
    chave: EFI_PIX_KEY,
    solicitacaoPagador: input.description.slice(0, 140),
  };
  if (input.payerCpf && input.payerName) {
    body.devedor = { cpf: input.payerCpf, nome: input.payerName.slice(0, 200) };
  }

  // PUT /v2/cob/{txid}
  const res = await efiFetch(`/v2/cob/${txid}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EFI create cob failed [${res.status}]: ${text}`);
  }

  const cob = await res.json();
  const locId = cob.loc?.id;
  if (!locId) throw new Error("EFI cob response missing loc.id");

  // Get QR Code: GET /v2/loc/{id}/qrcode
  const qrRes = await efiFetch(`/v2/loc/${locId}/qrcode`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!qrRes.ok) {
    const text = await qrRes.text();
    throw new Error(`EFI qrcode fetch failed [${qrRes.status}]: ${text}`);
  }
  const qr = await qrRes.json();

  return {
    txid,
    loc_id: locId,
    qrcode: qr.imagemQrcode,        // data:image/png;base64,...
    copia_cola: qr.qrcode,          // BR Code
    expires_at: new Date(Date.now() + input.expirationSeconds * 1000).toISOString(),
  };
}

export async function getPixChargeStatus(txid: string) {
  const token = await getEfiAccessToken();
  const res = await efiFetch(`/v2/cob/${txid}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EFI get cob failed [${res.status}]: ${text}`);
  }
  return res.json();
}

export interface SendPixInput {
  amount: number;
  destinationKey: string;
  description?: string;
}

export async function sendPix(input: SendPixInput) {
  const token = await getEfiAccessToken();
  const idEnvio = generateTxid(); // 26 chars

  const body = {
    valor: input.amount.toFixed(2),
    pagador: { chave: EFI_PIX_KEY, infoPagador: input.description?.slice(0, 140) || "Repasse" },
    favorecido: { chave: input.destinationKey },
  };

  const res = await efiFetch(`/v3/gn/pix/${idEnvio}`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EFI send pix failed [${res.status}]: ${text}`);
  }

  return { idEnvio, ...(await res.json()) };
}

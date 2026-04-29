// EFI Pay client — handles mTLS auth + OAuth + PIX endpoints
// Converts PFX → PEM via node-forge, then uses Deno's native fetch with createHttpClient.

import { Buffer } from "node:buffer";
import forge from "npm:node-forge@1.3.1";

const EFI_ENV = Deno.env.get("EFI_ENVIRONMENT") || "production";
const EFI_CLIENT_ID = Deno.env.get("EFI_CLIENT_ID")!;
const EFI_CLIENT_SECRET = Deno.env.get("EFI_CLIENT_SECRET")!;
const EFI_CERTIFICATE_BASE64 = Deno.env.get("EFI_CERTIFICATE_BASE64")!;
const EFI_PIX_KEY = Deno.env.get("EFI_PIX_KEY")!;

const EFI_BASE_URL = EFI_ENV === "production"
  ? "https://pix.api.efipay.com.br"
  : "https://pix-h.api.efipay.com.br";

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedClient: Deno.HttpClient | null = null;
let cachedPem: { cert: string; key: string } | null = null;

function pfxToPem(): { cert: string; key: string } {
  if (cachedPem) return cachedPem;
  if (!EFI_CERTIFICATE_BASE64) throw new Error("EFI_CERTIFICATE_BASE64 not configured");

  const pfxDer = Buffer.from(EFI_CERTIFICATE_BASE64, "base64");
  const p12Asn1 = forge.asn1.fromDer(pfxDer.toString("binary"));
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, "");

  let certPem = "";
  let keyPem = "";

  for (const safeContents of p12.safeContents) {
    for (const safeBag of safeContents.safeBags) {
      if (safeBag.type === forge.pki.oids.certBag && safeBag.cert) {
        certPem += forge.pki.certificateToPem(safeBag.cert);
      } else if (
        (safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag ||
          safeBag.type === forge.pki.oids.keyBag) && safeBag.key
      ) {
        keyPem = forge.pki.privateKeyToPem(safeBag.key);
      }
    }
  }

  if (!certPem || !keyPem) throw new Error("Failed to extract cert/key from PFX");
  cachedPem = { cert: certPem, key: keyPem };
  return cachedPem;
}

function getClient(): Deno.HttpClient {
  if (cachedClient) return cachedClient;
  const { cert, key } = pfxToPem();
  // @ts-ignore — cert/key supported in Deno runtime
  cachedClient = Deno.createHttpClient({ cert, key });
  return cachedClient;
}

async function efiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const client = getClient();
  // @ts-ignore — client option supported in Deno runtime
  return await fetch(`${EFI_BASE_URL}${path}`, { ...init, client });
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
  amount: number;
  txid?: string;
  expirationSeconds: number;
  description: string;
  payerCpf?: string;
  payerName?: string;
}

export interface PixChargeResponse {
  txid: string;
  loc_id: number;
  qrcode: string;
  copia_cola: string;
  expires_at: string;
}

function generateTxid(): string {
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
  const locId = cob?.loc?.id;
  if (!locId) throw new Error("EFI cob response missing loc.id");

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
    qrcode: qr.imagemQrcode,
    copia_cola: qr.qrcode,
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
  const idEnvio = generateTxid();

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

/**
 * Consulta o status de um envio PIX (repasse) na EFI.
 * EFI retorna { idEnvio, status, valor, ... } onde status pode ser:
 *  - EM_PROCESSAMENTO
 *  - REALIZADO
 *  - NAO_REALIZADO
 */
export async function getPixSendStatus(idEnvio: string) {
  const token = await getEfiAccessToken();
  const res = await efiFetch(`/v3/gn/pix/enviados/${idEnvio}`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`EFI get pix sent failed [${res.status}]: ${text}`);
  }
  return res.json();
}


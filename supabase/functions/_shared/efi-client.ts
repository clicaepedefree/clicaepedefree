// EFI Pay client — handles mTLS auth + OAuth token + PIX endpoints
// Used by: create-pix-charge, pix-webhook (repasse), check-pix-status

import { Buffer } from "node:buffer";
import https from "node:https";

const EFI_ENV = Deno.env.get("EFI_ENVIRONMENT") || "production";
const EFI_CLIENT_ID = Deno.env.get("EFI_CLIENT_ID")!;
const EFI_CLIENT_SECRET = Deno.env.get("EFI_CLIENT_SECRET")!;
const EFI_CERTIFICATE_BASE64 = Deno.env.get("EFI_CERTIFICATE_BASE64")!;
const EFI_PIX_KEY = Deno.env.get("EFI_PIX_KEY")!;

const EFI_HOST = EFI_ENV === "production"
  ? "pix.api.efipay.com.br"
  : "pix-h.api.efipay.com.br";

let cachedToken: { token: string; expiresAt: number } | null = null;
let cachedPfx: Buffer | null = null;

function getPfx(): Buffer {
  if (!cachedPfx) {
    if (!EFI_CERTIFICATE_BASE64) throw new Error("EFI_CERTIFICATE_BASE64 not configured");
    cachedPfx = Buffer.from(EFI_CERTIFICATE_BASE64, "base64");
  }
  return cachedPfx;
}

interface EfiResponse {
  ok: boolean;
  status: number;
  text: string;
  json: () => any;
}

/**
 * Make an HTTPS request to EFI using mTLS (PFX certificate).
 * Uses node:https compat in Deno — node-fetch is NOT supported on Edge Functions.
 */
function efiRequest(
  path: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
): Promise<EfiResponse> {
  return new Promise((resolve, reject) => {
    const pfx = getPfx();
    const reqOptions: any = {
      host: EFI_HOST,
      port: 443,
      path,
      method,
      pfx,
      passphrase: "",
      headers: {
        ...headers,
        ...(body ? { "Content-Length": Buffer.byteLength(body).toString() } : {}),
      },
    };

    const req = https.request(reqOptions, (res: any) => {
      const chunks: Uint8Array[] = [];
      res.on("data", (c: Uint8Array) => chunks.push(c));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        const status = res.statusCode || 0;
        resolve({
          ok: status >= 200 && status < 300,
          status,
          text,
          json: () => {
            try { return JSON.parse(text); } catch { return null; }
          },
        });
      });
    });

    req.on("error", (err: Error) => reject(err));
    if (body) req.write(body);
    req.end();
  });
}

export async function getEfiAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const credentials = btoa(`${EFI_CLIENT_ID}:${EFI_CLIENT_SECRET}`);
  const body = JSON.stringify({ grant_type: "client_credentials" });
  const res = await efiRequest("/oauth/token", "POST", {
    "Authorization": `Basic ${credentials}`,
    "Content-Type": "application/json",
  }, body);

  if (!res.ok) {
    throw new Error(`EFI OAuth failed [${res.status}]: ${res.text}`);
  }

  const data = res.json();
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

  const res = await efiRequest(`/v2/cob/${txid}`, "PUT", {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  }, JSON.stringify(body));

  if (!res.ok) {
    throw new Error(`EFI create cob failed [${res.status}]: ${res.text}`);
  }

  const cob = res.json();
  const locId = cob?.loc?.id;
  if (!locId) throw new Error("EFI cob response missing loc.id");

  const qrRes = await efiRequest(`/v2/loc/${locId}/qrcode`, "GET", {
    "Authorization": `Bearer ${token}`,
  });
  if (!qrRes.ok) {
    throw new Error(`EFI qrcode fetch failed [${qrRes.status}]: ${qrRes.text}`);
  }
  const qr = qrRes.json();

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
  const res = await efiRequest(`/v2/cob/${txid}`, "GET", {
    "Authorization": `Bearer ${token}`,
  });
  if (!res.ok) {
    throw new Error(`EFI get cob failed [${res.status}]: ${res.text}`);
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

  const res = await efiRequest(`/v3/gn/pix/${idEnvio}`, "PUT", {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json",
  }, JSON.stringify(body));

  if (!res.ok) {
    throw new Error(`EFI send pix failed [${res.status}]: ${res.text}`);
  }

  return { idEnvio, ...res.json() };
}

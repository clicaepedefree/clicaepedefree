import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { cleanText, expandResponse, greeting, incomingPhone, introduction, matchRule, normalize, withinHours, type Rule } from "./rules.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-region",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (data: Record<string, unknown>, status = 200) => Response.json(data, { status, headers: cors });
const env = (name: string) => Deno.env.get(name) ?? "";
const instanceName = (id: string) => `clica-${id}`;
const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
const whatsappStatuses: Record<string, string> = {
  new: "foi recebido pela loja",
  preparing: "já está em preparo",
  delivered: "saiu para entrega",
  completed: "foi finalizado",
  cancelled: "foi cancelado",
};

class EvolutionError extends Error {
  constructor(readonly status: number) { super("Falha na Evolution API"); }
}

function httpsBase(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) throw Error("URL inválida");
  return url.href.replace(/\/$/, "");
}

async function evolution(path: string, method = "GET", body?: unknown) {
  const response = await fetch(httpsBase(env("EVOLUTION_API_URL")) + path, {
    method, redirect: "error",
    headers: { apikey: env("EVOLUTION_API_KEY"), "Content-Type": "application/json" },
    signal: AbortSignal.timeout(9000),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new EvolutionError(response.status);
  return response.json();
}

async function connectionState(instance: string) {
  try {
    const data = await evolution(`/instance/connectionState/${instance}`);
    return data.instance?.state ?? "missing";
  } catch (error) {
    if (error instanceof EvolutionError && error.status === 404) return "missing";
    throw error;
  }
}

async function manage(request: Request, body: Record<string, unknown>) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return reply({ error: "Entre na sua conta para continuar." }, 401);
  const client = db();
  const { data: { user }, error: userError } = await client.auth.getUser(token);
  if (userError || !user) return reply({ error: "Sessão inválida." }, 401);

  const id = body.restaurantId;
  if (typeof id !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)) {
    return reply({ error: "Loja inválida." }, 400);
  }
  const { data: restaurant, error: storeError } = await client.from("restaurants").select("id,is_blocked")
    .eq("id", id).eq("user_id", user.id).maybeSingle();
  if (storeError) throw storeError;
  if (!restaurant) return reply({ error: "Você não tem acesso a esta loja." }, 403);
  if (restaurant.is_blocked && body.action !== "disconnect") return reply({ error: "Loja bloqueada." }, 403);

  const { error: initError } = await client.from("whatsapp_robot_settings")
    .upsert({ restaurant_id: id }, { onConflict: "restaurant_id", ignoreDuplicates: true });
  if (initError) throw initError;
  const { data: settings, error: settingsError } = await client.from("whatsapp_robot_settings")
    .select("bot_name,reply_mode,notify_orders,keyword_rules,connected,webhook_token").eq("restaurant_id", id).single();
  if (settingsError) throw settingsError;
  const publicConfig = {
    botName: settings.bot_name, mode: settings.reply_mode, notifyOrders: settings.notify_orders,
    rules: settings.keyword_rules, connected: settings.connected,
  };

  if (body.action === "load") return reply(publicConfig);
  if (body.action === "save") {
    if (!["off", "welcome", "keywords"].includes(String(body.mode)) || typeof body.notifyOrders !== "boolean" ||
      !Array.isArray(body.rules) || body.rules.length > 40) {
      return reply({ error: "Confira as configurações do robô." }, 400);
    }
    const rules: Rule[] = [];
    const seen = new Set<string>();
    for (const rule of body.rules) {
      const keyword = cleanText(rule?.keyword, 120);
      const response = cleanText(rule?.response, 1000);
      const match = rule?.match;
      const key = `${match}:${normalize(keyword)}`;
      if (!normalize(keyword) || !response || !["exact", "contains"].includes(match) || seen.has(key)) {
        return reply({ error: "As regras precisam de palavra-chave e resposta. Remova entradas duplicadas." }, 400);
      }
      seen.add(key);
      rules.push({ keyword, response, match });
    }
    const { error } = await client.from("whatsapp_robot_settings").update({
      bot_name: cleanText(body.botName, 60), reply_mode: body.mode, notify_orders: body.notifyOrders, keyword_rules: rules,
    }).eq("restaurant_id", id);
    if (error) throw error;
    return reply({ saved: true });
  }

  if (!["status", "connect", "disconnect"].includes(String(body.action))) return reply({ error: "Ação inválida." }, 400);
  if (!env("EVOLUTION_API_URL") || !env("EVOLUTION_API_KEY") || !env("WHATSAPP_PUBLIC_SITE_URL") || !env("WHATSAPP_WORKER_TOKEN")) {
    return reply({ error: "A integração com WhatsApp ainda não foi configurada no servidor." }, 503);
  }
  const instance = instanceName(id);
  const state = await connectionState(instance);
  if (body.action === "disconnect") {
    if (state !== "missing" && state !== "close") await evolution(`/instance/logout/${instance}`, "DELETE");
    const { error } = await client.from("whatsapp_robot_settings").update({ connected: false }).eq("restaurant_id", id);
    if (error) throw error;
    return reply({ connected: false });
  }
  if (state === "open" || body.action === "status") {
    const connected = state === "open";
    if (connected !== settings.connected) {
      const { error } = await client.from("whatsapp_robot_settings").update({ connected }).eq("restaurant_id", id);
      if (error) throw error;
    }
    return reply({ connected });
  }

  let result;
  if (state === "missing") {
    result = await evolution("/instance/create", "POST", {
      instanceName: instance, integration: "WHATSAPP-BAILEYS", qrcode: true,
      groupsIgnore: true, syncFullHistory: false,
      webhook: {
        enabled: true, url: `${httpsBase(env("SUPABASE_URL"))}/functions/v1/whatsapp-robot/incoming`,
        headers: { "x-webhook-token": settings.webhook_token }, byEvents: false, base64: false,
        events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
      },
    });
  } else {
    result = await evolution(`/instance/connect/${instance}`);
  }
  const image = result.qrcode?.base64 ?? result.base64;
  const qr = typeof image === "string" && /^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(image) && image.length < 150_000 ? image : null;
  return reply({ connected: false, qr });
}

async function receive(request: Request, body: Record<string, any>) {
  const token = request.headers.get("x-webhook-token");
  if (!token || !/^[0-9a-f-]{36}$/.test(token) || typeof body.instance !== "string") return reply({ ok: false }, 401);
  const client = db();
  const { data: config, error } = await client.from("whatsapp_robot_settings")
    .select("restaurant_id,connected,reply_mode,bot_name,keyword_rules").eq("webhook_token", token).maybeSingle();
  if (error) throw error;
  if (!config || body.instance !== instanceName(config.restaurant_id)) return reply({ ok: false }, 401);

  const event = String(body.event).toLowerCase().replace(/_/g, ".");
  if (event === "connection.update" && ["open", "close"].includes(body.data?.state)) {
    const { error } = await client.from("whatsapp_robot_settings")
      .update({ connected: body.data.state === "open" }).eq("restaurant_id", config.restaurant_id);
    if (error) throw error;
  }
  if (event !== "messages.upsert" || !config.connected) return reply({ ok: true });

  const incoming = body.data;
  const key = incoming?.key;
  const jid = String(key?.remoteJid ?? "");
  const id = cleanText(key?.id, 128);
  if (!key || key.fromMe !== false || !id || jid.endsWith("@g.us") || jid.endsWith("@broadcast")) return reply({ ok: true });
  const phone = incomingPhone(key.remoteJid, key.remoteJidAlt, key.senderPn);
  if (!phone) return reply({ ok: true });
  const clock = Number(incoming.messageTimestamp ?? 0);
  if (clock > 0 && clock * 1000 < Date.now() - 10 * 60_000) return reply({ ok: true });

  const name = cleanText(incoming.pushName, 100);
  let message: string | null = null;
  let cooldown = false;
  if (config.reply_mode !== "off") {
    const [shop, schedule, contact] = await Promise.all([
      client.from("restaurants").select("name,slug,is_open,is_blocked").eq("id", config.restaurant_id).single(),
      client.from("operating_hours").select("day_of_week,open_time,close_time,is_active").eq("restaurant_id", config.restaurant_id),
      client.from("whatsapp_robot_contacts").select("profile_name").eq("restaurant_id", config.restaurant_id).eq("phone", phone).maybeSingle(),
    ]);
    if (shop.error || schedule.error || contact.error) throw Error("Falha ao carregar dados do atendimento");
    if (shop.data.is_blocked) return reply({ ok: true });
    const profile = name || contact.data?.profile_name || "";
    const link = `${httpsBase(env("WHATSAPP_PUBLIC_SITE_URL"))}/cardapio/${encodeURIComponent(shop.data.slug)}`;
    const prefix = `${greeting(profile)} ${introduction(config.bot_name, shop.data.name)}`;
    if (!shop.data.is_open || !withinHours(schedule.data)) {
      message = `${prefix}\nA loja está fechada no momento. Você pode consultar o cardápio aqui: ${link}`;
      cooldown = true;
    } else if (config.reply_mode === "welcome") {
      message = `${prefix}\nConfira nosso cardápio e faça seu pedido: ${link}`;
      cooldown = true;
    } else {
      const text = cleanText(incoming.message?.conversation ?? incoming.message?.extendedTextMessage?.text ??
        incoming.message?.imageMessage?.caption ?? incoming.message?.videoMessage?.caption, 2000);
      const rule = matchRule(text, config.keyword_rules as Rule[]);
      if (rule) {
        cooldown = true;
        message = `${prefix}\n${expandResponse(rule.response, {
          nome: profile, loja: shop.data.name, robo: config.bot_name, cardapio: link,
        })}`;
      }
    }
  }
  const queued = await client.rpc("enqueue_whatsapp_reply", {
    _restaurant_id: config.restaurant_id, _phone: phone, _profile_name: name,
    _event_key: `${phone}:${id}`, _message: message, _cooldown: cooldown,
  });
  if (queued.error) throw queued.error;
  return reply({ ok: true });
}

async function dispatch(request: Request) {
  const secret = env("WHATSAPP_WORKER_TOKEN");
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return reply({ ok: false }, 401);
  const client = db();
  const { data: tasks, error } = await client.rpc("claim_whatsapp_outbox");
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const task of tasks ?? []) {
    try {
      const config = await client.from("whatsapp_robot_settings").select("connected,notify_orders,reply_mode")
        .eq("restaurant_id", task.restaurant_id).single();
      if (config.error) throw config.error;
      const restaurant = await client.from("restaurants").select("is_blocked")
        .eq("id", task.restaurant_id).single();
      if (restaurant.error) throw restaurant.error;
      if (restaurant.data.is_blocked || task.created_at < new Date(Date.now() - 24 * 60 * 60_000).toISOString() ||
        (task.order_status ? !config.data.notify_orders : config.data.reply_mode === "off")) {
        const removed = await client.from("whatsapp_robot_outbox").delete().eq("id", task.id);
        if (removed.error) throw removed.error;
        continue;
      }
      if (!config.data.connected) throw Error("WhatsApp desconectado");

      let text = task.message;
      if (task.order_status) {
        const contact = await client.from("whatsapp_robot_contacts").select("profile_name")
          .eq("restaurant_id", task.restaurant_id).eq("phone", task.phone).maybeSingle();
        if (contact.error) throw contact.error;
        const name = contact.data?.profile_name || cleanText(task.customer_name, 100);
        text = `${greeting(name)} Seu pedido ${task.order_label} ${whatsappStatuses[task.order_status]}.`;
      }
      await evolution(`/message/sendText/${instanceName(task.restaurant_id)}`, "POST", { number: task.phone, text });
      const updated = await client.from("whatsapp_robot_outbox").update({
        sent_at: new Date().toISOString(), message: null, customer_name: null,
      }).eq("id", task.id).eq("attempts", task.attempts);
      if (updated.error) throw updated.error;
      sent++;
    } catch (error) {
      console.error("Falha ao enviar WhatsApp da fila", error instanceof EvolutionError ? `HTTP ${error.status}` : `${(error as Error)?.name}: ${(error as Error)?.message}`);
      failed++;
      const delay = Math.min(30, 2 ** task.attempts);
      await client.from("whatsapp_robot_outbox").update({ available_at: new Date(Date.now() + delay * 60_000).toISOString() })
        .eq("id", task.id).eq("attempts", task.attempts);
    }
  }
  await client.from("whatsapp_robot_outbox").delete().lt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString());
  return reply({ sent, failed });
}

Deno.serve(async request => {
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (request.method !== "POST") return reply({ error: "Método inválido." }, 405);
  try {
    const path = new URL(request.url).pathname.split("/").filter(Boolean).at(-1);
    if (path === "dispatch") return await dispatch(request);
    const body = await request.json();
    if (!body || typeof body !== "object") return reply({ error: "Requisição inválida." }, 400);
    if (path === "incoming") return await receive(request, body);
    if (path !== "whatsapp-robot") return reply({ error: "Rota inválida." }, 404);
    return await manage(request, body);
  } catch (error) {
    const detail = error instanceof EvolutionError ? `HTTP ${error.status}` : `${(error as Error)?.name}: ${(error as Error)?.message}`;
    console.error("Erro na integração WhatsApp", detail);
    let message = "Não foi possível concluir a operação no WhatsApp.";
    if (error instanceof EvolutionError) message = error.status === 401 || error.status === 403 ? "O servidor do WhatsApp recusou a chave de acesso (EVOLUTION_API_KEY)." : `O servidor do WhatsApp respondeu com erro ${error.status}.`;
    else if ((error as Error)?.message === "URL inválida" || error instanceof TypeError && /Invalid URL/i.test(error.message)) message = "O endereço do servidor do WhatsApp (EVOLUTION_API_URL) é inválido: use https:// sem parâmetros.";
    else if ((error as Error)?.name === "TimeoutError") message = "O servidor do WhatsApp demorou demais para responder.";
    else if (error instanceof TypeError) message = "Não foi possível conectar ao servidor do WhatsApp (endereço fora do ar ou certificado inválido).";
    return reply({ error: message }, 502);
  }
});

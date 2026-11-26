export type Rule = { keyword: string; match: "exact" | "contains"; response: string };
export type ReplyMode = "off" | "welcome" | "keywords";

export function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

export function matchRule(text: string, rules: Rule[]) {
  const subject = normalize(text);
  const matches = (rule: Rule) => {
    const keyword = normalize(rule.keyword);
    return Boolean(keyword) && (rule.match === "exact"
      ? subject === keyword
      : ` ${subject} `.includes(` ${keyword} `));
  };
  return rules.find(rule => rule.match === "exact" && matches(rule))
    ?? rules.find(rule => rule.match === "contains" && matches(rule));
}

export function cleanText(input: unknown, max: number) {
  return typeof input === "string" ? input.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").trim().slice(0, max) : "";
}

export function incomingPhone(...addresses: unknown[]) {
  for (const address of addresses) {
    if (typeof address !== "string") continue;
    const number = address.match(/^(\d{8,15})(?::\d+)?@s\.whatsapp\.net$/)?.[1];
    if (number) return number;
  }
  return null;
}

export function greeting(name: string) {
  return name ? `Olá, ${name}!` : "Olá!";
}

export function introduction(bot: string, store: string) {
  return bot ? `Sou ${bot}, assistente da loja ${store}.` : `Sou o assistente da loja ${store}.`;
}

export function expandResponse(response: string, values: Record<string, string>) {
  return response.replace(/\{(nome|loja|robo|cardapio)\}/g, (_, key) => values[key] ?? "");
}

const saoPaulo = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Sao_Paulo", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function withinHours(hours: { day_of_week: number; open_time: string; close_time: string; is_active: boolean }[], date = new Date()) {
  if (hours.length === 0) return true;
  const parts = Object.fromEntries(saoPaulo.formatToParts(date).map(part => [part.type, part.value]));
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday);
  const time = `${parts.hour}:${parts.minute}`;
  return hours.some(row => {
    if (!row.is_active) return false;
    const open = row.open_time.slice(0, 5);
    const close = row.close_time.slice(0, 5);
    if (open <= close) return row.day_of_week === day && time >= open && time <= close;
    return (row.day_of_week === day && time >= open) || ((row.day_of_week + 1) % 7 === day && time <= close);
  });
}

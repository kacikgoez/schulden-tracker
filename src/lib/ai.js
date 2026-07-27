// KI-Anbieter-Konfiguration + Aufrufe (Vision/Text/Tools) inkl. Kosten-Tracking.
import { api } from "./api";

const USD2EUR = 0.86;
const PRICES = [
  ["qwen3-vl-235b", 0.20, 0.88], ["qwen3-asr", 1.475, 4.425], ["qwen3-omni", 0.43, 1.8],
  ["gpt-4o-mini", 0.15, 0.6], ["gemini", 0, 0],
];

export const aiConfig = () => ({
  prov: localStorage.prov || "openrouter",
  model: localStorage.model || "",
  base: localStorage.base || "",
  dictate: localStorage.dictate || "browser",
  amodel: localStorage.amodel || "",
});
export const setAiConfig = (c) => {
  for (const k of ["prov", "model", "base", "dictate", "amodel"]) if (c[k] != null) localStorage[k] = c[k];
};

function rate(model) {
  const m = (model || "").toLowerCase();
  for (const [k, i, o] of PRICES) if (m.includes(k)) return [i, o];
  return [0.5, 1.5];
}

// Kosten je Aufruf in settings.api_usage schreiben; Zeynel-Nutzung als Monatseintrag buchen.
async function track(state, actor, model, tin, tout) {
  const [ri, ro] = rate(model);
  const usd = (tin * ri + tout * ro) / 1e6;
  const arr = [...((state.settings && state.settings.api_usage) || [])];
  arr.push({ ts: new Date().toISOString().slice(0, 19) + "Z", actor, model, usd: +usd.toFixed(6) });
  await api("/settings", "POST", { api_usage: arr }).catch(() => {});
  if (actor === "Zeynel") {
    const month = new Date().toISOString().slice(0, 7);
    const eurAmt = Math.round(arr.filter((u) => u.actor === "Zeynel" && u.ts.startsWith(month)).reduce((s, u) => s + u.usd, 0) * USD2EUR * 100) / 100;
    if (eurAmt >= 0.01)
      await api("/entry", "POST", { id: "api-" + month, date: new Date().toISOString().slice(0, 10), category: "KI-Nutzung", description: "KI-API-Nutzung Zeynel (automatisch)", payer: "Kawa", unit_price: eurAmt, split5050: false }).catch(() => {});
  }
}

export function aiCostLine(state) {
  const month = new Date().toISOString().slice(0, 7);
  const sums = { Kawa: 0, Zeynel: 0 };
  for (const u of (state?.settings?.api_usage || [])) if (u.ts.startsWith(month)) sums[u.actor] = (sums[u.actor] || 0) + u.usd;
  if (!sums.Kawa && !sums.Zeynel) return "";
  const f = (x) => (x * USD2EUR).toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 3 });
  return `KI-Kosten ${month}: Kawa ${f(sums.Kawa)} · Zeynel ${f(sums.Zeynel)}`;
}

export const aiKey = (state) => (state?.settings?.ai_key) || "";
export const aiConfigured = (state) => !!aiKey(state);

function chatBase(c) {
  return c.prov === "gemini" ? "https://generativelanguage.googleapis.com/v1beta/openai"
    : c.prov === "openai" ? "https://api.openai.com/v1"
    : c.prov === "openrouter" ? "https://openrouter.ai/api/v1"
    : (c.base || "https://openrouter.ai/api/v1");
}
function chatModel(c) { return c.model || (c.prov === "openai" ? "gpt-4o-mini" : "qwen/qwen3-vl-235b-a22b-instruct"); }

// Ein Chat/Vision-Aufruf (OpenAI-kompatibel). parts:{text, imageB64?}. tools optional.
export async function aiChat(state, messages, { tools } = {}) {
  const c = aiConfig();
  const base = chatBase(c), model = chatModel(c);
  const headers = { "content-type": "application/json", Authorization: "Bearer " + aiKey(state) };
  if (base.includes("openrouter")) headers["X-Title"] = "Schulden-Tracker";
  const body = { model, messages, temperature: 0.2 };
  if (tools) { body.tools = tools; body.tool_choice = "auto"; }
  const r = await fetch(base.replace(/\/$/, "") + "/chat/completions", { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("KI " + r.status + ": " + (await r.text()).slice(0, 180));
  const j = await r.json();
  await track(state, state.me.name, model, j.usage?.prompt_tokens || 0, j.usage?.completion_tokens || 0);
  return j.choices[0].message;
}

// Streaming-Chat (SSE). onDelta(textStück) wird laufend aufgerufen.
// Gibt die finale Nachricht {content, tool_calls?} zurück und trackt Kosten (falls usage geliefert).
export async function aiChatStream(state, messages, { tools, onDelta } = {}) {
  const c = aiConfig();
  const base = chatBase(c), model = chatModel(c);
  const headers = { "content-type": "application/json", Authorization: "Bearer " + aiKey(state) };
  if (base.includes("openrouter")) headers["X-Title"] = "Schulden-Tracker";
  const body = { model, messages, temperature: 0.2, stream: true, stream_options: { include_usage: true } };
  if (tools) { body.tools = tools; body.tool_choice = "auto"; }
  const r = await fetch(base.replace(/\/$/, "") + "/chat/completions", { method: "POST", headers, body: JSON.stringify(body) });
  if (!r.ok) throw new Error("KI " + r.status + ": " + (await r.text()).slice(0, 180));

  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let buf = "", content = "", usage = null;
  const toolCalls = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") continue;
      let j; try { j = JSON.parse(payload); } catch { continue; }
      if (j.usage) usage = j.usage;
      const d = j.choices?.[0]?.delta;
      if (!d) continue;
      if (d.content) { content += d.content; onDelta?.(d.content); }
      if (d.tool_calls) {
        for (const tc of d.tool_calls) {
          const i = tc.index ?? 0;
          toolCalls[i] ||= { id: tc.id, type: "function", function: { name: "", arguments: "" } };
          if (tc.id) toolCalls[i].id = tc.id;
          if (tc.function?.name) toolCalls[i].function.name += tc.function.name;
          if (tc.function?.arguments) toolCalls[i].function.arguments += tc.function.arguments;
        }
      }
    }
  }
  if (usage) await track(state, state.me.name, model, usage.prompt_tokens || 0, usage.completion_tokens || 0);
  const msg = { role: "assistant", content: content || null };
  const tc = toolCalls.filter(Boolean);
  if (tc.length) msg.tool_calls = tc;
  return msg;
}

// Einfacher Vision/Text-Aufruf, gibt nur den Text zurück.
export async function aiExtract(state, text, imageB64) {
  const content = [{ type: "text", text }];
  if (imageB64) content.push({ type: "image_url", image_url: { url: "data:image/jpeg;base64," + imageB64 } });
  const msg = await aiChat(state, [{ role: "user", content }]);
  return msg.content || "";
}

// Bild verkleinern -> base64 (ohne Präfix)
export function downscale(file, maxDim = 1400, q = 0.82) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const s = Math.min(1, maxDim / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL("image/jpeg", q).split(",")[1]);
    };
    img.onerror = rej;
    img.src = URL.createObjectURL(file);
  });
}

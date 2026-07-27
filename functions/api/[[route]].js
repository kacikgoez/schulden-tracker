/* Cloudflare Pages Function — Speicher-API für den Schulden-Tracker.
 * Gleiche Domain wie die App → kein CORS, kein Token.
 * KV-Binding: DATA. Schlüssel: "keys", "ledger", "auth", "receipt:<id>".
 *
 * Auth: die App sendet X-Auth = hex(SHA-256(DEK)). Server vergleicht
 * SHA-256(X-Auth) mit dem gespeicherten "auth". Nur wer sich einloggen kann
 * (Passwort → DEK), kann Ledger/Belege lesen/schreiben. keys ist lesbar ohne
 * Auth (nur PBKDF2-geschützter Wrapped-DEK), Schreiben von keys braucht Auth.
 */
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json" } });

async function sha256hex(str) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function ok(request, env) {
  const a = request.headers.get("X-Auth") || "";
  const stored = await env.DATA.get("auth");
  return a && stored && (await sha256hex(a)) === stored;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  const seg = params.route || [];
  const path = "/" + (Array.isArray(seg) ? seg.join("/") : seg);
  const m = request.method;

  if (!env.DATA) return json({ error: "KV nicht gebunden" }, 500);

  // keys: GET öffentlich, POST nur mit Auth
  if (path === "/keys") {
    if (m === "GET") { const v = await env.DATA.get("keys"); return json(v ? JSON.parse(v) : null); }
    if (m === "POST") {
      if (!(await ok(request, env))) return json({ error: "unauth" }, 401);
      await env.DATA.put("keys", await request.text()); return json({ ok: true });
    }
  }

  // ledger: alles nur mit Auth
  if (path === "/ledger") {
    if (!(await ok(request, env))) return json({ error: "unauth" }, 401);
    if (m === "GET") { const v = await env.DATA.get("ledger"); return json(v ? JSON.parse(v) : null); }
    if (m === "PUT") { await env.DATA.put("ledger", await request.text()); return json({ ok: true }); }
  }

  // receipts: nur mit Auth
  if (path.startsWith("/receipt/")) {
    if (!(await ok(request, env))) return json({ error: "unauth" }, 401);
    const id = path.slice("/receipt/".length);
    if (m === "GET") { const v = await env.DATA.get("receipt:" + id); return json(v ? JSON.parse(v) : null); }
    if (m === "PUT") { await env.DATA.put("receipt:" + id, await request.text()); return json({ ok: true }); }
  }

  return json({ error: "not found", path }, 404);
}

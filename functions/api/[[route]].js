/* Schulden-Tracker — server-autoritative API (Cloudflare Pages Function + D1).
 * Echtes Login mit Sessions, serverseitiges Passwort-Hashing (PBKDF2-SHA256),
 * serverseitige Validierung aller Änderungen. Kein Client-Krypto.
 *
 * Bindings: env.schulden (D1). Cookie: sess=<token> (HttpOnly, Secure, SameSite=Lax).
 */
const PBKDF2_ITER = 100000;   // Cloudflare-Obergrenze
const PBKDF2_ROUNDS = 4;      // verkettet → effektiv 400k
const CATEGORIES = ["Lebensmittel","Getränke","Beerdigung","Benzin","Autokosten","Reparaturkosten","Werkstatt/TÜV",
  "Miete/Wohnen","Strom/Nebenkosten","Handy/Internet","Versicherung","Behörden/Gebühren","Post/Porto",
  "Mitgliedsbeitrag","Gesundheit/Apotheke","Drogerie/Haushalt","Kleidung","Elektronik/Technik",
  "Restaurant/Café","Reisen/Flüge","ÖPNV/Ticket","Parken","Geschenke","Bildung/Uni","Abo/Streaming",
  "Bargeld/Überweisung","Rückzahlung","KI-Nutzung","Getränke","Sonstiges"];
const PFAND_RATES = { Einweg: 0.25, Mehrweg: 0.15, Bierflasche: 0.08 };
const PEOPLE = ["Kawa", "Zeynel"];

const te = new TextEncoder();
const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...headers } });
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
function hex(buf){ return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,"0")).join(""); }
function randHex(n){ const a=new Uint8Array(n); crypto.getRandomValues(a); return hex(a); }

async function pbkdf2(pw, saltB64){
  const salt = Uint8Array.from(atob(saltB64), c=>c.charCodeAt(0));
  let material = te.encode(pw);
  for(let i=0;i<PBKDF2_ROUNDS;i++){
    const base = await crypto.subtle.importKey("raw", material, "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({name:"PBKDF2", salt, iterations:PBKDF2_ITER, hash:"SHA-256"}, base, 256);
    material = new Uint8Array(bits);
  }
  return b64(material);
}
function ctEq(a, b){ if(a.length!==b.length) return false; let r=0; for(let i=0;i<a.length;i++) r|=a.charCodeAt(i)^b.charCodeAt(i); return r===0; }

function cookies(request){
  const h = request.headers.get("Cookie") || "";
  return Object.fromEntries(h.split(";").map(s=>s.trim().split("=").map(decodeURIComponent)).filter(x=>x[0]));
}
async function currentUser(request, env){
  const tok = cookies(request).sess;
  if(!tok) return null;
  const row = await env.schulden.prepare("SELECT user, expires FROM sessions WHERE token=?").bind(tok).first();
  if(!row || row.expires < Date.now()) return null;
  const u = await env.schulden.prepare("SELECT name, is_admin FROM users WHERE name=?").bind(row.user).first();
  return u ? { name: u.name, is_admin: !!u.is_admin, token: tok } : null;
}
const nowIso = () => new Date().toISOString().slice(0,19)+"Z";
const newId = (p) => p + randHex(4);

async function logEvent(env, action, entryId, before, after, actor){
  await env.schulden.prepare("INSERT INTO history (id,ts,actor,action,entry,before,after) VALUES (?,?,?,?,?,?,?)")
    .bind(newId("h"), nowIso(), actor, action, entryId,
      before?JSON.stringify(before):null, after?JSON.stringify(after):null).run();
}
const ENTRY_COLS = ["id","date","category","description","payer","qty","unit_price","split5050",
  "pfand_qty","pfand_type","pay_status","pay_method","claimed_by","claimed_ts","confirmed_by","confirmed_ts",
  "receipt","receipt_note","mt","created_by"];
function rowToEntry(r){
  const e={};
  for(const c of ENTRY_COLS){ if(r[c]!==null && r[c]!==undefined) e[c]=r[c]; }
  e.split5050 = !!r.split5050;
  return e;
}
async function getEntry(env, id){ const r = await env.schulden.prepare("SELECT * FROM entries WHERE id=?").bind(id).first(); return r?rowToEntry(r):null; }

function validateEntry(e){
  if(!PEOPLE.includes(e.payer)) return "Zahler ungültig";
  if(!CATEGORIES.includes(e.category)) return "Kategorie ungültig";
  if(!/^\d{4}-\d{2}-\d{2}$/.test(e.date||"")) return "Datum ungültig";
  if(!(typeof e.unit_price==="number" && isFinite(e.unit_price))) return "Preis ungültig";
  if(!e.description || !e.description.trim()) return "Beschreibung fehlt";
  if(e.pfand_qty && e.category!=="Getränke") return "Pfand nur bei Getränke";
  if(e.pfand_type && !PFAND_RATES[e.pfand_type]) return "Pfand-Art ungültig";
  return null;
}
async function upsertEntry(env, e){
  const vals = ENTRY_COLS.map(c => {
    if(c==="split5050") return e.split5050?1:0;
    return (e[c]===undefined||e[c]==="") ? null : e[c];
  });
  await env.schulden.prepare(
    `INSERT INTO entries (${ENTRY_COLS.join(",")}) VALUES (${ENTRY_COLS.map(()=>"?").join(",")})
     ON CONFLICT(id) DO UPDATE SET ${ENTRY_COLS.slice(1).map(c=>`${c}=excluded.${c}`).join(",")}`
  ).bind(...vals).run();
}
const amount = e => Math.round((e.qty||1)*e.unit_price*100)/100;

export async function onRequest(context){
  try { return await handle(context); }
  catch(e){ return json({ error: "server", detail: String(e && e.stack || e) }, 500); }
}
async function handle(context){
  const { request, env, params } = context;
  if(!env.schulden) return json({ error: "D1 nicht gebunden" }, 500);
  const seg = params.route || [];
  const p = "/" + (Array.isArray(seg) ? seg.join("/") : seg);
  const m = request.method;
  const body = async () => { try { return await request.json(); } catch { return {}; } };

  // ---- Login / Logout / Me ----
  if(p === "/login" && m === "POST"){
    const { name, password } = await body();
    const u = await env.schulden.prepare("SELECT * FROM users WHERE name=?").bind(name||"").first();
    if(!u) return json({ error: "Falscher Login" }, 401);
    const h = await pbkdf2(password||"", u.pw_salt);
    if(!ctEq(h, u.pw_hash)) return json({ error: "Falscher Login" }, 401);
    const token = randHex(32), expires = Date.now() + 30*864e5;
    await env.schulden.prepare("INSERT INTO sessions (token,user,expires) VALUES (?,?,?)").bind(token, u.name, expires).run();
    return json({ name: u.name, is_admin: !!u.is_admin }, 200,
      { "Set-Cookie": `sess=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${30*86400}` });
  }
  if(p === "/logout" && m === "POST"){
    const tok = cookies(request).sess;
    if(tok) await env.schulden.prepare("DELETE FROM sessions WHERE token=?").bind(tok).run();
    return json({ ok: true }, 200, { "Set-Cookie": "sess=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0" });
  }

  const me = await currentUser(request, env);
  if(p === "/me"){ return me ? json({ name: me.name, is_admin: me.is_admin }) : json({ error: "unauth" }, 401); }

  // Ab hier: Login erforderlich
  if(!me) return json({ error: "unauth" }, 401);

  // ---- Gesamtzustand ----
  if(p === "/state" && m === "GET"){
    const entries = (await env.schulden.prepare("SELECT * FROM entries").all()).results.map(rowToEntry);
    const history = (await env.schulden.prepare("SELECT * FROM history ORDER BY ts").all()).results.map(h=>({
      id:h.id, ts:h.ts, actor:h.actor, action:h.action, entry:h.entry,
      before:h.before?JSON.parse(h.before):null, after:h.after?JSON.parse(h.after):null }));
    const users = (await env.schulden.prepare("SELECT name, is_admin FROM users").all()).results.map(u=>({name:u.name, is_admin:!!u.is_admin}));
    const srows = (await env.schulden.prepare("SELECT k,v FROM settings").all()).results;
    const settings = {}; for(const s of srows){ try{ settings[s.k]=JSON.parse(s.v); }catch{ settings[s.k]=s.v; } }
    return json({ me:{name:me.name, is_admin:me.is_admin}, users, entries, history, settings,
      categories: CATEGORIES, pfand_rates: PFAND_RATES, people: PEOPLE });
  }

  // ---- Eintrag anlegen/ändern ----
  if(p === "/entry" && m === "POST"){
    const e = await body();
    const clean = {
      id: e.id || newId("e"), date: e.date, category: e.category, description: (e.description||"").trim(),
      payer: e.payer, qty: e.qty?+e.qty:null, unit_price: +e.unit_price, split5050: !!e.split5050,
      pfand_qty: e.pfand_qty?+e.pfand_qty:null, pfand_type: e.pfand_qty?(e.pfand_type||"Einweg"):null,
      mt: nowIso()
    };
    const err = validateEntry(clean);
    if(err) return json({ error: err }, 400);
    const before = e.id ? await getEntry(env, e.id) : null;
    if(before){ // Metadaten (Beleg/Zahlung) erhalten
      for(const k of ["receipt","receipt_note","pay_status","pay_method","claimed_by","claimed_ts","confirmed_by","confirmed_ts","created_by"])
        if(before[k]!==undefined) clean[k]=before[k];
    } else {
      clean.created_by = me.name;
      if(e.receipt){ clean.receipt = e.receipt; clean.receipt_note = e.receipt_note || null; }
    }
    await upsertEntry(env, clean);
    await logEvent(env, before?"edit":"add", clean.id, before, clean, me.name);
    return json({ ok: true, entry: clean });
  }
  if(p.startsWith("/entry/") && m === "DELETE"){
    const id = p.slice("/entry/".length);
    const before = await getEntry(env, id);
    if(!before) return json({ error: "nicht gefunden" }, 404);
    await env.schulden.prepare("DELETE FROM entries WHERE id=?").bind(id).run();
    await logEvent(env, "delete", id, before, null, me.name);
    return json({ ok: true });
  }

  // ---- Zahlung melden / bestätigen / ablehnen ----
  if(p === "/pay" && m === "POST"){
    const { amount: amt, method } = await body();
    const a = Math.round((+amt||0)*100)/100;
    if(a < 0.01) return json({ error: "Betrag fehlt" }, 400);
    // Wer meldet, ist der Zahler; der andere ist Empfänger und bestätigt.
    const debtor = me.name, creditor = PEOPLE.find(x => x !== me.name);
    const meth = method==="Bar" ? "Bar" : "Überweisung";
    const e = { id:newId("e"), date:new Date().toISOString().slice(0,10), category:"Rückzahlung",
      description:`Ausgleichszahlung ${meth==="Bar"?"bar ":""}(${debtor} → ${creditor})`, payer:debtor,
      unit_price:a, split5050:false, mt:nowIso(), pay_status:"pending", pay_method:meth,
      claimed_by:me.name, claimed_ts:nowIso(), created_by:me.name };
    await upsertEntry(env, e);
    await logEvent(env, "claim", e.id, null, e, me.name);
    return json({ ok: true });
  }
  if(p.startsWith("/confirm/") && m === "POST"){
    const id = p.slice("/confirm/".length);
    const e = await getEntry(env, id);
    if(!e || e.pay_status!=="pending") return json({ error: "nicht offen" }, 404);
    const creditor = e.payer==="Kawa" ? "Zeynel" : "Kawa";
    if(me.name !== creditor) return json({ error: "nur der Empfänger bestätigt" }, 403);
    const before = {...e};
    e.pay_status="confirmed"; e.confirmed_by=me.name; e.confirmed_ts=nowIso(); e.mt=nowIso();
    await upsertEntry(env, e);
    await logEvent(env, "confirm", id, before, e, me.name);
    return json({ ok: true });
  }
  if(p.startsWith("/reject/") && m === "POST"){
    const id = p.slice("/reject/".length);
    const e = await getEntry(env, id);
    if(!e || e.pay_status!=="pending") return json({ error: "nicht offen" }, 404);
    const creditor = e.payer==="Kawa" ? "Zeynel" : "Kawa";
    if(me.name !== creditor) return json({ error: "nur der Empfänger" }, 403);
    await env.schulden.prepare("DELETE FROM entries WHERE id=?").bind(id).run();
    await logEvent(env, "reject", id, e, null, me.name);
    return json({ ok: true });
  }

  // ---- Passwörter ----
  if(p === "/password" && m === "POST"){
    const { new_password } = await body();
    if((new_password||"").length < 4) return json({ error: "Passwort zu kurz" }, 400);
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const h = await pbkdf2(new_password, salt);
    await env.schulden.prepare("UPDATE users SET pw_hash=?, pw_salt=? WHERE name=?").bind(h, salt, me.name).run();
    return json({ ok: true });
  }
  if(p === "/admin/password" && m === "POST"){
    if(!me.is_admin) return json({ error: "nur Admin" }, 403);
    const { name, new_password } = await body();
    if(!PEOPLE.includes(name)) return json({ error: "Nutzer ungültig" }, 400);
    if((new_password||"").length < 4) return json({ error: "Passwort zu kurz" }, 400);
    const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
    const h = await pbkdf2(new_password, salt);
    await env.schulden.prepare("INSERT INTO users (name,pw_hash,pw_salt,is_admin) VALUES (?,?,?,0) ON CONFLICT(name) DO UPDATE SET pw_hash=?, pw_salt=?")
      .bind(name, h, salt, h, salt).run();
    return json({ ok: true });
  }

  // ---- Einstellungen ----
  if(p === "/settings" && m === "POST"){
    const patch = await body();
    for(const [k,v] of Object.entries(patch)){
      await env.schulden.prepare("INSERT INTO settings (k,v) VALUES (?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v")
        .bind(k, JSON.stringify(v)).run();
    }
    return json({ ok: true });
  }

  // ---- Belege ----
  if(p === "/receipt" && m === "POST"){
    const { data } = await body();
    if(!data) return json({ error: "kein Bild" }, 400);
    const id = newId("r");
    await env.schulden.prepare("INSERT INTO receipts (id,data) VALUES (?,?)").bind(id, data).run();
    return json({ ok: true, id });
  }
  if(p.startsWith("/receipt/") && m === "GET"){
    const id = p.slice("/receipt/".length);
    const r = await env.schulden.prepare("SELECT data FROM receipts WHERE id=?").bind(id).first();
    return r ? json({ data: r.data }) : json({ error: "nicht gefunden" }, 404);
  }

  return json({ error: "not found", path: p }, 404);
}

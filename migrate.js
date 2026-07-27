// Migriert die (entschlüsselten) Bestandsdaten nach D1-SQL.
// Aufruf: node migrate.js > migrate.sql
// Nutzt DEK aus $LEDGER_DEK/Schlüsselbund und die Passwörter aus den ENV
// KAWA_PW / ZEYNEL_PW (für die Login-Hashes).
const fs = require("fs");
const { execSync } = require("child_process");
const { webcrypto: wc } = require("crypto");
const b64d = s => Uint8Array.from(Buffer.from(s, "base64"));
const b64 = buf => Buffer.from(new Uint8Array(buf)).toString("base64");

function dekRaw(){
  let code = process.env.LEDGER_DEK;
  if(!code){ try{ code = execSync("security find-generic-password -s schulden-tracker-dek -w",{encoding:"utf8"}).trim(); }catch{} }
  const B32="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const s=code.toUpperCase().replace(/[^A-Z2-7]/g,""); let bits=0,val=0,o=[];
  for(const ch of s){const i=B32.indexOf(ch);if(i<0)continue;val=(val<<5)|i;bits+=5;if(bits>=8){o.push((val>>(bits-8))&255);bits-=8;}}
  return new Uint8Array(o);
}
async function pbkdf2(pw){
  const salt = wc.getRandomValues(new Uint8Array(16));
  const base = await wc.subtle.importKey("raw", new TextEncoder().encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await wc.subtle.deriveBits({name:"PBKDF2", salt, iterations:210000, hash:"SHA-256"}, base, 256);
  return { hash: b64(bits), salt: b64(salt) };
}
const q = v => v===null||v===undefined ? "NULL" : (typeof v==="number" ? String(v) : "'"+String(v).replace(/'/g,"''")+"'");

(async () => {
  const env = JSON.parse(fs.readFileSync("data/ledger.enc"));
  const raw = dekRaw();
  const key = await wc.subtle.importKey("raw", raw, {name:"AES-GCM"}, false, ["decrypt"]);
  const pt = await wc.subtle.decrypt({name:"AES-GCM", iv:b64d(env.iv)}, key, b64d(env.ct));
  const data = JSON.parse(new TextDecoder().decode(pt));

  const out = [];
  out.push("DELETE FROM users; DELETE FROM entries; DELETE FROM history; DELETE FROM settings; DELETE FROM sessions;");

  const kawa = await pbkdf2(process.env.KAWA_PW);
  const zeynel = await pbkdf2(process.env.ZEYNEL_PW);
  out.push(`INSERT INTO users (name,pw_hash,pw_salt,is_admin) VALUES ('Kawa',${q(kawa.hash)},${q(kawa.salt)},1);`);
  out.push(`INSERT INTO users (name,pw_hash,pw_salt,is_admin) VALUES ('Zeynel',${q(zeynel.hash)},${q(zeynel.salt)},0);`);

  const cols = ["id","date","category","description","payer","qty","unit_price","split5050",
    "pfand_qty","pfand_type","pay_status","pay_method","claimed_by","claimed_ts","confirmed_by","confirmed_ts",
    "receipt","receipt_note","mt","created_by"];
  for(const e of data.entries){
    const vals = cols.map(c => c==="split5050" ? (e.split5050?1:0) : (e[c]===undefined?null:e[c]));
    out.push(`INSERT INTO entries (${cols.join(",")}) VALUES (${vals.map(q).join(",")});`);
  }
  for(const h of (data.history||[])){
    out.push(`INSERT INTO history (id,ts,actor,action,entry,before,after) VALUES (${q(h.id)},${q(h.ts)},${q(h.actor)},${q(h.action)},${q(h.entry)},${q(h.before?JSON.stringify(h.before):null)},${q(h.after?JSON.stringify(h.after):null)});`);
  }
  const s = data.settings || {};
  for(const [k,v] of Object.entries(s)){
    out.push(`INSERT INTO settings (k,v) VALUES (${q(k)},${q(JSON.stringify(v))});`);
  }
  process.stdout.write(out.join("\n") + "\n");
  process.stderr.write(`Migration: ${data.entries.length} Einträge, ${(data.history||[]).length} History, ${Object.keys(s).length} Settings\n`);
})();

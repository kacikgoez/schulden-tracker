// Säet keys/ledger/auth in den KV-Namespace. Aufruf: node seed-kv.js <KV_ID>
// Liest data/keys.enc, data/ledger.enc und den DEK (Wiederherstellungscode) aus dem
// Schlüsselbund-Service 'schulden-tracker-dek' bzw. $LEDGER_DEK.
const fs = require("fs");
const { execSync } = require("child_process");
const { webcrypto } = require("crypto");
const KV = process.argv[2];
if (!KV) { console.error("KV-ID fehlt"); process.exit(1); }

function dekRaw() {
  let code = process.env.LEDGER_DEK;
  if (!code) {
    try { code = execSync("security find-generic-password -s schulden-tracker-dek -w", { encoding: "utf8" }).trim(); }
    catch (_e) {}
  }
  if (!code) { console.error("Kein DEK gefunden (LEDGER_DEK / Schlüsselbund)."); process.exit(1); }
  const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const s = code.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0, val = 0; const out = [];
  for (const ch of s) { const i = B32.indexOf(ch); if (i < 0) continue; val = (val << 5) | i; bits += 5; if (bits >= 8) { out.push((val >> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
async function sha256hex(buf) {
  const h = await webcrypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function put(key, valueFile, isText) {
  const val = isText ? valueFile : fs.readFileSync(valueFile, "utf8");
  const tmp = require("os").tmpdir() + "/kv_" + key.replace(/[^a-z]/gi, "") + ".txt";
  fs.writeFileSync(tmp, val);
  execSync(`npx --yes wrangler@latest kv key put --namespace-id ${KV} ${JSON.stringify(key)} --path ${JSON.stringify(tmp)}`, { stdio: "inherit" });
  fs.unlinkSync(tmp);
}
(async () => {
  const raw = dekRaw();
  const authKey = await sha256hex(raw);          // = X-Auth der App (hex(SHA256(DEK)))
  const authHash = await sha256hex(Buffer.from(authKey, "utf8")); // server-seitig gespeichert
  put("keys", "data/keys.enc");
  put("ledger", "data/ledger.enc");
  put("auth", authHash, true);
  console.log("KV geseedet: keys, ledger, auth");
})();

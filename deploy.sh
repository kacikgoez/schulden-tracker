#!/usr/bin/env bash
# Deployt alles auf Cloudflare (Pages + Functions + KV). Dauerhaft kostenlos.
# Voraussetzung: einmalig `npx wrangler login` (oder CLOUDFLARE_API_TOKEN gesetzt).
set -euo pipefail
cd "$(dirname "$0")"

PROJECT="schulden-tracker"
WR="npx --yes wrangler@latest"

echo "==> KV-Namespace anlegen (falls noch nicht vorhanden)"
KV_OUT="$($WR kv namespace create DATA 2>&1 || true)"
echo "$KV_OUT"
KV_ID="$(printf '%s' "$KV_OUT" | grep -oE '[0-9a-f]{32}' | head -1)"
if [ -z "${KV_ID:-}" ]; then
  echo "Konnte KV-ID nicht ermitteln. Vorhandene Namespaces:"
  $WR kv namespace list
  read -r -p "KV-ID hier einfügen: " KV_ID
fi
echo "KV_ID=$KV_ID"

# wrangler.toml mit der echten KV-ID versehen
sed -i.bak "s/REPLACE_WITH_KV_ID/$KV_ID/" wrangler.toml && rm -f wrangler.toml.bak

echo "==> Daten in KV einsäen (aus dem lokalen data/-Ordner + DEK aus dem Schlüsselbund)"
node seed-kv.js "$KV_ID"

echo "==> Pages-Projekt deployen"
$WR pages project create "$PROJECT" --production-branch main 2>/dev/null || true
$WR pages deploy . --project-name "$PROJECT" --commit-dirty=true

echo
echo "==> KV an das Pages-Projekt binden (Production):"
echo "    Dashboard → Workers & Pages → $PROJECT → Settings → Functions → KV bindings"
echo "    Variable: DATA   →   Namespace-ID: $KV_ID"
echo "    (einmalig; danach jeder weitere Deploy automatisch)"
echo
echo "Fertig. URL steht oben (…pages.dev)."

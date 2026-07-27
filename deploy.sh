#!/usr/bin/env bash
# Deployt alles auf Cloudflare Pages (App + Functions + KV). Kostenlos.
# Voraussetzung: einmal `npx wrangler login`.
set -euo pipefail
cd "$(dirname "$0")"
PROJECT="schulden-kz"
KV_ID="01b1366060b64ccf8cdb19b48d770070"
WR="npx --yes wrangler@latest"

# Sauberes Staging: NUR App-Dateien (kein data/, kein ledger.py) — verhindert Datenleck.
ST="$(mktemp -d)"
mkdir -p "$ST/functions/api"
cp index.html sw.js manifest.webmanifest .nojekyll icon-192.png icon-512.png apple-touch-icon.png "$ST/"
cp "functions/api/[[route]].js" "$ST/functions/api/[[route]].js"
cat > "$ST/wrangler.toml" <<TOML
name = "$PROJECT"
compatibility_date = "2026-01-01"
pages_build_output_dir = "."
[[kv_namespaces]]
binding = "DATA"
id = "$KV_ID"
TOML

# KV mit aktuellen Daten seeden (nur nötig bei Erststart / Reset)
if [ "${SEED:-0}" = "1" ]; then node seed-kv.js "$KV_ID"; fi

( cd "$ST" && $WR pages deploy . --project-name "$PROJECT" --branch main --commit-dirty=true )
rm -rf "$ST"
echo "Fertig: https://$PROJECT.pages.dev"

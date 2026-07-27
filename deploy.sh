#!/usr/bin/env bash
# Deployt App + server-autoritative API (Cloudflare Pages Functions + D1). Kostenlos.
# Voraussetzung: einmal `npx wrangler login`.
set -euo pipefail
cd "$(dirname "$0")"
PROJECT="schulden-kz"
D1_ID="75325642-343e-4093-9124-40c52b91a1d7"
WR="npx --yes wrangler@latest"

ST="$(mktemp -d)"
mkdir -p "$ST/functions/api"
cp index.html sw.js manifest.webmanifest .nojekyll icon-192.png icon-512.png apple-touch-icon.png "$ST/"
cp "functions/api/[[route]].js" "$ST/functions/api/[[route]].js"
cat > "$ST/wrangler.toml" <<TOML
name = "$PROJECT"
compatibility_date = "2026-01-01"
pages_build_output_dir = "."
[[d1_databases]]
binding = "schulden"
database_name = "schulden"
database_id = "$D1_ID"
TOML

( cd "$ST" && $WR pages deploy . --project-name "$PROJECT" --branch main --commit-dirty=true )
rm -rf "$ST"
echo "Fertig: https://$PROJECT.pages.dev"

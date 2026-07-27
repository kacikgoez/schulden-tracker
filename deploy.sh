#!/usr/bin/env bash
# Baut die React-App (Vite) und deployt sie samt Functions + D1 nach Cloudflare Pages.
set -euo pipefail
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
npm run build
npx --yes wrangler@latest pages deploy dist --project-name schulden-kz --branch main --commit-dirty=true
echo "Fertig: https://schulden-kz.pages.dev"

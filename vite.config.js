import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev-Proxy leitet /api an die lokale Wrangler-Functions-Instanz (wrangler pages dev) weiter.
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://127.0.0.1:8788" } },
  build: { outDir: "dist", sourcemap: false },
});

// Dünner Fetch-Wrapper um die server-autoritative API (Cloudflare Functions + D1).
export async function api(path, method = "GET", body) {
  const opt = { method, credentials: "same-origin" };
  if (body !== undefined) {
    opt.headers = { "content-type": "application/json" };
    opt.body = JSON.stringify(body);
  }
  const res = await fetch("/api" + path, opt);
  let data = {};
  try { data = await res.json(); } catch { /* leer */ }
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

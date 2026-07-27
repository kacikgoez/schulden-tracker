// Reine Rechen-/Formatierlogik (ohne UI).
export const eur = (x) =>
  (x ?? 0).toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export const amount = (e) => Math.round((e.qty || 1) * e.unit_price * 100) / 100;
export const owedOf = (e) => (e.split5050 ? amount(e) / 2 : amount(e));
export const isPending = (e) => e.pay_status === "pending";
export const monthOf = (e) => e.date.slice(0, 7);

export const MONTHS = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
export const mLabel = (m) => `${MONTHS[+m.slice(5, 7) - 1]} ${m.slice(0, 4)}`;
export const thisMonth = () => new Date().toISOString().slice(0, 7);
export const today = () => new Date().toISOString().slice(0, 10);

export function netOf(entries) {
  let k = 0, z = 0;
  for (const e of entries) {
    if (isPending(e)) continue;
    if (e.payer === "Kawa") k += owedOf(e);
    else z += owedOf(e);
  }
  return Math.round((k - z) * 100) / 100;
}

export function monthsList(entries) {
  const s = new Set(entries.map(monthOf));
  s.add(thisMonth());
  return [...s].sort();
}

// >0: Zeynel schuldet Kawa
export function balanceLabel(total) {
  if (Math.abs(total) < 0.005) return "ausgeglichen";
  return total > 0 ? "Zeynel zahlt Kawa" : "Kawa zahlt Zeynel";
}

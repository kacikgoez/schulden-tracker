import { useState, useRef, useEffect } from "react";
import {
  Dialog, DialogTitle, Box, IconButton, TextField, Typography, Paper, Stack, Button,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { useAppState } from "../lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { aiChat, aiConfigured, aiCostLine } from "../lib/ai";
import { netOf, amount, owedOf, monthOf, isPending, thisMonth } from "../lib/format";

const TOOLS = [
  { type: "function", function: { name: "get_balance", description: "Aktuellen Saldo abrufen.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "list_entries", description: "Einträge eines Monats mit IDs.", parameters: { type: "object", properties: { month: { type: "string", description: "JJJJ-MM" } } } } },
  { type: "function", function: { name: "add_entry", description: "Ausgabe anlegen (Zahler = angemeldeter Nutzer, andere schuldet).", parameters: { type: "object", properties: { date: { type: "string" }, category: { type: "string" }, description: { type: "string" }, amount: { type: "number" }, qty: { type: "integer" }, split5050: { type: "boolean" }, pfand_qty: { type: "integer" }, pfand_type: { type: "string" } }, required: ["category", "description", "amount"] } } },
  { type: "function", function: { name: "edit_entry", description: "Eintrag ändern (per ID).", parameters: { type: "object", properties: { id: { type: "string" }, date: { type: "string" }, category: { type: "string" }, description: { type: "string" }, amount: { type: "number" }, qty: { type: "integer" }, split5050: { type: "boolean" } }, required: ["id"] } } },
  { type: "function", function: { name: "delete_entry", description: "Eintrag löschen (per ID).", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "list_recurring", description: "Abos auflisten.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "add_recurring", description: "Abo/Fixkosten anlegen (monatlich automatisch).", parameters: { type: "object", properties: { category: { type: "string" }, description: { type: "string" }, amount: { type: "number" }, split5050: { type: "boolean" }, day: { type: "integer" }, active_from: { type: "string" }, active_until: { type: "string" } }, required: ["category", "description", "amount"] } } },
  { type: "function", function: { name: "delete_recurring", description: "Abo löschen (per ID).", parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] } } },
  { type: "function", function: { name: "report_payment", description: "Ausgleichszahlung melden.", parameters: { type: "object", properties: { amount: { type: "number" }, method: { type: "string" } }, required: ["amount"] } } },
];
const TOOL_LABEL = {
  add_entry: "➕ Eintrag angelegt", edit_entry: "✎ geändert", delete_entry: "🗑 gelöscht",
  add_recurring: "🔁 Abo angelegt", delete_recurring: "🗑 Abo gelöscht", report_payment: "💸 Zahlung gemeldet",
  get_balance: "📊 Saldo geprüft", list_entries: "🔎 Einträge gelesen", list_recurring: "🔎 Abos gelesen",
};

export default function Chat({ open, onClose }) {
  const { data } = useAppState();
  const qc = useQueryClient();
  const [msgs, setMsgs] = useState([]);      // UI-Nachrichten {role, text}
  const convo = useRef([]);                  // LLM-Verlauf
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef();
  useEffect(() => { logRef.current?.scrollTo(0, 1e9); }, [msgs]);

  if (!data) return null;
  const me = data.me.name;
  const other = data.users.map((u) => u.name).find((n) => n !== me) || "";

  const freshState = async () => (await api("/state"));

  async function execTool(name, a) {
    const s = await freshState();
    if (name === "get_balance") { const t = netOf(s.entries); return { saldo_eur: Math.abs(t), richtung: t >= 0 ? "Zeynel schuldet Kawa" : (t < 0 ? "Kawa schuldet Zeynel" : "ausgeglichen") }; }
    if (name === "list_entries") { const mo = a.month || thisMonth(); return s.entries.filter((e) => monthOf(e) === mo).map((e) => ({ id: e.id, date: e.date, category: e.category, description: e.description, payer: e.payer, betrag: amount(e), split5050: e.split5050, anteil: owedOf(e), status: e.pay_status || "normal" })); }
    if (name === "list_recurring") return (s.recurring || []).map((r) => ({ id: r.id, description: r.description, amount: r.amount, category: r.category, payer: r.payer, active_from: r.active_from, active_until: r.active_until }));
    if (name === "add_entry") { const e = { date: a.date || new Date().toISOString().slice(0, 10), category: a.category, description: a.description, unit_price: a.amount, split5050: !!a.split5050 }; if (a.qty) e.qty = a.qty; if (a.pfand_qty) { e.pfand_qty = a.pfand_qty; e.pfand_type = a.pfand_type || "Einweg"; } const r = await api("/entry", "POST", e); return { ok: true, id: r.entry.id }; }
    if (name === "edit_entry") { const cur = s.entries.find((x) => x.id === a.id); if (!cur) return { error: "nicht gefunden" }; const e = { id: a.id, date: a.date || cur.date, category: a.category || cur.category, description: a.description || cur.description, unit_price: a.amount != null ? a.amount : cur.unit_price, split5050: a.split5050 != null ? a.split5050 : cur.split5050 }; const q = a.qty != null ? a.qty : cur.qty; if (q) e.qty = q; await api("/entry", "POST", e); return { ok: true }; }
    if (name === "delete_entry") { await api("/entry/" + a.id, "DELETE"); return { ok: true }; }
    if (name === "add_recurring") { const r = await api("/recurring", "POST", { category: a.category, description: a.description, amount: a.amount, split5050: !!a.split5050, day: a.day || 1, active_from: a.active_from || new Date().toISOString().slice(0, 10), active_until: a.active_until || null }); return { ok: true, id: r.id }; }
    if (name === "delete_recurring") { await api("/recurring/" + a.id, "DELETE"); return { ok: true }; }
    if (name === "report_payment") { await api("/pay", "POST", { amount: a.amount, method: a.method || "Bar" }); return { ok: true }; }
    return { error: "unbekannt" };
  }

  function systemPrompt() {
    return `Du bist der Assistent im Schulden-Tracker und handelst als ${me}. Neue Einträge werden IMMER ${me} als Zahler zugeordnet → ${other} schuldet dann. Nutze Tools für Ausgaben/Abos/Zahlungen. Erfinde keine IDs (hole sie via list_entries). Frage bei Unklarheit kurz nach. Kategorien: ${data.categories.join(", ")}. Heute: ${new Date().toISOString().slice(0, 10)}. Antworte knapp auf Deutsch und bestätige, was du getan hast.`;
  }

  const send = async () => {
    const text = input.trim(); if (!text || busy) return;
    if (!aiConfigured(data)) { setMsgs((m) => [...m, { role: "bot", text: "Kein KI-Schlüssel — unter ⚙︎ eintragen." }]); return; }
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    if (!convo.current.length) convo.current.push({ role: "system", content: systemPrompt() });
    convo.current.push({ role: "user", content: text });
    setBusy(true);
    let dirty = false;
    try {
      for (let round = 0; round < 8; round++) {
        const msg = await aiChat(data, convo.current, { tools: TOOLS });
        convo.current.push(msg);
        if (msg.tool_calls?.length) {
          for (const tc of msg.tool_calls) {
            let args = {}; try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
            let result; try { result = await execTool(tc.function.name, args); } catch (e) { result = { error: e.message }; }
            if (!["get_balance", "list_entries", "list_recurring"].includes(tc.function.name)) dirty = true;
            setMsgs((m) => [...m, { role: "tool", text: (TOOL_LABEL[tc.function.name] || tc.function.name) + (result?.error ? ` — ${result.error}` : "") }]);
            convo.current.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
          }
          continue;
        }
        setMsgs((m) => [...m, { role: "bot", text: msg.content || "(fertig)" }]);
        break;
      }
    } catch (e) { setMsgs((m) => [...m, { role: "bot", text: "Fehler: " + e.message }]); }
    setBusy(false);
    if (dirty) qc.invalidateQueries({ queryKey: ["state"] });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth
      PaperProps={{ sx: { m: 0, ml: "auto", height: "100dvh", maxHeight: "100dvh", width: { xs: "100vw", sm: 440 }, borderRadius: { xs: 0, sm: "22px 0 0 22px" } } }}>
      <Box sx={{ display: "flex", alignItems: "center", p: 2, borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h3">💬 Assistent</Typography>
          <Typography variant="caption" color="text.secondary">handelt als {me} · {aiCostLine(data) || "KI-Kosten: —"}</Typography>
        </Box>
        <Button size="small" onClick={() => { setMsgs([]); convo.current = []; }}>Neu</Button>
        <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
      </Box>
      <Box ref={logRef} sx={{ flex: 1, overflowY: "auto", p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
        {!msgs.length && <Typography variant="body2" color="text.secondary">Hi {me}! Z. B. „trag 12,50 € Tanken ein, 50:50" oder „was schuldet mir {other}?".</Typography>}
        {msgs.map((m, i) => m.role === "tool"
          ? <Typography key={i} variant="caption" align="center" color="text.secondary" sx={{ bgcolor: "action.hover", borderRadius: 5, px: 1.5, py: 0.4, alignSelf: "center" }}>{m.text}</Typography>
          : <Paper key={i} elevation={0} sx={{ p: 1.25, maxWidth: "82%", alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              bgcolor: m.role === "user" ? "primary.main" : "action.hover", color: m.role === "user" ? "#fff" : "text.primary",
              borderRadius: 3, whiteSpace: "pre-wrap" }}>{m.text}</Paper>)}
        {busy && <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>…</Typography>}
      </Box>
      <Box sx={{ display: "flex", gap: 1, p: 1.5, borderTop: 1, borderColor: "divider" }}>
        <TextField fullWidth size="small" placeholder="Nachricht…" value={input}
          onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <IconButton color="primary" onClick={send} disabled={busy}><SendRoundedIcon /></IconButton>
      </Box>
    </Dialog>
  );
}

import { useState, useRef, useEffect } from "react";
import {
  Drawer, Box, IconButton, TextField, Typography, Paper, Button, Avatar, Fade,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { useAppState } from "../lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { aiChatStream, aiConfigured, aiCostLine } from "../lib/ai";
import { netOf, amount, owedOf, monthOf, thisMonth } from "../lib/format";

const TOOLS = [
  { type: "function", function: { name: "get_balance", description: "Aktuellen Saldo abrufen.", parameters: { type: "object", properties: {} } } },
  { type: "function", function: { name: "list_entries", description: "Einträge eines Monats mit IDs.", parameters: { type: "object", properties: { month: { type: "string", description: "JJJJ-MM" } } } } },
  { type: "function", function: { name: "find_entries", description: "Einträge über ALLE Monate nach Text und/oder Datum durchsuchen (liefert IDs). Damit findest du einen vom Nutzer beschriebenen Eintrag selbst.", parameters: { type: "object", properties: { query: { type: "string", description: "Teil der Beschreibung, z. B. 'Tanken Star'" }, date: { type: "string", description: "JJJJ-MM-TT" }, month: { type: "string", description: "JJJJ-MM" } } } } },
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
  get_balance: "📊 Saldo geprüft", list_entries: "🔎 Einträge gelesen", find_entries: "🔎 Eintrag gesucht", list_recurring: "🔎 Abos gelesen",
};

function TypingDots() {
  const dot = (d) => ({
    width: 7, height: 7, borderRadius: "50%", bgcolor: "text.disabled",
    animation: "chatBounce 1.2s infinite ease-in-out", animationDelay: `${d}s`,
  });
  return (
    <Box sx={{ display: "flex", gap: 0.6, px: 2, py: 1.5, alignSelf: "flex-start",
      "@keyframes chatBounce": { "0%,80%,100%": { transform: "scale(0.6)", opacity: 0.4 }, "40%": { transform: "scale(1)", opacity: 1 } } }}>
      <Box sx={dot(0)} /><Box sx={dot(0.16)} /><Box sx={dot(0.32)} />
    </Box>
  );
}

export default function Chat({ open, onClose }) {
  const { data } = useAppState();
  const qc = useQueryClient();
  const [msgs, setMsgs] = useState([]);
  const convo = useRef([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef();
  useEffect(() => { logRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }); }, [msgs, busy]);

  if (!data) return null;
  const me = data.me.name;
  const other = data.users.map((u) => u.name).find((n) => n !== me) || "";
  const fresh = async () => await api("/state");

  async function execTool(name, a) {
    const s = await fresh();
    if (name === "get_balance") { const t = netOf(s.entries); return { saldo_eur: Math.abs(t), richtung: t >= 0 ? "Zeynel schuldet Kawa" : (t < 0 ? "Kawa schuldet Zeynel" : "ausgeglichen") }; }
    if (name === "list_entries") { const mo = a.month || thisMonth(); return s.entries.filter((e) => monthOf(e) === mo).map((e) => ({ id: e.id, date: e.date, category: e.category, description: e.description, payer: e.payer, betrag: amount(e), split5050: e.split5050, anteil: owedOf(e), status: e.pay_status || "normal" })); }
    if (name === "find_entries") { const q = (a.query || "").toLowerCase(); const hits = s.entries.filter((e) => (!q || e.description.toLowerCase().includes(q)) && (!a.date || e.date === a.date) && (!a.month || monthOf(e) === a.month)).map((e) => ({ id: e.id, date: e.date, category: e.category, description: e.description, payer: e.payer, betrag: amount(e), split5050: e.split5050 })); return { treffer: hits.length, entries: hits.slice(0, 25) }; }
    if (name === "list_recurring") return (s.recurring || []).map((r) => ({ id: r.id, description: r.description, amount: r.amount, category: r.category, payer: r.payer, active_from: r.active_from, active_until: r.active_until }));
    if (name === "add_entry") { const e = { date: a.date || new Date().toISOString().slice(0, 10), category: a.category, description: a.description, unit_price: a.amount, split5050: !!a.split5050 }; if (a.qty) e.qty = a.qty; if (a.pfand_qty) { e.pfand_qty = a.pfand_qty; e.pfand_type = a.pfand_type || "Einweg"; } const r = await api("/entry", "POST", e); return { ok: true, id: r.entry.id }; }
    if (name === "edit_entry") { const cur = s.entries.find((x) => x.id === a.id); if (!cur) return { error: "nicht gefunden" }; const e = { id: a.id, date: a.date || cur.date, category: a.category || cur.category, description: a.description || cur.description, unit_price: a.amount != null ? a.amount : cur.unit_price, split5050: a.split5050 != null ? a.split5050 : cur.split5050 }; const q = a.qty != null ? a.qty : cur.qty; if (q) e.qty = q; await api("/entry", "POST", e); return { ok: true }; }
    if (name === "delete_entry") { await api("/entry/" + a.id, "DELETE"); return { ok: true }; }
    if (name === "add_recurring") { const r = await api("/recurring", "POST", { category: a.category, description: a.description, amount: a.amount, split5050: !!a.split5050, day: a.day || 1, active_from: a.active_from || new Date().toISOString().slice(0, 10), active_until: a.active_until || null }); return { ok: true, id: r.id }; }
    if (name === "delete_recurring") { await api("/recurring/" + a.id, "DELETE"); return { ok: true }; }
    if (name === "report_payment") { await api("/pay", "POST", { amount: a.amount, method: a.method || "Bar" }); return { ok: true }; }
    return { error: "unbekannt" };
  }

  const systemPrompt = () =>
`Du bist ein handlungsstarker, agentischer Assistent im Schulden-Tracker und arbeitest als ${me}.
Deine Aufgabe: Anweisungen selbstständig und vollständig ausführen — nicht den Nutzer um Arbeit bitten.

ARBEITSWEISE (wichtig):
- Handle eigenständig. Wenn der Nutzer einen Eintrag per Beschreibung und/oder Datum meint
  (z. B. „Tanken Star Marienheide 18.07."), rufe SELBST find_entries auf (durchsucht alle Monate),
  finde die richtige ID und führe die Aktion (edit/delete) direkt aus.
- FRAGE NIEMALS nach einer ID — die kennt der Nutzer nicht und sie ist deine Aufgabe.
- Nur wenn nach dem Nachschlagen WIRKLICH mehrere Einträge passen, liste die 2–3 Treffer
  kurz mit Datum/Betrag auf und frage, welcher gemeint ist. Passt genau einer: einfach machen.
- Findest du im genannten Monat nichts, prüfe die Nachbarmonate, bevor du aufgibst.
- Plane mehrere Schritte hintereinander (erst list_entries, dann edit_entry) ohne Zwischenfrage.
- Rechne selbst (z. B. „mach 50:50" → split5050=true; „erhöh um 5€" → neuen Betrag berechnen).

REGELN:
- Neue Einträge werden IMMER ${me} als Zahler gebucht → ${other} schuldet dann (ggf. die Hälfte).
- Erfinde keine IDs. Kategorien: ${data.categories.join(", ")}. Heute: ${new Date().toISOString().slice(0, 10)}.

Antworte knapp auf Deutsch und bestätige am Ende, was du konkret getan hast (mit Betrag/Datum).`;

  const appendDelta = (delta) => setMsgs((m) => {
    const c = [...m], last = c[c.length - 1];
    if (last?.role === "bot" && last.streaming) c[c.length - 1] = { ...last, text: last.text + delta };
    else c.push({ role: "bot", text: delta, streaming: true });
    return c;
  });

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
        const msg = await aiChatStream(data, convo.current, { tools: TOOLS, onDelta: appendDelta });
        convo.current.push(msg);
        setMsgs((m) => m.map((x) => x.streaming ? { ...x, streaming: false } : x));
        if (msg.tool_calls?.length) {
          for (const tc of msg.tool_calls) {
            let args = {}; try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
            let result; try { result = await execTool(tc.function.name, args); } catch (e) { result = { error: e.message }; }
            if (!["get_balance", "list_entries", "find_entries", "list_recurring"].includes(tc.function.name)) dirty = true;
            setMsgs((m) => [...m, { role: "tool", text: (TOOL_LABEL[tc.function.name] || tc.function.name) + (result?.error ? ` — ${result.error}` : "") }]);
            convo.current.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
          }
          continue;
        }
        break;
      }
    } catch (e) { setMsgs((m) => [...m, { role: "bot", text: "Fehler: " + e.message }]); }
    setBusy(false);
    if (dirty) qc.invalidateQueries({ queryKey: ["state"] });
  };

  const waiting = busy && !msgs.some((m) => m.streaming);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", sm: 460 }, height: "100dvh",
        display: "flex", flexDirection: "column", borderRadius: { xs: 0, sm: "24px 0 0 24px" } } }}>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
        <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, flexShrink: 0 }}><AutoAwesomeRoundedIcon fontSize="small" /></Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h3" sx={{ lineHeight: 1.1 }} noWrap>Assistent</Typography>
          <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>handelt als {me}</Typography>
        </Box>
        <Button size="small" sx={{ flexShrink: 0, minWidth: 0 }} onClick={() => { setMsgs([]); convo.current = []; }}>Neu</Button>
        <IconButton size="small" sx={{ flexShrink: 0 }} onClick={onClose}><CloseRoundedIcon /></IconButton>
      </Box>

      <Box ref={logRef} sx={{ flex: 1, overflowY: "auto", px: 2.5, py: 3, display: "flex", flexDirection: "column", gap: 2 }}>
        {!msgs.length && (
          <Box sx={{ m: "auto", textAlign: "center", color: "text.secondary", maxWidth: 300 }}>
            <AutoAwesomeRoundedIcon sx={{ fontSize: 34, mb: 1, color: "primary.main" }} />
            <Typography variant="body2">Hi {me}! Ich verwalte dein Kassenbuch per Chat.</Typography>
            <Typography variant="caption" sx={{ display: "block", mt: 1 }}>
              „trag 12,50 € Tanken ein, 50:50" · „was schuldet mir {other}?" · „mach ein Abo: Spotify 10,99 € monatlich"
            </Typography>
          </Box>
        )}
        {msgs.map((m, i) => m.role === "tool" ? (
          <Fade in key={i}><Box sx={{ alignSelf: "center", bgcolor: "action.hover", color: "text.secondary",
            borderRadius: 999, px: 1.75, py: 0.6, fontSize: 12.5, fontWeight: 600 }}>{m.text}</Box></Fade>
        ) : (
          <Paper key={i} elevation={0} sx={{
            px: 2, py: 1.5, maxWidth: "86%", alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            bgcolor: m.role === "user" ? "primary.main" : "background.paper",
            color: m.role === "user" ? "primary.contrastText" : "text.primary",
            border: m.role === "user" ? "none" : 1, borderColor: "divider",
            borderRadius: 3, borderBottomRightRadius: m.role === "user" ? 6 : 24, borderBottomLeftRadius: m.role === "user" ? 24 : 6,
            whiteSpace: "pre-wrap", lineHeight: 1.5, boxShadow: m.role === "user" ? "none" : "0 1px 2px rgba(0,0,0,0.06)",
          }}>{m.text}{m.streaming && <Box component="span" sx={{ ml: 0.3, animation: "blink 1s steps(2) infinite", "@keyframes blink": { "50%": { opacity: 0 } } }}>▍</Box>}</Paper>
        ))}
        {waiting && <TypingDots />}
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1, p: 2, borderTop: 1, borderColor: "divider" }}>
        <TextField fullWidth size="small" placeholder={`Nachricht an den Assistenten…`} value={input} multiline maxRows={4}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 4, bgcolor: "action.hover", px: 0.5 } }} />
        <IconButton color="primary" onClick={send} disabled={busy || !input.trim()}
          sx={{ bgcolor: "primary.main", color: "primary.contrastText", "&:hover": { bgcolor: "primary.dark" }, "&.Mui-disabled": { bgcolor: "action.disabledBackground" } }}>
          <ArrowUpwardRoundedIcon />
        </IconButton>
      </Box>
    </Drawer>
  );
}

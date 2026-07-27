import { useState, useRef } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField,
  Typography, Box, CircularProgress, Checkbox, FormControlLabel, Alert,
} from "@mui/material";
import { useAppState, useApiMutation } from "../lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { aiExtract, downscale, aiConfigured } from "../lib/ai";
import { eur, amount } from "../lib/format";

function extractionPrompt(state, instr) {
  const t = new Date().toISOString().slice(0, 10);
  return `Du hilfst bei einem gemeinsamen Kassenbuch (Kawa, Zeynel). Heute ist ${t}. Angemeldet: ${state.me.name}.
Erzeuge aus dem Beleg Buchungen als JSON:
{"entries":[{"date":"JJJJ-MM-TT","category":"…","description":"…","qty":Zahl|null,"unit_price":Zahl,"split5050":bool,"pfand_qty":Zahl|null,"pfand_type":"Einweg|Mehrweg|Bierflasche"|null}],"note":"kurz"}
Regeln: Kategorien: ${state.categories.join(", ")}. unit_price=Einzelpreis; Menge in qty. Pfand nur bei Getränke.
Tanken 50:50. Fasse Kleinposten sinnvoll zusammen, außer die Anweisung verlangt Einzelposten.
Anweisung: ${instr || "alle relevanten Positionen"}. Antworte NUR mit JSON.`;
}

export default function ScanDialog({ open, onClose }) {
  const { data } = useAppState();
  const qc = useQueryClient();
  const fileRef = useRef();
  const [img, setImg] = useState(null);
  const [instr, setInstr] = useState("");
  const [busy, setBusy] = useState("");
  const [proposals, setProposals] = useState(null);
  const [picked, setPicked] = useState({});
  const [err, setErr] = useState("");

  const reset = () => { setImg(null); setInstr(""); setBusy(""); setProposals(null); setPicked({}); setErr(""); };
  const close = () => { reset(); onClose(); };

  const onPhoto = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    setImg(await downscale(f));
  };

  const analyze = async () => {
    setErr(""); setBusy("Beleg wird analysiert …");
    try {
      const raw = await aiExtract(data, extractionPrompt(data, instr), img);
      const m = raw.match(/\{[\s\S]*\}/);
      const j = JSON.parse(m ? m[0] : raw);
      const out = (j.entries || []).filter((x) => x.date && x.description && isFinite(+x.unit_price)).map((x) => ({
        date: x.date, category: data.categories.includes(x.category) ? x.category : "Sonstiges",
        description: String(x.description).slice(0, 140), qty: x.qty ? +x.qty : null,
        unit_price: Math.round(+x.unit_price * 100) / 100, split5050: !!x.split5050,
        pfand_qty: x.category === "Getränke" && x.pfand_qty ? +x.pfand_qty : null,
        pfand_type: x.pfand_qty ? (x.pfand_type || "Einweg") : null,
      }));
      setProposals({ entries: out, note: j.note || "" });
      setPicked(Object.fromEntries(out.map((_, i) => [i, true])));
    } catch (e) { setErr(e.message); }
    setBusy("");
  };

  const save = async () => {
    setBusy("Speichern …");
    let receiptId = null;
    if (img) { try { const r = await api("/receipt", "POST", { data: img }); receiptId = r.id; } catch { /* ohne Beleg */ } }
    for (const i of Object.keys(picked).filter((k) => picked[k])) {
      const p = { ...proposals.entries[i] };
      Object.keys(p).forEach((k) => p[k] == null && delete p[k]);
      if (receiptId) { p.receipt = receiptId; p.receipt_note = proposals.note || instr; }
      await api("/entry", "POST", p);
    }
    await qc.invalidateQueries({ queryKey: ["state"] });
    close();
  };

  if (!data) return null;
  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>📷 Beleg scannen</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {!aiConfigured(data) && <Alert severity="warning">Kein KI-Schlüssel — unter ⚙︎ eintragen.</Alert>}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
          <Button variant="outlined" onClick={() => fileRef.current.click()}>Foto aufnehmen / wählen</Button>
          {img && <Box component="img" src={"data:image/jpeg;base64," + img} sx={{ maxHeight: 220, borderRadius: 3, objectFit: "contain" }} />}
          <TextField label="Was extrahieren? (optional)" value={instr} onChange={(e) => setInstr(e.target.value)} multiline minRows={2}
            placeholder="z. B. nur die Getränke, alles 50:50" />
          {busy && <Typography variant="body2" color="text.secondary"><CircularProgress size={14} sx={{ mr: 1 }} />{busy}</Typography>}
          {err && <Alert severity="error">{err}</Alert>}
          {proposals && (
            <Stack spacing={1}>
              {proposals.note && <Typography variant="caption" color="text.secondary">{proposals.note}</Typography>}
              {proposals.entries.map((e, i) => (
                <FormControlLabel key={i} control={<Checkbox checked={!!picked[i]} onChange={(ev) => setPicked((p) => ({ ...p, [i]: ev.target.checked }))} />}
                  label={<span><b>{e.description}</b> — {e.date} · {e.category} · {eur(amount(e))}{e.split5050 ? " · 50:50" : ""}</span>} />
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close}>Schließen</Button>
        {!proposals
          ? <Button variant="contained" onClick={analyze} disabled={!img || !!busy || !aiConfigured(data)}>Analysieren</Button>
          : <Button variant="contained" onClick={save} disabled={!!busy}>Übernehmen</Button>}
      </DialogActions>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Button,
  Stack, InputAdornment, FormControlLabel, Switch, Typography, Alert, Box,
} from "@mui/material";
import { useAppState, useApiMutation } from "../lib/queries";
import { api } from "../lib/api";
import { today, eur } from "../lib/format";

const AUTO_SPLIT = new Set(["Benzin", "Autokosten", "Reparaturkosten", "Werkstatt/TÜV", "Miete/Wohnen", "Strom/Nebenkosten"]);

export default function EntryDialog({ entry, onClose }) {
  const { data } = useAppState();
  const editing = !!entry.id;
  const [f, setF] = useState(() => ({
    date: entry.date || today(),
    category: entry.category || "Lebensmittel",
    description: entry.description || "",
    qty: entry.qty || "",
    unit_price: entry.unit_price ?? "",
    split5050: !!entry.split5050,
    pfand_qty: entry.pfand_qty || "",
    pfand_type: entry.pfand_type || "Einweg",
  }));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = useApiMutation((body) => api("/entry", "POST", body), { onSuccess: onClose });

  const drink = f.category === "Getränke";
  useEffect(() => { if (!drink) setF((s) => ({ ...s, pfand_qty: "" })); }, [drink]);

  const me = data?.me?.name;
  const other = (data?.users || []).map((u) => u.name).find((n) => n !== me) || "";
  const effPayer = editing ? entry.payer : me;
  const debtor = effPayer === me ? other : me;

  const price = parseFloat(f.unit_price), qty = parseInt(f.qty) || 1;
  const total = isFinite(price) ? Math.round(price * qty * 100) / 100 : null;
  const owed = total != null ? (f.split5050 ? total / 2 : total) : null;

  const onCat = (e) => {
    const v = e.target.value;
    setF((s) => ({ ...s, category: v, split5050: !editing && AUTO_SPLIT.has(v) ? true : s.split5050 }));
  };

  const submit = () => {
    const body = {
      date: f.date, category: f.category, description: f.description.trim(),
      unit_price: +f.unit_price, split5050: f.split5050,
    };
    if (editing) body.id = entry.id;
    if (f.qty) body.qty = +f.qty;
    if (drink && f.pfand_qty) { body.pfand_qty = +f.pfand_qty; body.pfand_type = f.pfand_type; }
    save.mutate(body);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? "Eintrag bearbeiten" : "Neuer Eintrag"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="Einzelpreis" type="number" value={f.unit_price} onChange={set("unit_price")}
              InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }}
              sx={{ flex: 1 }} inputProps={{ inputMode: "decimal", step: "0.01" }} />
            <TextField label="Anzahl" type="number" value={f.qty} onChange={set("qty")}
              sx={{ width: 100 }} inputProps={{ inputMode: "numeric", min: 1 }} placeholder="1" />
          </Stack>
          {total != null && (
            <Typography variant="body2" align="center" color="text.secondary">
              Betrag <b>{eur(total)}</b>{f.split5050 && <> · der andere schuldet <b>{eur(owed)}</b></>}
            </Typography>
          )}
          <TextField label="Beschreibung" value={f.description} onChange={set("description")}
            placeholder="z. B. Tanken Star Marienheide" />
          <Stack direction="row" spacing={2}>
            <TextField select label="Kategorie" value={f.category} onChange={onCat} sx={{ flex: 1 }}>
              {(data?.categories || []).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Datum" type="date" value={f.date} onChange={set("date")} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
          </Stack>
          <Box sx={{ bgcolor: "action.hover", borderRadius: 3, px: 2, py: 1.25 }}>
            <Typography variant="caption" color="text.secondary">Wer schuldet?</Typography>
            <Typography fontWeight={700}>{debtor} schuldet{effPayer !== me ? ` (von ${effPayer} erfasst)` : ""}</Typography>
          </Box>
          <FormControlLabel control={<Switch checked={f.split5050} onChange={(e) => setF((s) => ({ ...s, split5050: e.target.checked }))} />}
            label="50 : 50 teilen" />
          {drink && (
            <Stack direction="row" spacing={2}>
              <TextField label="Pfand-Flaschen" type="number" value={f.pfand_qty} onChange={set("pfand_qty")}
                sx={{ flex: 1 }} inputProps={{ inputMode: "numeric", min: 1 }} />
              <TextField select label="Pfand-Art" value={f.pfand_type} onChange={set("pfand_type")} sx={{ flex: 1 }}>
                {["Einweg", "Mehrweg", "Bierflasche"].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Stack>
          )}
          {save.isError && <Alert severity="error">{String(save.error.message)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" onClick={submit}
          disabled={save.isPending || !f.description || !isFinite(+f.unit_price)}>
          {editing ? "Speichern" : "Anlegen"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

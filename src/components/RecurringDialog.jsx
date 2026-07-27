import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Button,
  Stack, InputAdornment, FormControlLabel, Switch, Alert,
} from "@mui/material";
import { useAppState, useApiMutation } from "../lib/queries";
import { api } from "../lib/api";
import { today } from "../lib/format";

export default function RecurringDialog({ rec, onClose }) {
  const { data } = useAppState();
  const editing = !!rec.id;
  const [f, setF] = useState(() => ({
    amount: rec.amount ?? "",
    description: rec.description || "",
    category: rec.category || "Abo/Streaming",
    day: rec.day || "",
    split5050: !!rec.split5050,
    active_from: rec.active_from || today(),
    active_until: rec.active_until || "",
  }));
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const save = useApiMutation((body) => api("/recurring", "POST", body), { onSuccess: onClose });

  const submit = () => {
    const body = {
      category: f.category, description: f.description.trim(), amount: +f.amount,
      split5050: f.split5050, day: f.day ? +f.day : 1,
      active_from: f.active_from, active_until: f.active_until || null,
    };
    if (editing) body.id = rec.id;
    save.mutate(body);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing ? "Abo bearbeiten" : "Neues Abo"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField label="Betrag / Monat" type="number" value={f.amount} onChange={set("amount")}
            InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }} inputProps={{ step: "0.01" }} />
          <TextField label="Beschreibung" value={f.description} onChange={set("description")} placeholder="z. B. Netflix, Vodafone" />
          <Stack direction="row" spacing={2}>
            <TextField select label="Kategorie" value={f.category} onChange={set("category")} sx={{ flex: 1 }}>
              {(data?.categories || []).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
            <TextField label="Abbuchung Tag" type="number" value={f.day} onChange={set("day")} sx={{ width: 130 }} inputProps={{ min: 1, max: 28 }} />
          </Stack>
          <FormControlLabel control={<Switch checked={f.split5050} onChange={(e) => setF((s) => ({ ...s, split5050: e.target.checked }))} />} label="50 : 50 teilen" />
          <Stack direction="row" spacing={2}>
            <TextField label="Aktiv ab" type="date" value={f.active_from} onChange={set("active_from")} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
            <TextField label="Aktiv bis" type="date" value={f.active_until} onChange={set("active_until")} sx={{ flex: 1 }} InputLabelProps={{ shrink: true }} />
          </Stack>
          {save.isError && <Alert severity="error">{String(save.error.message)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" onClick={submit} disabled={save.isPending || !f.description || !(+f.amount > 0)}>Speichern</Button>
      </DialogActions>
    </Dialog>
  );
}

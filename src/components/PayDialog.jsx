import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Stack,
  ToggleButton, ToggleButtonGroup, Typography, Box, Alert, InputAdornment,
} from "@mui/material";
import { useAppState, useApiMutation } from "../lib/queries";
import { api } from "../lib/api";
import { eur, netOf } from "../lib/format";
import { qrSVG } from "../lib/qr";

export default function PayDialog({ open, onClose }) {
  const { data } = useAppState();
  const me = data?.me?.name;
  const other = (data?.users || []).map((u) => u.name).find((n) => n !== me) || (me === "Kawa" ? "Zeynel" : "Kawa");
  const total = data ? netOf(data.entries) : 0;
  const iban = ((data?.settings?.iban || {})[other] || "").replace(/\s+/g, "");

  const [method, setMethod] = useState("transfer");
  const [amt, setAmt] = useState("");
  useEffect(() => {
    if (!open || !data) return;
    const suggest = (me === "Zeynel" && total > 0) || (me === "Kawa" && total < 0) ? Math.abs(total) : 0;
    setAmt((suggest || 0).toFixed(2));
    setMethod(iban ? "transfer" : "cash");
  }, [open, data]);

  const pay = useApiMutation((body) => api("/pay", "POST", body), { onSuccess: onClose });

  if (!data) return null;
  const amount = Math.max(0, Math.round((parseFloat(amt) || 0) * 100) / 100);
  const purpose = `Ausgleich Schulden ${me}/${other}`;
  const giro = iban && amount >= 0.01
    ? qrSVG(["BCD", "002", "1", "SCT", "", other, iban, `EUR${amount.toFixed(2)}`, "", purpose].join("\n"), 0)
    : null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Ausgleich zahlen</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography color="text.secondary">{me} zahlt {other}</Typography>
          <TextField label="Betrag" type="number" value={amt} onChange={(e) => setAmt(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start">€</InputAdornment> }} inputProps={{ step: "0.01" }} />
          <ToggleButtonGroup exclusive fullWidth value={method} onChange={(_, v) => v && setMethod(v)}>
            <ToggleButton value="transfer">Überweisung</ToggleButton>
            <ToggleButton value="cash">Bargeld</ToggleButton>
          </ToggleButtonGroup>

          {method === "transfer" && (iban ? (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary">Empfänger {other}</Typography>
              <Typography sx={{ fontVariantNumeric: "tabular-nums", mb: 1 }}>{iban.replace(/(.{4})/g, "$1 ").trim()}</Typography>
              {giro && <Box sx={{ maxWidth: 240, mx: "auto" }} dangerouslySetInnerHTML={{ __html: giro }} />}
              <Typography variant="caption" color="text.secondary">GiroCode — in der Banking-App scannen</Typography>
            </Box>
          ) : (
            <Alert severity="info">Keine IBAN für {other} hinterlegt — unter ⚙︎ eintragen, oder Bargeld wählen.</Alert>
          ))}
          {method === "cash" && <Typography variant="body2" color="text.secondary">Übergib den Betrag in bar. {other} bestätigt anschließend den Erhalt.</Typography>}
          {pay.isError && <Alert severity="error">{String(pay.error.message)}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" disabled={pay.isPending || amount < 0.01}
          onClick={() => pay.mutate({ amount, method: method === "cash" ? "Bar" : "Überweisung" })}>
          Ich habe bezahlt — melden
        </Button>
      </DialogActions>
    </Dialog>
  );
}

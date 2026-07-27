import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, MenuItem,
  Typography, Box, Alert, Divider, InputAdornment,
} from "@mui/material";
import { useAppState, useApiMutation, useLogout } from "../lib/queries";
import { api } from "../lib/api";
import { aiConfig, setAiConfig, aiCostLine } from "../lib/ai";

function SectionHeader({ children, hint }) {
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", mt: 3.5, mb: 0.5 }}>
      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {children}
      </Typography>
      {hint && <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", opacity: 0.8 }}>{hint}</Typography>}
    </Box>
  );
}

export default function Settings({ open, onClose }) {
  const { data } = useAppState();
  const logout = useLogout();
  const saveSettings = useApiMutation((patch) => api("/settings", "POST", patch));
  const changePw = useApiMutation((pw) => api("/password", "POST", { new_password: pw }));
  const adminPw = useApiMutation(({ name, pw }) => api("/admin/password", "POST", { name, new_password: pw }));

  const [ai, setAi] = useState(aiConfig());
  const [aiKey, setAiKey] = useState("");
  const [ibanK, setIbanK] = useState("");
  const [ibanZ, setIbanZ] = useState("");
  const [remDay, setRemDay] = useState(1);
  const [pwNew, setPwNew] = useState("");
  const [otherUser, setOtherUser] = useState("");
  const [otherPw, setOtherPw] = useState("");

  useEffect(() => {
    if (!open || !data) return;
    setAi(aiConfig());
    setAiKey(data.settings?.ai_key || "");
    setIbanK(data.settings?.iban?.Kawa || "");
    setIbanZ(data.settings?.iban?.Zeynel || "");
    setRemDay(data.settings?.reminder_day || 1);
    setOtherUser((data.users || []).map((u) => u.name).find((n) => n !== data.me.name) || "");
  }, [open, data]);

  if (!data) return null;
  const me = data.me;

  const save = () => {
    setAiConfig(ai);
    saveSettings.mutate({
      ai_key: aiKey.trim(),
      reminder_day: Math.min(28, Math.max(1, +remDay || 1)),
      iban: { Kawa: ibanK.replace(/\s+/g, "").toUpperCase(), Zeynel: ibanZ.replace(/\s+/g, "").toUpperCase() },
    }, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
      <DialogTitle sx={{ pb: 0 }}>
        Einstellungen
        <Typography variant="body2" color="text.secondary">Angemeldet als {me.name}{me.is_admin ? " · Admin" : ""}</Typography>
      </DialogTitle>
      <DialogContent>
        <SectionHeader>Mein Passwort</SectionHeader>
        <Stack spacing={1.5}>
          <TextField label="Neues Passwort" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} />
          <Box><Button size="small" variant="contained" disabled={pwNew.length < 4 || changePw.isPending}
            onClick={() => changePw.mutate(pwNew, { onSuccess: () => { setPwNew(""); alert("Passwort gespeichert."); } })}>Speichern</Button></Box>
        </Stack>

        {me.is_admin && (
          <>
            <SectionHeader hint="nur Admin">Passwort für {otherUser}</SectionHeader>
            <Stack spacing={1.5}>
              <TextField label={`Neues Passwort für ${otherUser}`} type="password" value={otherPw} onChange={(e) => setOtherPw(e.target.value)} />
              <Box><Button size="small" variant="outlined" disabled={otherPw.length < 4 || adminPw.isPending}
                onClick={() => adminPw.mutate({ name: otherUser, pw: otherPw }, { onSuccess: () => { setOtherPw(""); alert("Gesetzt."); } })}>Für {otherUser} setzen</Button></Box>
            </Stack>
          </>
        )}

        <SectionHeader>Zahlungs-Erinnerung</SectionHeader>
        <TextField label="Erinnern am … Tag des Monats" type="number" value={remDay}
          onChange={(e) => setRemDay(e.target.value)} inputProps={{ min: 1, max: 28 }} sx={{ maxWidth: 240 }} />

        <SectionHeader hint="für GiroCode">Bankverbindungen</SectionHeader>
        <Stack spacing={1.5}>
          <TextField label="IBAN Kawa" value={ibanK} onChange={(e) => setIbanK(e.target.value)} placeholder="DE…" />
          <TextField label="IBAN Zeynel" value={ibanZ} onChange={(e) => setIbanZ(e.target.value)} placeholder="DE…" />
        </Stack>

        <SectionHeader hint="Chat · Scan · Diktat">KI-Assistent</SectionHeader>
        <Stack spacing={1.5}>
          <Typography variant="caption" color="text.secondary">
            Empfehlung: Qwen3-VL 235B über OpenRouter (Top-OCR, deutsch). Schlüssel geteilt für alle Geräte.
          </Typography>
          <TextField select label="Anbieter" value={ai.prov} onChange={(e) => setAi({ ...ai, prov: e.target.value })}>
            <MenuItem value="openrouter">OpenRouter — Qwen3-VL (empfohlen)</MenuItem>
            <MenuItem value="gemini">Google Gemini</MenuItem>
            <MenuItem value="openai">OpenAI</MenuItem>
            <MenuItem value="custom">OpenAI-kompatibel (Base-URL)</MenuItem>
          </TextField>
          <TextField label="Modell" value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} placeholder="qwen/qwen3-vl-235b-a22b-instruct" />
          {ai.prov === "custom" && <TextField label="Base-URL" value={ai.base} onChange={(e) => setAi({ ...ai, base: e.target.value })} />}
          <TextField label="API-Schlüssel" type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} />
          <TextField select label="Diktat-Engine" value={ai.dictate} onChange={(e) => setAi({ ...ai, dictate: e.target.value })}>
            <MenuItem value="browser">Browser-Spracherkennung (kostenlos)</MenuItem>
            <MenuItem value="ki">KI-Audio (versteht Deutsch)</MenuItem>
          </TextField>
          {aiCostLine(data) && <Typography variant="caption" color="text.secondary">{aiCostLine(data)}</Typography>}
        </Stack>

        <Divider sx={{ mt: 3.5 }} />
        <Button color="error" sx={{ mt: 2 }} onClick={() => logout.mutate()}>Abmelden</Button>
        {saveSettings.isError && <Alert severity="error" sx={{ mt: 2 }}>{String(saveSettings.error.message)}</Alert>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, position: "sticky", bottom: 0, bgcolor: "background.paper", borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose}>Abbrechen</Button>
        <Button variant="contained" onClick={save} disabled={saveSettings.isPending}>Speichern</Button>
      </DialogActions>
    </Dialog>
  );
}

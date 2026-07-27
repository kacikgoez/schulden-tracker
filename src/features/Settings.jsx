import { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, MenuItem,
  Typography, Box, Alert, Divider, InputAdornment, Snackbar, IconButton,
} from "@mui/material";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useAppState, useApiMutation, useLogout } from "../lib/queries";
import { api } from "../lib/api";
import { aiConfig, setAiConfig, aiCostLine } from "../lib/ai";

function Group({ icon, title, hint, children }) {
  return (
    <Box sx={{ mb: 3.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{ color: "text.secondary", display: "flex" }}>{icon}</Box>
        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</Typography>
        {hint && <Typography variant="caption" color="text.secondary" sx={{ ml: "auto", opacity: 0.75 }}>{hint}</Typography>}
      </Box>
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}

export default function Settings({ open, onClose }) {
  const { data } = useAppState();
  const logout = useLogout();
  const saveSettings = useApiMutation((patch) => api("/settings", "POST", patch));
  const changePw = useApiMutation((pw) => api("/password", "POST", { new_password: pw }));
  const adminPw = useApiMutation(({ name, pw }) => api("/admin/password", "POST", { name, new_password: pw }));
  const [toast, setToast] = useState("");

  const [ai, setAi] = useState(aiConfig());
  const [aiKey, setAiKey] = useState("");
  const [ibanK, setIbanK] = useState("");
  const [ibanZ, setIbanZ] = useState("");
  const [remDay, setRemDay] = useState(1);
  const [pwNew, setPwNew] = useState("");
  const [otherPw, setOtherPw] = useState("");

  useEffect(() => {
    if (!open || !data) return;
    setAi(aiConfig());
    setAiKey(data.settings?.ai_key || "");
    setIbanK(data.settings?.iban?.Kawa || "");
    setIbanZ(data.settings?.iban?.Zeynel || "");
    setRemDay(data.settings?.reminder_day || 1);
    setPwNew(""); setOtherPw("");
  }, [open, data]);

  if (!data) return null;
  const me = data.me;
  const other = (data.users || []).map((u) => u.name).find((n) => n !== me.name) || "";

  const save = () => {
    setAiConfig(ai);
    saveSettings.mutate({
      ai_key: aiKey.trim(),
      reminder_day: Math.min(28, Math.max(1, +remDay || 1)),
      iban: { Kawa: ibanK.replace(/\s+/g, "").toUpperCase(), Zeynel: ibanZ.replace(/\s+/g, "").toUpperCase() },
    }, { onSuccess: onClose });
  };

  const pwButton = (onClick, disabled) => (
    <InputAdornment position="end">
      <Button size="small" onClick={onClick} disabled={disabled}>Ändern</Button>
    </InputAdornment>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" scroll="paper">
        <DialogTitle sx={{ display: "flex", alignItems: "center", pb: 1 }}>
          <Box sx={{ flex: 1 }}>
            Einstellungen
            <Typography variant="body2" color="text.secondary">Angemeldet als {me.name}{me.is_admin ? " · Admin" : ""}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small"><CloseRoundedIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Group icon={<PersonRoundedIcon fontSize="small" />} title="Konto">
            <TextField label="Mein neues Passwort" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)}
              InputProps={{ endAdornment: pwButton(() => changePw.mutate(pwNew, { onSuccess: () => { setPwNew(""); setToast("Passwort geändert."); } }), pwNew.length < 4 || changePw.isPending) }} />
            {me.is_admin && (
              <TextField label={`Passwort für ${other} setzen`} type="password" value={otherPw} onChange={(e) => setOtherPw(e.target.value)}
                InputProps={{ endAdornment: pwButton(() => adminPw.mutate({ name: other, pw: otherPw }, { onSuccess: () => { setOtherPw(""); setToast(`Passwort für ${other} gesetzt.`); } }), otherPw.length < 4 || adminPw.isPending) }} />
            )}
          </Group>

          <Group icon={<NotificationsRoundedIcon fontSize="small" />} title="Erinnerung">
            <TextField label="Erinnern am … Tag des Monats" type="number" value={remDay}
              onChange={(e) => setRemDay(e.target.value)} inputProps={{ min: 1, max: 28 }} sx={{ maxWidth: 260 }} />
          </Group>

          <Group icon={<AccountBalanceRoundedIcon fontSize="small" />} title="Bankverbindungen" hint="für GiroCode">
            <TextField label="IBAN Kawa" value={ibanK} onChange={(e) => setIbanK(e.target.value)} placeholder="DE…" />
            <TextField label="IBAN Zeynel" value={ibanZ} onChange={(e) => setIbanZ(e.target.value)} placeholder="DE…" />
          </Group>

          <Group icon={<AutoAwesomeRoundedIcon fontSize="small" />} title="KI-Assistent" hint="Chat · Scan · Diktat">
            <TextField select label="Anbieter" value={ai.prov} onChange={(e) => setAi({ ...ai, prov: e.target.value })}>
              <MenuItem value="openrouter">OpenRouter — Qwen3-VL (empfohlen)</MenuItem>
              <MenuItem value="gemini">Google Gemini</MenuItem>
              <MenuItem value="openai">OpenAI</MenuItem>
              <MenuItem value="custom">OpenAI-kompatibel (Base-URL)</MenuItem>
            </TextField>
            <TextField label="Modell" value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} placeholder="qwen/qwen3-vl-235b-a22b-instruct" />
            {ai.prov === "custom" && <TextField label="Base-URL" value={ai.base} onChange={(e) => setAi({ ...ai, base: e.target.value })} />}
            <TextField label="API-Schlüssel" type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder="wird verschlüsselt geteilt" />
            <TextField label="Audio-Modell (Diktat)" value={ai.amodel} onChange={(e) => setAi({ ...ai, amodel: e.target.value })}
              placeholder="google/gemini-2.5-flash"
              helperText="cheap & zuverlässig für Deutsch; leer = Standard" />
            {aiCostLine(data) && <Typography variant="caption" color="text.secondary">{aiCostLine(data)}</Typography>}
          </Group>

          <Divider sx={{ mb: 2 }} />
          <Button color="error" size="small" onClick={() => logout.mutate()}>Abmelden</Button>
          {saveSettings.isError && <Alert severity="error" sx={{ mt: 2 }}>{String(saveSettings.error.message)}</Alert>}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose}>Abbrechen</Button>
          <Button variant="contained" onClick={save} disabled={saveSettings.isPending}>Speichern</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast("")} message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </>
  );
}

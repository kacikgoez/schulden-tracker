import { useState, useEffect } from "react";
import {
  Dialog, Box, Button, Stack, TextField, MenuItem, Typography, Alert, Snackbar, IconButton,
  List, ListItemButton, ListItemIcon, ListItemText, useMediaQuery, InputAdornment, Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAppState, useApiMutation, useLogout } from "../lib/queries";
import { api } from "../lib/api";
import { aiConfig, setAiConfig, aiCostLine } from "../lib/ai";

const SECTIONS = [
  { id: "account", label: "Konto", icon: <PersonRoundedIcon /> },
  { id: "reminder", label: "Erinnerung", icon: <NotificationsRoundedIcon /> },
  { id: "bank", label: "Bank", icon: <AccountBalanceRoundedIcon /> },
  { id: "ai", label: "KI-Assistent", icon: <AutoAwesomeRoundedIcon /> },
];

export default function Settings({ open, onClose }) {
  const { data } = useAppState();
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("sm"));
  const logout = useLogout();
  const saveSettings = useApiMutation((patch) => api("/settings", "POST", patch));
  const changePw = useApiMutation((pw) => api("/password", "POST", { new_password: pw }));
  const adminPw = useApiMutation(({ name, pw }) => api("/admin/password", "POST", { name, new_password: pw }));
  const [toast, setToast] = useState("");
  const [sel, setSel] = useState("account");

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
    setPwNew(""); setOtherPw(""); setSel("account");
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
    }, { onSuccess: () => setToast("Gespeichert.") });
  };

  const pwBtn = (onClick, disabled) => (
    <InputAdornment position="end"><Button size="small" onClick={onClick} disabled={disabled}>Ändern</Button></InputAdornment>
  );

  const SectionTitle = ({ children }) => (
    <Typography variant="h3" sx={{ mb: 2 }}>{children}</Typography>
  );

  const content = {
    account: (
      <>
        <SectionTitle>Konto</SectionTitle>
        <Stack spacing={2.5} sx={{ maxWidth: 420 }}>
          <TextField label="Mein neues Passwort" type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)}
            InputProps={{ endAdornment: pwBtn(() => changePw.mutate(pwNew, { onSuccess: () => { setPwNew(""); setToast("Passwort geändert."); } }), pwNew.length < 4 || changePw.isPending) }} />
          {me.is_admin && (
            <TextField label={`Passwort für ${other} setzen`} type="password" value={otherPw} onChange={(e) => setOtherPw(e.target.value)}
              InputProps={{ endAdornment: pwBtn(() => adminPw.mutate({ name: other, pw: otherPw }, { onSuccess: () => { setOtherPw(""); setToast(`Passwort für ${other} gesetzt.`); } }), otherPw.length < 4 || adminPw.isPending) }} />
          )}
          <Divider />
          <Button color="error" startIcon={<LogoutRoundedIcon />} sx={{ alignSelf: "flex-start" }} onClick={() => logout.mutate()}>Abmelden</Button>
        </Stack>
      </>
    ),
    reminder: (
      <>
        <SectionTitle>Zahlungs-Erinnerung</SectionTitle>
        <Stack spacing={1} sx={{ maxWidth: 420 }}>
          <TextField label="Erinnern am … Tag des Monats" type="number" value={remDay}
            onChange={(e) => setRemDay(e.target.value)} inputProps={{ min: 1, max: 28 }} sx={{ maxWidth: 240 }} />
          <Typography variant="caption" color="text.secondary">Ab diesem Tag erscheint auf der Übersicht ein Hinweis, wenn ein Saldo offen ist.</Typography>
        </Stack>
      </>
    ),
    bank: (
      <>
        <SectionTitle>Bankverbindungen</SectionTitle>
        <Stack spacing={2.5} sx={{ maxWidth: 420 }}>
          <Typography variant="caption" color="text.secondary">Für den GiroCode beim Bezahlen. Geteilt für beide.</Typography>
          <TextField label="IBAN Kawa" value={ibanK} onChange={(e) => setIbanK(e.target.value)} placeholder="DE…" />
          <TextField label="IBAN Zeynel" value={ibanZ} onChange={(e) => setIbanZ(e.target.value)} placeholder="DE…" />
        </Stack>
      </>
    ),
    ai: (
      <>
        <SectionTitle>KI-Assistent</SectionTitle>
        <Stack spacing={2.5} sx={{ maxWidth: 460 }}>
          <Typography variant="caption" color="text.secondary">Für Chat, Beleg-Scan und Diktat. Empfehlung: Qwen3-VL 235B über OpenRouter (Top-OCR, deutsch). Schlüssel geteilt für alle Geräte.</Typography>
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
            placeholder="google/gemini-2.5-flash" helperText="cheap & zuverlässig für Deutsch; leer = Standard" />
          {aiCostLine(data) && <Typography variant="caption" color="text.secondary">{aiCostLine(data)}</Typography>}
        </Stack>
      </>
    ),
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} fullScreen={mobile} fullWidth maxWidth="md"
        PaperProps={{ sx: { height: mobile ? "100dvh" : "82vh" } }}>
        <Box sx={{ display: "flex", alignItems: "center", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h2" sx={{ flex: 1 }}>Einstellungen</Typography>
          <IconButton onClick={onClose}><CloseRoundedIcon /></IconButton>
        </Box>

        <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
          {/* Seitennavigation */}
          <List sx={{ width: { xs: 116, sm: 210 }, flexShrink: 0, borderRight: 1, borderColor: "divider", py: 1, overflowY: "auto" }}>
            {SECTIONS.map((s) => (
              <ListItemButton key={s.id} selected={sel === s.id} onClick={() => setSel(s.id)}
                sx={{ mx: 1, mb: 0.5, borderRadius: 2, "&.Mui-selected": { bgcolor: "action.selected" } }}>
                <ListItemIcon sx={{ minWidth: 36, color: sel === s.id ? "primary.main" : "text.secondary" }}>{s.icon}</ListItemIcon>
                <ListItemText primary={s.label} primaryTypographyProps={{ fontSize: 14, fontWeight: sel === s.id ? 700 : 500, noWrap: true }} />
              </ListItemButton>
            ))}
          </List>

          {/* Inhalt */}
          <Box sx={{ flex: 1, minWidth: 0, overflowY: "auto", p: { xs: 2.5, sm: 3.5 } }}>
            {content[sel]}
            {saveSettings.isError && <Alert severity="error" sx={{ mt: 2 }}>{String(saveSettings.error.message)}</Alert>}
          </Box>
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, px: 2, py: 1.5, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={onClose}>Schließen</Button>
          <Button variant="contained" onClick={save} disabled={saveSettings.isPending}>Speichern</Button>
        </Box>
      </Dialog>
      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast("")} message={toast}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </>
  );
}

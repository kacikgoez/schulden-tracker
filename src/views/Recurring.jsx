import {
  Card, Typography, Box, Button, Stack, Chip, IconButton, Divider,
} from "@mui/material";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useAppState, useApiMutation } from "../lib/queries";
import { api } from "../lib/api";
import { eur, today } from "../lib/format";

const isActive = (r) => r.active_from <= today() && (!r.active_until || r.active_until >= today());

export default function Recurring({ onAdd, onEdit }) {
  const { data } = useAppState();
  const del = useApiMutation((id) => api("/recurring/" + id, "DELETE"));
  if (!data) return null;
  const list = [...(data.recurring || [])].sort((a, b) => a.description.localeCompare(b.description));

  if (!list.length) {
    return (
      <Box sx={{ textAlign: "center", py: 9, px: 3, color: "text.secondary" }}>
        <AutorenewRoundedIcon sx={{ fontSize: 52, opacity: 0.35, mb: 1.5 }} />
        <Typography variant="h3" color="text.primary">Noch keine Abos</Typography>
        <Typography variant="body2" sx={{ mt: 0.75, mb: 3, maxWidth: 360, mx: "auto" }}>
          Wiederkehrende Kosten wie Netflix, Handy oder ein Miet-Anteil werden hier jeden Monat automatisch verbucht.
        </Typography>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={onAdd}>Abo hinzufügen</Button>
      </Box>
    );
  }

  const active = list.filter(isActive);
  const monthSum = active.reduce((s, r) => s + r.amount, 0);
  const owed = { Kawa: 0, Zeynel: 0 };
  for (const r of active) { const o = r.payer === "Kawa" ? "Zeynel" : "Kawa"; owed[o] += r.split5050 ? r.amount / 2 : r.amount; }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", gap: 4, px: 0.5, py: 1, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Läuft aktuell</Typography>
          <Typography variant="h2" sx={{ mt: 0.25 }}>{eur(monthSum)}<Typography component="span" variant="body2" color="text.secondary"> / Monat</Typography></Typography>
          <Typography variant="caption" color="text.secondary">Zeynel {eur(owed.Zeynel)} · Kawa {eur(owed.Kawa)}</Typography>
        </Box>
        <Divider orientation="vertical" flexItem />
        <Box>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Aktiv</Typography>
          <Typography variant="h2" sx={{ mt: 0.25 }}>{active.length}</Typography>
        </Box>
      </Box>

      <Card>
        {list.map((r, i) => {
          const on = isActive(r);
          const other = r.payer === "Kawa" ? "Zeynel" : "Kawa";
          const o = r.split5050 ? r.amount / 2 : r.amount;
          return (
            <Box key={r.id}>
              {i > 0 && <Divider sx={{ ml: 2.5 }} />}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.75 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body1" noWrap sx={{ fontWeight: 500, textDecoration: on ? "none" : "line-through", opacity: on ? 1 : 0.55 }}>
                    {r.description} {!on && <Chip size="small" variant="outlined" label="beendet" />}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {r.category} · {r.split5050 ? "50:50 → " : ""}{other} schuldet {eur(o)} · ab {r.active_from.slice(0, 7)}
                  </Typography>
                </Box>
                <Typography variant="body1" fontWeight={700} sx={{ minWidth: 84, textAlign: "right" }}>{eur(r.amount)}<Typography component="span" variant="caption" color="text.secondary">/M</Typography></Typography>
                <IconButton size="small" onClick={() => onEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => window.confirm(`Abo „${r.description}" löschen?\nBereits verbuchte Monate bleiben erhalten.`) && del.mutate(r.id)}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          );
        })}
      </Card>
    </Stack>
  );
}

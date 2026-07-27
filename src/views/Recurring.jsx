import {
  Card, CardContent, Typography, Box, Button, Stack, Chip, IconButton, Divider,
} from "@mui/material";
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
  const active = list.filter(isActive);
  const monthSum = active.reduce((s, r) => s + r.amount, 0);
  const owed = { Kawa: 0, Zeynel: 0 };
  for (const r of active) { const o = r.payer === "Kawa" ? "Zeynel" : "Kawa"; owed[o] += r.split5050 ? r.amount / 2 : r.amount; }

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="contained" onClick={onAdd}>＋ Abo</Button>
      </Box>
      <Stack direction="row" spacing={1.5}>
        <Card sx={{ flex: 1 }}><CardContent>
          <Typography variant="caption" color="text.secondary">Läuft aktuell</Typography>
          <Typography variant="h3">{eur(monthSum)} / Monat</Typography>
          <Typography variant="caption" color="text.secondary">Zeynel {eur(owed.Zeynel)} · Kawa {eur(owed.Kawa)}</Typography>
        </CardContent></Card>
        <Card sx={{ width: 120 }}><CardContent>
          <Typography variant="caption" color="text.secondary">Aktiv</Typography>
          <Typography variant="h3">{active.length}</Typography>
        </CardContent></Card>
      </Stack>

      <Card><CardContent sx={{ p: 0 }}>
        {!list.length && <Typography sx={{ p: 2 }} color="text.secondary" variant="body2">Noch keine Abos.</Typography>}
        {list.map((r, i) => {
          const on = isActive(r);
          const other = r.payer === "Kawa" ? "Zeynel" : "Kawa";
          const o = r.split5050 ? r.amount / 2 : r.amount;
          return (
            <Box key={r.id}>
              {i > 0 && <Divider />}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 1.25 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" noWrap sx={{ textDecoration: on ? "none" : "line-through", opacity: on ? 1 : 0.6 }}>
                    {r.description} <Chip size="small" label={r.category} sx={{ height: 18 }} />
                    {!on && <Chip size="small" label="beendet" sx={{ height: 18 }} />}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {eur(r.amount)}/Monat · {r.split5050 ? "50:50 → " : ""}{other} schuldet {eur(o)} · ab {r.active_from.slice(0, 7)}
                  </Typography>
                </Box>
                <IconButton size="small" onClick={() => onEdit(r)}><EditRoundedIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => window.confirm(`Abo „${r.description}" löschen?\nBereits verbuchte Monate bleiben erhalten.`) && del.mutate(r.id)}>
                  <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          );
        })}
      </CardContent></Card>
    </Stack>
  );
}

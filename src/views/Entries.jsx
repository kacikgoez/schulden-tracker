import { useState } from "react";
import {
  Card, CardContent, Typography, Box, IconButton, Stack, Chip, Divider,
} from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import { useAppState, useApiMutation } from "../lib/queries";
import { api } from "../lib/api";
import { eur, amount, owedOf, isPending, monthOf, mLabel, monthsList, netOf, thisMonth } from "../lib/format";

// Farben für Tagesgruppen (lesbar in hell & dunkel)
const DAY_COLORS = ["#0a84ff", "#30d158", "#ff9f0a", "#bf5af2", "#5ac8fa", "#ff375f", "#ffd60a", "#64d2ff"];
function groupByDay(entries) {
  const groups = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }
  return groups;
}

export default function Entries({ onEntry }) {
  const { data } = useAppState();
  const ms = data ? monthsList(data.entries) : [thisMonth()];
  const [cur, setCur] = useState(ms[ms.length - 1]);
  const del = useApiMutation((id) => api("/entry/" + id, "DELETE"));
  if (!data) return null;

  const idx = ms.indexOf(cur);
  const month = data.entries.filter((e) => monthOf(e) === cur).sort((a, b) => a.date.localeCompare(b.date));
  const mNet = netOf(month);
  const cum = netOf(data.entries.filter((e) => monthOf(e) <= cur));

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
        <IconButton disabled={idx <= 0} onClick={() => setCur(ms[idx - 1])}><ChevronLeftRoundedIcon /></IconButton>
        <Typography variant="h3" sx={{ minWidth: 120, textAlign: "center" }}>{mLabel(cur)}</Typography>
        <IconButton disabled={idx >= ms.length - 1} onClick={() => setCur(ms[idx + 1])}><ChevronRightRoundedIcon /></IconButton>
      </Box>

      <Stack direction="row" spacing={1.5}>
        <Card sx={{ flex: 1 }}><CardContent>
          <Typography variant="caption" color="text.secondary">Dieser Monat</Typography>
          <Typography variant="h3">{mNet >= 0 ? "+" : "−"} {eur(Math.abs(mNet))}</Typography>
        </CardContent></Card>
        <Card sx={{ flex: 1 }}><CardContent>
          <Typography variant="caption" color="text.secondary">Bis dato</Typography>
          <Typography variant="h3">{cum >= 0 ? "Z→K " : "K→Z "}{eur(Math.abs(cum))}</Typography>
        </CardContent></Card>
      </Stack>

      <Card><CardContent sx={{ p: 1.25, display: "flex", flexDirection: "column", gap: 1 }}>
        {!month.length && <Typography sx={{ p: 1 }} color="text.secondary" variant="body2">Keine Einträge in diesem Monat.</Typography>}
        {groupByDay(month).map((g, gi) => {
          const color = DAY_COLORS[gi % DAY_COLORS.length];
          return (
            <Box key={g.date} sx={{ borderLeft: `4px solid ${color}`, borderRadius: 1, pl: 1.25 }}>
              <Typography variant="caption" sx={{ color, fontWeight: 700, display: "block", pt: 0.25 }}>
                {new Date(g.date).toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}
              </Typography>
              {g.items.map((e, i) => (
                <Box key={e.id}>
                  {i > 0 && <Divider sx={{ opacity: 0.5 }} />}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap>
                        {e.description}{" "}
                        {isPending(e) && <Chip size="small" color="warning" label="wartet" sx={{ height: 18 }} />}
                        {e.pay_status === "confirmed" && <Chip size="small" color="success" label="bestätigt" sx={{ height: 18 }} />}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {e.category} · {e.payer} zahlte{e.split5050 ? " · 50:50" : ""}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography variant="body2" fontWeight={700}>{eur(owedOf(e))}</Typography>
                      <Typography variant="caption" color="text.secondary">{eur(amount(e))}</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => onEntry(e)}><EditRoundedIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => window.confirm(`Löschen?\n${e.description}`) && del.mutate(e.id)}>
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          );
        })}
      </CardContent></Card>
    </Stack>
  );
}

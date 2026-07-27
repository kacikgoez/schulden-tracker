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

function groupByDay(entries) {
  const groups = [];
  for (const e of entries) {
    const last = groups[groups.length - 1];
    if (last && last.date === e.date) last.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }
  return groups;
}
const dayLabel = (d) => new Date(d).toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "long" });

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

      <Box sx={{ display: "flex", alignItems: "stretch", px: 1, py: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Dieser Monat</Typography>
          <Typography variant="h2" noWrap>{mNet >= 0 ? "+ " : "− "}{eur(Math.abs(mNet))}</Typography>
        </Box>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700 }}>Bis dato</Typography>
          <Typography variant="h2" noWrap>{eur(Math.abs(cum))}</Typography>
          <Typography variant="caption" color="text.secondary">{cum >= 0 ? "Zeynel → Kawa" : "Kawa → Zeynel"}</Typography>
        </Box>
      </Box>

      <Card>
        {!month.length && <Typography sx={{ p: 2.5 }} color="text.secondary" variant="body2">Keine Einträge in diesem Monat.</Typography>}
        {groupByDay(month).map((g) => (
          <Box key={g.date}>
            <Typography variant="caption" sx={{ display: "block", px: 2.5, pt: 2, pb: 0.75,
              color: "text.secondary", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {dayLabel(g.date)}
            </Typography>
            {g.items.map((e, i) => (
              <Box key={e.id}>
                {i > 0 && <Divider sx={{ ml: 2.5 }} />}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" noWrap sx={{ fontWeight: 500 }}>
                      {e.description}{" "}
                      {isPending(e) && <Chip size="small" color="warning" variant="outlined" label="wartet" />}
                      {e.pay_status === "confirmed" && <Chip size="small" color="success" variant="outlined" label="bestätigt" />}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {e.category} · {e.payer} zahlte{e.split5050 ? " · 50:50" : ""}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right", minWidth: 64 }}>
                    <Typography variant="body1" fontWeight={700}>{eur(owedOf(e))}</Typography>
                    {owedOf(e) !== amount(e) && <Typography variant="caption" color="text.secondary">von {eur(amount(e))}</Typography>}
                  </Box>
                  <IconButton size="small" onClick={() => onEntry(e)}><EditRoundedIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => window.confirm(`Löschen?\n${e.description}`) && del.mutate(e.id)}>
                    <DeleteOutlineRoundedIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        ))}
      </Card>
    </Stack>
  );
}

import { useState } from "react";
import {
  Card, CardContent, Typography, Box, Stack, TextField, MenuItem, Button, Divider,
} from "@mui/material";
import { useAppState, useApiMutation } from "../lib/queries";
import { api } from "../lib/api";
import { eur, amount } from "../lib/format";

const OP = {
  add: ["＋ angelegt", "success.main"], edit: ["✎ geändert", "warning.main"],
  delete: ["✕ gelöscht", "error.main"], revert: ["↩ zurückgesetzt", "primary.main"],
  claim: ["💸 gemeldet", "text.primary"], confirm: ["✓ bestätigt", "success.main"],
  reject: ["✕ abgelehnt", "error.main"],
};

export default function History() {
  const { data } = useAppState();
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const revert = useApiMutation(async (h) => {
    const cur = data.entries.find((e) => e.id === h.entry);
    if (h.action === "add" && cur) return api("/entry/" + h.entry, "DELETE");
    if ((h.action === "delete" || h.action === "reject") && !cur && h.before) return api("/entry", "POST", h.before);
    if (h.action === "edit" && cur && h.before) return api("/entry", "POST", h.before);
    throw new Error("Nicht mehr rückgängig machbar");
  });
  if (!data) return null;

  let H = [...(data.history || [])].reverse();
  if (actor) H = H.filter((h) => h.actor === actor);
  if (action) H = H.filter((h) => h.action === action);
  if (q) H = H.filter((h) => JSON.stringify(h).toLowerCase().includes(q.toLowerCase()));

  return (
    <Card><CardContent>
      <Typography variant="h3" gutterBottom>Änderungsprotokoll</Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap">
        <TextField select size="small" label="Person" value={actor} onChange={(e) => setActor(e.target.value)} sx={{ width: 130 }}>
          <MenuItem value="">Alle</MenuItem><MenuItem value="Kawa">Kawa</MenuItem>
          <MenuItem value="Zeynel">Zeynel</MenuItem><MenuItem value="CLI">CLI</MenuItem>
        </TextField>
        <TextField select size="small" label="Aktion" value={action} onChange={(e) => setAction(e.target.value)} sx={{ width: 130 }}>
          <MenuItem value="">Alle</MenuItem>
          {Object.keys(OP).map((k) => <MenuItem key={k} value={k}>{OP[k][0]}</MenuItem>)}
        </TextField>
        <TextField size="small" label="Suchen" value={q} onChange={(e) => setQ(e.target.value)} sx={{ flex: 1, minWidth: 120 }} />
      </Stack>
      {!H.length && <Typography variant="body2" color="text.secondary">Keine Änderungen.</Typography>}
      {H.map((h, i) => {
        const ref = h.after || h.before || {};
        const [label, color] = OP[h.action] || [h.action, "text.primary"];
        return (
          <Box key={h.id}>
            {i > 0 && <Divider />}
            <Box sx={{ display: "flex", gap: 1.5, py: 1.25, alignItems: "center" }}>
              <Typography variant="caption" color="text.secondary" sx={{ minWidth: 96 }}>
                {h.ts.slice(0, 16).replace("T", " ")}
              </Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2">
                  <Box component="span" sx={{ color, fontWeight: 700 }}>{label}</Box>{" "}
                  {ref.description || h.entry}{" "}
                  <Box component="span" sx={{ px: 1, borderRadius: 5, bgcolor: "action.hover", fontSize: 11 }}>{h.actor}</Box>
                </Typography>
                {ref.unit_price !== undefined && (
                  <Typography variant="caption" color="text.secondary">{ref.date} · {ref.category} · {eur(amount(ref))}</Typography>
                )}
              </Box>
              <Button size="small" onClick={() => window.confirm("Rückgängig?") && revert.mutate(h)}>↩︎</Button>
            </Box>
          </Box>
        );
      })}
    </CardContent></Card>
  );
}

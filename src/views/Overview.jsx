import { Card, CardContent, Typography, Box, Button, Stack, Chip, LinearProgress } from "@mui/material";
import { alpha } from "@mui/material/styles";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import { useAppState, useApiMutation } from "../lib/queries";
import { api } from "../lib/api";
import { eur, netOf, balanceLabel, isPending, amount, owedOf, monthOf, thisMonth, mLabel, monthsList } from "../lib/format";

export default function Overview({ onPay }) {
  const { data } = useAppState();
  if (!data) return null;
  const { entries, me } = data;
  const total = netOf(entries);
  const settled = Math.abs(total) < 0.005;

  return (
    <Stack spacing={1.5}>
      <Card sx={{ overflow: "hidden" }}>
        <Box sx={{ height: 5, background: (t) => `linear-gradient(90deg, ${t.palette.primary.main}, ${alpha(t.palette.primary.main, 0.35)})` }} />
        <CardContent sx={{ textAlign: "center", py: 4.5 }}>
          <Chip size="small" icon={<SwapHorizRoundedIcon />} label={settled ? "ausgeglichen" : balanceLabel(total)}
            sx={{ bgcolor: "action.hover", color: "text.secondary", fontWeight: 600, mb: 1.5 }} />
          <Typography sx={{ fontSize: 52, fontWeight: 800, letterSpacing: "-0.035em", lineHeight: 1 }}>
            {eur(Math.abs(total))}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
            über {entries.length} Einträge · Stand heute
          </Typography>
          <Button variant="contained" size="large" onClick={onPay} sx={{ mt: 2.5, px: 3 }}>Zahlung melden</Button>
        </CardContent>
      </Card>

      <Confirmations entries={entries} me={me} />
      <Trend entries={entries} />
      <Categories entries={entries} />
    </Stack>
  );
}

function Confirmations({ entries, me }) {
  const confirm = useApiMutation((id) => api("/confirm/" + id, "POST"));
  const reject = useApiMutation((id) => api("/reject/" + id, "POST"));
  const pend = entries.filter(isPending);
  if (!pend.length) return null;
  return (
    <Card sx={{ borderColor: "warning.main" }}>
      <CardContent>
        <Typography variant="h3" gutterBottom>⏳ Zahlungsbestätigung</Typography>
        <Stack spacing={1.5}>
          {pend.map((e) => {
            const creditor = e.payer === "Kawa" ? "Zeynel" : "Kawa";
            const mine = me.name === creditor;
            return (
              <Box key={e.id}>
                <Typography variant="body2">
                  <b>{e.payer}</b> gibt an, <b>{eur(amount(e))}</b> {e.pay_method === "Bar" ? "bar" : "per Überweisung"} gezahlt zu haben
                </Typography>
                <Typography variant="caption" color="text.secondary">{e.date} · Empfänger {creditor}</Typography>
                {mine ? (
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Button size="small" variant="contained" onClick={() => confirm.mutate(e.id)}>Erhalten ✓</Button>
                    <Button size="small" onClick={() => reject.mutate(e.id)}>Nicht erhalten</Button>
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary"> · wartet auf {creditor}</Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

function Trend({ entries }) {
  const ms = monthsList(entries);
  const nets = ms.map((m) => netOf(entries.filter((e) => monthOf(e) === m)));
  const max = Math.max(...nets.map(Math.abs), 0.01);
  return (
    <Card>
      <CardContent>
        <Typography variant="h3" gutterBottom>Monatssalden</Typography>
        <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1.25, height: 96, pt: 1 }}>
          {ms.map((m, i) => {
            const cur = m === thisMonth();
            return (
              <Box key={m} sx={{ flex: 1, textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                <Box sx={{ height: `${(Math.abs(nets[i]) / max) * 64 + 4}px`, borderRadius: "6px 6px 3px 3px", mb: 0.75,
                  background: (t) => cur ? `linear-gradient(180deg, ${t.palette.primary.main}, ${alpha(t.palette.primary.main, 0.7)})` : alpha(t.palette.primary.main, 0.22) }} />
                <Typography variant="caption" sx={{ color: cur ? "primary.main" : "text.secondary", fontWeight: cur ? 700 : 400 }}>{mLabel(m).slice(0, 3)}</Typography>
              </Box>
            );
          })}
        </Box>
      </CardContent>
    </Card>
  );
}

function Categories({ entries }) {
  const m = thisMonth();
  const month = entries.filter((e) => monthOf(e) === m && !isPending(e));
  const byCat = {};
  for (const e of month) byCat[e.category] = (byCat[e.category] || 0) + owedOf(e);
  const cats = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...cats.map((c) => Math.abs(c[1])), 0.01);
  return (
    <Card>
      <CardContent>
        <Typography variant="h3" gutterBottom>Kategorien · {mLabel(m)}</Typography>
        {!cats.length && <Typography variant="body2" color="text.secondary">—</Typography>}
        <Stack spacing={1}>
          {cats.map(([name, val]) => (
            <Box key={name} sx={{ display: "grid", gridTemplateColumns: "120px 1fr 76px", gap: 1, alignItems: "center" }}>
              <Typography variant="body2" noWrap color="text.secondary">{name}</Typography>
              <LinearProgress variant="determinate" value={(Math.abs(val) / max) * 100} sx={{ height: 10, borderRadius: 5 }} />
              <Typography variant="body2" align="right">{eur(val)}</Typography>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

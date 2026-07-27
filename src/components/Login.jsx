import { useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField, MenuItem, Button, Alert, Stack,
} from "@mui/material";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { useLogin } from "../lib/queries";

export default function Login({ onDone }) {
  const [name, setName] = useState("Kawa");
  const [password, setPassword] = useState("");
  const login = useLogin();

  const submit = async (e) => {
    e.preventDefault();
    login.mutate({ name, password }, { onSuccess: onDone });
  };

  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center", p: 2 }}>
      <Card sx={{ width: 360, maxWidth: "100%" }}>
        <CardContent sx={{ textAlign: "center", py: 4 }}>
          <LockRoundedIcon color="primary" sx={{ fontSize: 40 }} />
          <Typography variant="h3" sx={{ mt: 1, mb: 0.5 }}>Schulden-Tracker</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Anmelden</Typography>
          <Stack component="form" spacing={1.5} onSubmit={submit}>
            <TextField select label="Wer bist du?" value={name} onChange={(e) => setName(e.target.value)}>
              <MenuItem value="Kawa">Kawa</MenuItem>
              <MenuItem value="Zeynel">Zeynel</MenuItem>
            </TextField>
            <TextField
              type="password" label="Passwort" value={password} autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
            {login.isError && <Alert severity="error">{String(login.error.message)}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={login.isPending}>
              {login.isPending ? "…" : "Anmelden"}
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}

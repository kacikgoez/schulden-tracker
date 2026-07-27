import { createTheme } from "@mui/material/styles";

export function buildTheme(mode) {
  const dark = mode === "dark";
  return createTheme({
    palette: {
      mode,
      primary: { main: dark ? "#0a84ff" : "#007aff" },
      success: { main: dark ? "#30d158" : "#1d8a3a" },
      warning: { main: dark ? "#ffd60a" : "#c77700" },
      error: { main: dark ? "#ff453a" : "#e0332c" },
      background: {
        default: dark ? "#000000" : "#f2f2f7",
        paper: dark ? "#1c1c1e" : "#ffffff",
      },
      divider: dark ? "rgba(84,84,88,0.5)" : "rgba(60,60,67,0.14)",
    },
    shape: { borderRadius: 14 },
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", "Segoe UI", system-ui, sans-serif',
      h1: { fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" },
      h2: { fontSize: 22, fontWeight: 750, letterSpacing: "-0.02em" },
      h3: { fontSize: 17, fontWeight: 700 },
      button: { textTransform: "none", fontWeight: 650 },
    },
    components: {
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 999 } } },
      MuiPaper: { styleOverrides: { rounded: { borderRadius: 18 } } },
      MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { borderRadius: 20, border: `0.5px solid ${dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)"}` } } },
      MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 24 } } },
    },
  });
}

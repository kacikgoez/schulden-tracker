import { createTheme, alpha } from "@mui/material/styles";

// Cloudflare-artiges Designsystem: neutrale Flächen, oranger Akzent, feine 1px-Ränder,
// dezente Schatten, Inter-Schrift, großzügiges Spacing.
export function buildTheme(mode) {
  const dark = mode === "dark";

  const orange = dark ? "#ff8438" : "#f6821f";
  const surface = dark ? "#17181b" : "#ffffff";
  const page = dark ? "#0c0d0f" : "#f6f7f9";
  const border = dark ? "#282a30" : "#e6e8ec";
  const textPrimary = dark ? "#f3f4f6" : "#1b1d20";
  const textSecondary = dark ? "#9aa1ab" : "#616875";

  const shadow = dark
    ? "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.35)"
    : "0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.06)";

  return createTheme({
    palette: {
      mode,
      primary: { main: orange, contrastText: "#ffffff" },
      secondary: { main: dark ? "#5aa2ff" : "#2f6fed" },
      success: { main: dark ? "#3ddc84" : "#12a150" },
      warning: { main: dark ? "#f5a623" : "#bd6a02" },
      error: { main: dark ? "#ff6b5e" : "#d92d20" },
      background: { default: page, paper: surface },
      text: { primary: textPrimary, secondary: textSecondary },
      divider: border,
      action: {
        hover: alpha(orange, dark ? 0.1 : 0.06),
        selected: alpha(orange, 0.12),
      },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      h1: { fontSize: 30, fontWeight: 800, letterSpacing: "-0.025em" },
      h2: { fontSize: 21, fontWeight: 750, letterSpacing: "-0.02em" },
      h3: { fontSize: 15.5, fontWeight: 700, letterSpacing: "-0.01em" },
      body1: { fontSize: 14.5 },
      body2: { fontSize: 13.5 },
      caption: { fontSize: 12, letterSpacing: 0 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" },
          "::selection": { background: alpha(orange, 0.25) },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          // Flach statt „Box": kein Rahmen, kein Schatten — nur eine dezent abgesetzte Fläche.
          root: { borderRadius: 18, border: "none", backgroundImage: "none", boxShadow: "none",
            backgroundColor: dark ? "#161719" : "#ffffff" },
        },
      },
      MuiCardContent: { styleOverrides: { root: { padding: 20, "&:last-child": { paddingBottom: 20 } } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, paddingInline: 16, minHeight: 38 },
          contained: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
          outlined: { borderColor: border },
        },
      },
      MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600, height: 24 }, sizeSmall: { height: 20 } } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 10, backgroundColor: dark ? "#1d1f23" : "#fbfbfc" },
          notchedOutline: { borderColor: border },
        },
      },
      MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(page, 0.8), color: textPrimary,
            backdropFilter: "saturate(180%) blur(16px)",
            WebkitBackdropFilter: "saturate(180%) blur(16px)",
            borderBottom: `1px solid ${border}`, boxShadow: "none",
          },
        },
      },
      MuiToolbar: { styleOverrides: { root: { minHeight: 60 } } },
      MuiDialog: { styleOverrides: { paper: { borderRadius: 20, border: `1px solid ${border}`, backgroundImage: "none" } } },
      MuiDrawer: { styleOverrides: { paper: { backgroundImage: "none", borderColor: border } } },
      MuiBottomNavigation: { styleOverrides: { root: { backgroundColor: surface, borderTop: `1px solid ${border}`, height: 62 } } },
      MuiBottomNavigationAction: { styleOverrides: { root: { color: textSecondary, "&.Mui-selected": { color: orange } }, label: { fontSize: 11, "&.Mui-selected": { fontSize: 11.5 } } } },
      MuiDivider: { styleOverrides: { root: { borderColor: border } } },
      MuiLinearProgress: { styleOverrides: { root: { borderRadius: 999, backgroundColor: alpha(orange, 0.14) }, bar: { borderRadius: 999 } } },
      MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8, fontSize: 12 } } },
    },
  });
}

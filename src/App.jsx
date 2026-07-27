import { useMemo, useState, useEffect } from "react";
import { ThemeProvider, CssBaseline } from "@mui/material";
import { buildTheme } from "./theme";
import { useAppState } from "./lib/queries";
import Login from "./components/Login.jsx";
import Shell from "./components/Shell.jsx";
import SplashLoader from "./components/SplashLoader.jsx";

export default function App() {
  const [mode, setMode] = useState(
    () => localStorage.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
  );
  const theme = useMemo(() => buildTheme(mode), [mode]);
  const toggleMode = () => setMode((m) => {
    const next = m === "dark" ? "light" : "dark";
    localStorage.theme = next;
    return next;
  });

  // Session prüfen: /state schlägt mit 401 fehl, wenn nicht eingeloggt.
  const state = useAppState(true);
  const loggedIn = !!state.data?.me;
  const checking = state.isLoading;

  useEffect(() => {
    document.body.style.background = theme.palette.background.default;
  }, [theme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {checking ? (
        <SplashLoader />
      ) : loggedIn ? (
        <Shell state={state.data} mode={mode} toggleMode={toggleMode} />
      ) : (
        <Login onDone={() => state.refetch()} />
      )}
    </ThemeProvider>
  );
}

import { Box, CircularProgress } from "@mui/material";

export default function SplashLoader() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
      <CircularProgress />
    </Box>
  );
}

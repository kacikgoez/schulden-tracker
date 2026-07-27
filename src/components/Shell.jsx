import { useState } from "react";
import {
  Box, AppBar, Toolbar, Typography, IconButton, Paper, BottomNavigation, BottomNavigationAction,
  SpeedDial, SpeedDialAction,
} from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import MicRoundedIcon from "@mui/icons-material/MicRounded";
import LoopRoundedIcon from "@mui/icons-material/LoopRounded";

import Overview from "../views/Overview.jsx";
import Entries from "../views/Entries.jsx";
import Recurring from "../views/Recurring.jsx";
import History from "../views/History.jsx";
import EntryDialog from "./EntryDialog.jsx";
import RecurringDialog from "./RecurringDialog.jsx";
import PayDialog from "./PayDialog.jsx";
import Settings from "../features/Settings.jsx";
import ScanDialog from "../features/ScanDialog.jsx";
import Chat from "../features/Chat.jsx";

const TITLES = { home: "Übersicht", entries: "Einträge", recurring: "Abos & Fixkosten", history: "Verlauf" };

export default function Shell({ state, mode, toggleMode }) {
  const [tab, setTab] = useState("home");
  const [entryDlg, setEntryDlg] = useState(null);      // {} = neu, {…}=bearbeiten, null=zu
  const [recDlg, setRecDlg] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const openEntry = (e = {}) => setEntryDlg(e);

  return (
    <Box sx={{ pb: 12, maxWidth: 760, mx: "auto" }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar>
          <Box sx={{ width: 34, height: 34, borderRadius: 2, mr: 1.5, display: "grid", placeItems: "center",
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.main}, ${t.palette.primary.dark})`,
            color: "#fff", fontWeight: 800, fontSize: 18 }}>₺</Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.02em", textTransform: "uppercase" }}>Kawa · Zeynel</Typography>
            <Typography variant="h2" sx={{ lineHeight: 1 }} noWrap>{TITLES[tab]}</Typography>
          </Box>
          <IconButton onClick={toggleMode}><DarkModeRoundedIcon /></IconButton>
          <IconButton onClick={() => setSettingsOpen(true)}><SettingsRoundedIcon /></IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ px: 1.5, pt: 1 }}>
        {tab === "home" && <Overview goMonth={(m) => { setTab("entries"); window.__setMonth?.(m); }} onPay={() => setPayOpen(true)} onEntry={openEntry} />}
        {tab === "entries" && <Entries onEntry={openEntry} />}
        {tab === "recurring" && <Recurring onAdd={() => setRecDlg({})} onEdit={(r) => setRecDlg(r)} />}
        {tab === "history" && <History />}
      </Box>

      <SpeedDial
        ariaLabel="Hinzufügen" icon={<AddRoundedIcon />}
        sx={{ position: "fixed", bottom: 84, right: 20, zIndex: 1200 }}
      >
        <SpeedDialAction icon={<EditRoundedIcon />} tooltipTitle="Von Hand" tooltipOpen onClick={() => openEntry({})} />
        <SpeedDialAction icon={<PhotoCameraRoundedIcon />} tooltipTitle="Beleg scannen" tooltipOpen onClick={() => setScanOpen(true)} />
        <SpeedDialAction icon={<LoopRoundedIcon />} tooltipTitle="Abo" tooltipOpen onClick={() => setRecDlg({})} />
      </SpeedDial>

      <Paper elevation={3} sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1100, borderRadius: 0 }}>
        <BottomNavigation showLabels value={tab} onChange={(_, v) => v === "chat" ? setChatOpen(true) : setTab(v)}>
          <BottomNavigationAction value="home" label="Übersicht" icon={<HomeRoundedIcon />} />
          <BottomNavigationAction value="entries" label="Einträge" icon={<ReceiptLongRoundedIcon />} />
          <BottomNavigationAction value="recurring" label="Abos" icon={<AutorenewRoundedIcon />} />
          <BottomNavigationAction value="history" label="Verlauf" icon={<HistoryRoundedIcon />} />
          <BottomNavigationAction value="chat" label="Chat" icon={<ChatRoundedIcon />} />
        </BottomNavigation>
      </Paper>

      {entryDlg !== null && <EntryDialog entry={entryDlg} onClose={() => setEntryDlg(null)} />}
      {recDlg !== null && <RecurringDialog rec={recDlg} onClose={() => setRecDlg(null)} />}
      <PayDialog open={payOpen} onClose={() => setPayOpen(false)} />
      <Settings open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ScanDialog open={scanOpen} onClose={() => setScanOpen(false)} />
      <Chat open={chatOpen} onClose={() => setChatOpen(false)} />
    </Box>
  );
}

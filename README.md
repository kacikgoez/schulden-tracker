# 🧾 Schulden-Tracker

Verschlüsseltes Schulden-Kassenbuch für **Kawa & Zeynel** — Git ist die Datenbank,
eine installierbare Web-App (PWA) ist das Dashboard, ein Python-CLI ist die
Schnittstelle für Menschen und LLMs. Keine Server, keine Kosten, nichts zu warten.

## Features

- 📱 **Als App installierbar** (iOS: Safari → Teilen → „Zum Home-Bildschirm";
  Android: Chrome → „App installieren")
- 📷 **Beleg-Scan mit KI**: Foto aufnehmen, optional sagen was extrahiert werden
  soll → Einträge werden vorgeschlagen, der Beleg wird **verschlüsselt** unter
  `data/receipts/` gespeichert und ist am Eintrag (📎) jederzeit abrufbar
- 🎤 **Diktat auf Deutsch** — kostenlos über die Browser-Spracherkennung, die KI
  formt daraus den Eintrag
- ↩︎ **Git-artiges Änderungsprotokoll**: Jede Änderung (wer/wann/was, mit
  Vorher/Nachher-Diff) im Reiter „Verlauf", einzeln rückgängig machbar — und
  jeder Speichervorgang ist zusätzlich ein echter Git-Commit
- 🔀 Konflikt-sicher: gleichzeitige Änderungen von zwei Geräten werden gemerged

## Wie es funktioniert

```
data/ledger.enc   ←  Daten (AES-256-GCM mit dem zufälligen Datenschlüssel DEK)
data/keys.enc     ←  Nutzer + Passwörter: jedes Passwort „packt" denselben DEK ein
index.html        ←  Dashboard: entschlüsselt IM BROWSER, Login pro Nutzer
ledger.py         ←  CLI: balance / show / add / rm / json … (nutzt den DEK aus $LEDGER_DEK oder Keychain)
```

### Zwei Nutzer, eigene Passwörter, Admin-Wiederherstellung

- Die Daten sind mit einem **Datenschlüssel (DEK)** verschlüsselt, nicht direkt mit
  einem Passwort. In `keys.enc` liegt der DEK je einmal **mit dem Passwort jedes
  Nutzers verschlüsselt** (PBKDF2-SHA256, 310k → AES-GCM-Wrapping).
- **Kawa = Admin**, Zeynel = normaler Nutzer. Jeder setzt sein eigenes Passwort
  (⚙︎ → „Passwort & Nutzer"). Beim Login wird automatisch erkannt, wer man ist.
- **Passwort vergessen?** Der **Admin** kann in den Einstellungen ein neues Passwort
  für den anderen setzen (er hält den DEK). Für den Totalverlust gibt es einen
  **Wiederherstellungscode** (= der DEK als base32): auf dem Login-Screen
  „Passwort vergessen?" → Code + neues Passwort. Den Code zeigt der Admin unter
  ⚙︎ an und bewahrt ihn offline sicher auf.
- Passwörter selbst sind **nicht** wiederherstellbar (nur der Zugang). Wer keinen
  Code und kein Passwort mehr hat, kommt nicht an die Daten — das ist der Preis
  echter Verschlüsselung.

- **Ende-zu-Ende verschlüsselt:** Im Repo und beim Hoster liegt nur Ciphertext.
  Das Repo kann deshalb sogar öffentlich sein; privat ist trotzdem empfohlen.
- **Fail-safe:** Jede Änderung ist ein Git-Commit (Historie = Undo). Das CLI legt
  zusätzlich lokale Backups unter `.backups/` an und validiert vor jedem Schreiben.
- **Zwei Schreibwege, ein Format:** Browser (verschlüsselt lokal, committet per
  GitHub-API) und CLI (entschlüsselt lokal, committet per `git push`).

## Hosting (kostenlos)

1. Repo auf GitHub pushen (`gh repo create schulden-tracker --private --source . --push`).
2. **GitHub Pages:** Settings → Pages → „Deploy from branch" → `main`, Ordner `/ (root)`.
   Bei privatem Repo braucht Pages einen Pro-Account — Alternative ohne Kosten:
   **Cloudflare Pages** (Repo verbinden, kein Build-Befehl, Output `/`).
3. Fertig. Die Seite lädt `data/keys.enc` + `data/ledger.enc` und fragt nach dem Passwort.

Lokal testen: `python3 -m http.server -d ~/schulden-tracker 8080` → http://localhost:8080

## Passwörter & Wiederherstellungscode

- Jeder Nutzer hat sein eigenes Passwort (in der App unter ⚙︎ änderbar). Passwörter
  liegen nur als DEK-Wrapping in `keys.enc`, nie im Klartext.
- Der **Wiederherstellungscode** (= DEK, base32) liegt für die CLI im
  macOS-Schlüsselbund: `security find-generic-password -s schulden-tracker-dek -w`.
  Offline sicher aufbewahren; er entsperrt alles und setzt bei Bedarf Passwörter neu.
- Neues Passwort für den anderen: Admin (Kawa) in der App unter ⚙︎ → „Passwort & Nutzer".

## Schreiben aus dem Browser (optional)

Im Dashboard unter ⚙︎: `owner/repo`, Branch und ein **fine-grained Personal Access
Token** (nur dieses Repo, nur „Contents: Read and write"). Damit committet die Seite
Änderungen direkt. Ohne Token bleibt sie lesend und bietet die geänderte Datei als
Download an. Der GitHub-Token wird auf dem Gerät **mit dem DEK verschlüsselt**
abgelegt (nie im Repo).

## KI für Beleg-Scan & Diktat

Unter ⚙︎ → „KI" einen Anbieter wählen:

| Anbieter | Kosten | Schlüssel |
|---|---|---|
| **OpenRouter → Qwen3-VL 235B** (Standard) — Flaggschiff-OCR, chinesisches Open-Weight-Modell | $0,20/M in · $0,88/M out ≈ 0,1–0,2 Cent/Beleg | openrouter.ai → Keys |
| Google Gemini (`gemini-2.5-pro` o. ä.) | Free-Tier/Cents | aistudio.google.com |
| OpenAI (`gpt-4o-mini`) | ~0,1 Cent/Beleg | platform.openai.com |
| OpenAI-kompatibel (GLM-4.6V bei z.ai, DashScope …) | teils gratis | Base-URL + Key |

Das Diktat nutzt die kostenlose Browser-Spracherkennung (de-DE); die KI parst nur
den erkannten Text. Belege werden **vor** dem Upload clientseitig verschlüsselt —
der KI-Anbieter sieht das Foto zur Analyse, das Repo nur Ciphertext.

## Regeln des Kassenbuchs

- Betrag = `qty × unit_price` (qty leer = 1) · `split5050` ⇒ der andere schuldet die Hälfte.
- Bilanz = Summe der geschuldeten Anteile, gegeneinander verrechnet.
- **Pfand nur bei Kategorie „Getränke"** (Einweg 0,25 € / Mehrweg 0,15 € / Bierflasche 0,08 €);
  läuft als Merkposten „Pfand im Umlauf", zählt nicht in die Bilanz.
- Fixkosten mit `active_until` gelten als beendet und erzeugen keine neuen Posten.

## Zahlungs-Erinnerung

Drei Ebenen, alle kostenlos:

1. **In-App-Banner** auf der Übersicht, sobald am Stichtag (⚙︎ → „Zahlungs-Erinnerung",
   geteilt, Standard: 1. des Monats) ein offener Saldo besteht — mit
   „Ausgleich verbuchen" (legt die Rückzahlung an) und „diesen Monat ausblenden".
2. **Systembenachrichtigung** beim App-Öffnen am/nach dem Stichtag
   (⚙︎ → „Benachrichtigungen erlauben"; funktioniert auch als installierte PWA).
3. **Push aufs Handy ohne App-Öffnen:** GitHub Action
   (`.github/workflows/zahlungs-erinnerung.yml`) schickt am 1. des Monats eine
   Nachricht über [ntfy.sh](https://ntfy.sh) — Repo-Secret `NTFY_TOPIC` setzen
   und das Topic in der gratis ntfy-App abonnieren. Die Nachricht ist generisch,
   da die Action die verschlüsselten Daten nicht lesen kann (Absicht).

## Historie

Reiter „Verlauf": jede Änderung mit Person, Zeit, Aktion und Vorher/Nachher-Diff,
filterbar nach Person/Aktion/Volltext. Das ⌛ an jedem Eintrag zeigt dessen
komplette Änderungskette; jedes Ereignis ist einzeln rückgängig zu machen.
Darunter liegt zusätzlich die echte Git-Historie (ein Commit pro Speichervorgang).

## Für LLMs / Automatisierung

Siehe [CLAUDE.md](CLAUDE.md). Kurzform:

```bash
python3 ledger.py balance                 # Bilanz gesamt + je Monat
python3 ledger.py show 2026-07            # Einträge eines Monats
python3 ledger.py add --date 2026-07-28 --cat Benzin --desc "Tanken Star" \
    --price 41.20 --split                 # neuer Eintrag (validiert, verschlüsselt, Backup)
python3 ledger.py json                    # kompletter Datensatz als JSON
git add data/ledger.enc && git commit -m "..." && git push
```

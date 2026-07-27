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

## Wie es funktioniert (server-autoritativ)

Normale Web-App auf **Cloudflare** — nichts Verschlüsseltes im Browser:

```
Cloudflare Pages      →  statische App (index.html …)
Pages Functions       →  functions/api/…  = die API (Login, Sessions, CRUD, Validierung)
Cloudflare D1 (SQLite)→  die Datenbank (users, entries, sessions, settings, history, receipts)
```

- **Login:** Nutzer + Passwort → Server prüft (PBKDF2-SHA256, 4× verkettet ≈ 400k)
  → Session-Token als **HttpOnly-Secure-Cookie** (30 Tage). Kein Token-Handling im Client.
- **Server-autoritativ:** Jede Änderung geht über die API, wird serverseitig validiert
  (Kategorie/Zahler/Datum/Pfand-Regel), protokolliert (history) und in D1 gespeichert.
- **Autorisierung:** Zahlungen bestätigt nur der Empfänger; Passwörter anderer setzt nur der Admin (Kawa).
- **Sicher:** HTTPS erzwungen, Passwörter nur gehasht, Sessions serverseitig, Eingaben validiert.

Live: **https://schulden-kz.pages.dev** — öffnen, Nutzer wählen, Passwort, fertig.
Free-Tier (Pages + D1) → **0 €/Monat**.

## Deploy / Entwicklung

```bash
npx wrangler login                    # einmalig
./deploy.sh                           # App + Functions nach Cloudflare Pages
npx wrangler d1 execute schulden --remote --file schema.sql   # Schema (einmalig)
node migrate.js > migrate.sql && npx wrangler d1 execute schulden --remote --file migrate.sql  # Daten (einmalig)
```

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

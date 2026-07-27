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

## Architektur

Frontend: **React + Vite + MUI (Material UI)** + **TanStack Query**. Backend unverändert:
Cloudflare **Pages Functions** (`functions/api/…`) + **D1** (SQLite). Server-autoritativ,
Login mit Sessions (HttpOnly-Cookie), serverseitige Validierung.

```
src/           React-App (components, views, features, lib)
functions/api  Server-API (Login, CRUD, Zahlungen, Abos, Belege, Einstellungen)
public/        PWA-Assets (manifest, icons, service worker)
schema.sql     D1-Schema · migrate.js  Alt-Migration
legacy/        alte Vanilla-Version (Referenz)
```

Entwicklung:
```bash
npm install
npx wrangler pages dev dist --d1 schulden=<id>   # API lokal (nach npm run build)
npm run dev                                        # Vite mit /api-Proxy auf :8788
```

Deploy (alles nach Cloudflare Pages):
```bash
npx wrangler login      # einmalig
./deploy.sh             # npm run build + wrangler pages deploy dist (inkl. Functions + D1)
```
Live: **https://schulden-kz.pages.dev**

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

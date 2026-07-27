# Anweisungen für LLMs (Claude Code u. a.)

Dieses Repo ist ein verschlüsseltes Schulden-Kassenbuch (Kawa ↔ Zeynel).
**Alle Interaktion läuft über `ledger.py`** — niemals `data/ledger.enc` von Hand
bearbeiten, niemals Klartext-Exporte (`*.plain.json`) committen.

## Passphrase

`ledger.py` holt sie automatisch aus `$LEDGER_KEY` oder dem macOS-Schlüsselbund
(Service `schulden-tracker`). Wenn beides fehlt: den Nutzer fragen, nicht raten.

## Typische Aufgaben

| Aufgabe | Befehl |
|---|---|
| Bilanz ansehen | `python3 ledger.py balance` |
| Monat anzeigen | `python3 ledger.py show 2026-07` |
| Eintrag anlegen | `python3 ledger.py add --date … --cat … --desc … --payer Kawa --price …` |
| 50:50 teilen | Flag `--split` anhängen |
| Menge | `--qty 3` (Betrag = qty × price) |
| Pfand (nur Getränke!) | `--pfand-qty 3 --pfand-type Einweg` |
| Eintrag löschen | `python3 ledger.py rm <id>` (IDs zeigt `show`) |
| Kategorien | `python3 ledger.py categories` |
| Integrität prüfen | `python3 ledger.py validate` |

Nach Schreiboperationen committen und pushen:

```bash
git add data/ledger.enc && git commit -m "ledger: <kurze Beschreibung>" && git push
```

## Regeln (werden vom CLI erzwungen, bitte trotzdem beachten)

- Zahler ist, wer bezahlt hat (`Kawa` oder `Zeynel`); der jeweils andere schuldet.
- `--split` ⇒ hälftige Teilung (z. B. Tanken wird immer 50:50 geteilt).
- Pfand ausschließlich bei Kategorie `Getränke`.
- Datumsformat `JJJJ-MM-TT`. Beträge sind Einzelpreise, nicht Summen.
- Beerdigungs-/Türkei-Ausgaben: Kategorie `Beerdigung`, volle Höhe (kein `--split`).

## Was du NICHT tun sollst

- Keine Klartext-Daten in Dateien außerhalb von `.backups/` schreiben.
- `data/ledger.enc` nicht mit anderen Tools regenerieren (Formatkompatibilität
  Browser ⇄ CLI hängt am Envelope: PBKDF2-SHA256 310k, AES-256-GCM).
- Die Passphrase nie loggen, committen oder in Ausgaben zitieren.

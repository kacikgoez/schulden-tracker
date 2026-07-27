#!/usr/bin/env python3
"""Schulden-Tracker CLI — verschlüsseltes Kassenbuch für Kawa & Zeynel.

Datenhaltung: data/ledger.enc (v2, AES-256-GCM mit dem Datenschlüssel DEK).
Der DEK ist der Wiederherstellungscode (base32). Quellen (in dieser Reihenfolge):
  1. Umgebungsvariable LEDGER_DEK
  2. macOS-Schlüsselbund, Service "schulden-tracker-dek"
Passwörter der Nutzer stehen in data/keys.enc und packen denselben DEK ein; die CLI
nutzt den DEK direkt und braucht daher kein Nutzerpasswort.

Befehle (alle geben Klartext/JSON auf stdout aus — gut für Menschen UND LLMs):
  balance                     Gesamtbilanz + Monatsbilanzen
  show [JJJJ-MM]              Einträge (eines Monats oder alle), Tabellenform
  json                        kompletten Klartext-Datensatz als JSON ausgeben
  add --date JJJJ-MM-TT --cat KATEGORIE --desc TEXT --payer Kawa|Zeynel
      --price 1.99 [--qty 2] [--split] [--pfand-qty 3] [--pfand-type Einweg|Mehrweg|Bierflasche]
  rm ID                       Eintrag löschen (ID aus `show`)
  history [-n N]              Änderungsprotokoll
  categories                  erlaubte Kategorien auflisten
  validate                    Datei entschlüsseln + Schema prüfen

Regeln:
  - Betrag = qty × price (qty leer = 1). --split ⇒ der andere schuldet die Hälfte.
  - Pfand ist NUR bei Kategorie "Getränke" erlaubt (Einweg 0,25 / Mehrweg 0,15 / Bier 0,08).
  - Vor jedem Schreiben: Backup nach .backups/ und atomares Ersetzen.
"""
import argparse, base64, datetime, json, os, secrets, shutil, subprocess, sys, tempfile

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ROOT = os.path.dirname(os.path.abspath(__file__))
ENC_PATH = os.path.join(ROOT, "data", "ledger.enc")
BACKUP_DIR = os.path.join(ROOT, ".backups")
KDF_ITER = 310_000
PFAND_RATES = {"Einweg": 0.25, "Mehrweg": 0.15, "Bierflasche": 0.08}
PEOPLE = ("Kawa", "Zeynel")


def dek() -> bytes:
    """Datenschlüssel (32 Byte) aus dem Wiederherstellungscode (base32).
    Quelle: $LEDGER_DEK oder Schlüsselbund-Service 'schulden-tracker-dek'."""
    code = os.environ.get("LEDGER_DEK")
    if not code:
        try:
            out = subprocess.run(
                ["security", "find-generic-password", "-s", "schulden-tracker-dek", "-w"],
                capture_output=True, text=True, timeout=5)
            if out.returncode == 0:
                code = out.stdout.strip()
        except Exception:
            pass
    if not code:
        sys.exit("Kein Datenschlüssel gefunden. Wiederherstellungscode setzen: "
                 "export LEDGER_DEK='<code>'  oder im Schlüsselbund unter 'schulden-tracker-dek'.")
    raw = code.replace("-", "").replace(" ", "").upper()
    raw += "=" * (-len(raw) % 8)
    key = base64.b32decode(raw)
    if len(key) != 32:
        sys.exit("Ungültiger Wiederherstellungscode (erwarte 32 Byte).")
    return key


def decrypt(_pw=None) -> dict:
    env = json.load(open(ENC_PATH))
    assert env.get("v") == 2, "erwarte Ledger-Format v2"
    pt = AESGCM(dek()).decrypt(base64.b64decode(env["iv"]), base64.b64decode(env["ct"]), None)
    return json.loads(pt)


def encrypt(_pw, data: dict) -> None:
    data["updated"] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    iv = secrets.token_bytes(12)
    ct = AESGCM(dek()).encrypt(iv, json.dumps(data, ensure_ascii=False).encode(), None)
    env = {"v": 2, "iv": base64.b64encode(iv).decode(), "ct": base64.b64encode(ct).decode()}
    if os.path.exists(ENC_PATH):
        os.makedirs(BACKUP_DIR, exist_ok=True)
        stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M%S")
        shutil.copy2(ENC_PATH, os.path.join(BACKUP_DIR, f"ledger-{stamp}.enc"))
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(ENC_PATH))
    with os.fdopen(fd, "w") as f:
        json.dump(env, f)
    os.replace(tmp, ENC_PATH)


def amount(e: dict) -> float:
    return round((e.get("qty") or 1) * e["unit_price"], 2)


def owed(e: dict) -> float:
    a = amount(e)
    return round(a / 2, 3) if e.get("split5050") else a


def validate(data: dict) -> list:
    errors = []
    cats = set(data["categories"])
    seen = set()
    for e in data["entries"]:
        eid = e.get("id", "?")
        if eid in seen:
            errors.append(f"{eid}: doppelte ID")
        seen.add(eid)
        if e["payer"] not in PEOPLE:
            errors.append(f"{eid}: unbekannter Zahler {e['payer']}")
        if e["category"] not in cats:
            errors.append(f"{eid}: unbekannte Kategorie {e['category']}")
        try:
            datetime.date.fromisoformat(e["date"])
        except ValueError:
            errors.append(f"{eid}: ungültiges Datum {e['date']}")
        if e.get("pfand_qty") and e["category"] != "Getränke":
            errors.append(f"{eid}: Pfand nur bei Kategorie 'Getränke'")
        if e.get("pfand_type") and e["pfand_type"] not in PFAND_RATES:
            errors.append(f"{eid}: unbekannte Pfand-Art {e['pfand_type']}")
    return errors


def balances(data: dict):
    total = {"Kawa": 0.0, "Zeynel": 0.0}
    months = {}
    for e in data["entries"]:
        m = e["date"][:7]
        months.setdefault(m, {"Kawa": 0.0, "Zeynel": 0.0})
        months[m][e["payer"]] += owed(e)
        total[e["payer"]] += owed(e)
    return total, dict(sorted(months.items()))


def fmt_eur(x: float) -> str:
    return f"{x:,.2f} €".replace(",", "X").replace(".", ",").replace("X", ".")


def cmd_balance(data, _args):
    total, months = balances(data)
    for m, t in months.items():
        net = t["Kawa"] - t["Zeynel"]
        who = "Zeynel→Kawa" if net >= 0 else "Kawa→Zeynel"
        print(f"{m}: {who} {fmt_eur(abs(net))}   (Kawa zahlte {fmt_eur(t['Kawa'])}, Zeynel {fmt_eur(t['Zeynel'])})")
    net = total["Kawa"] - total["Zeynel"]
    who = "Zeynel zahlt Kawa" if net >= 0 else "Kawa zahlt Zeynel"
    print(f"\nGESAMT: {who} {fmt_eur(abs(net))}")
    pfand = sum((e.get("pfand_qty") or 0) * PFAND_RATES.get(e.get("pfand_type") or "Einweg", 0.25)
                for e in data["entries"])
    if pfand:
        print(f"Pfand im Umlauf: {fmt_eur(pfand)}")


def cmd_show(data, args):
    rows = [e for e in data["entries"] if not args.month or e["date"].startswith(args.month)]
    rows.sort(key=lambda e: (e["date"], e["id"]))
    for e in rows:
        q = f"{e['qty']}× " if e.get("qty") else ""
        s = " ½" if e.get("split5050") else "  "
        pf = f"  Pfand {e['pfand_qty']}×{e.get('pfand_type', 'Einweg')}" if e.get("pfand_qty") else ""
        print(f"{e['id']:>6}  {e['date']}  {e['category']:<18} {q}{e['description']}"
              f"  {fmt_eur(amount(e))}{s} → {fmt_eur(owed(e))} ({e['payer']} zahlte){pf}")
    if not rows:
        print("keine Einträge")


def log_event(data, action, entry_id, before, after, actor="CLI"):
    data.setdefault("history", []).append({
        "id": "h" + secrets.token_hex(4), "ts":
        datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "actor": actor, "action": action, "entry": entry_id,
        "before": before, "after": after})


def cmd_add(data, args):
    if args.pfand_qty and args.cat != "Getränke":
        sys.exit("FEHLER: Pfand ist nur bei Kategorie 'Getränke' erlaubt.")
    if args.cat not in data["categories"]:
        sys.exit(f"FEHLER: unbekannte Kategorie '{args.cat}'. Siehe: ledger.py categories")
    datetime.date.fromisoformat(args.date)
    nid = "e" + secrets.token_hex(3)
    e = {"id": nid, "date": args.date, "category": args.cat, "description": args.desc,
         "payer": args.payer, "qty": args.qty, "unit_price": args.price,
         "split5050": bool(args.split)}
    if args.pfand_qty:
        e["pfand_qty"] = args.pfand_qty
        e["pfand_type"] = args.pfand_type or "Einweg"
    data["entries"].append(e)
    log_event(data, "add", nid, None, dict(e), actor=args.actor)
    errs = validate(data)
    if errs:
        sys.exit("Validierung fehlgeschlagen: " + "; ".join(errs))
    encrypt(None, data)
    print(f"OK {nid}: {args.date} {args.desc} {fmt_eur(amount(e))} → schuldet {fmt_eur(owed(e))}")


def cmd_rm(data, args):
    before = len(data["entries"])
    removed = [e for e in data["entries"] if e["id"] == args.id]
    data["entries"] = [e for e in data["entries"] if e["id"] != args.id]
    if len(data["entries"]) == before:
        sys.exit(f"ID {args.id} nicht gefunden.")
    log_event(data, "delete", args.id, dict(removed[0]), None, actor=args.actor)
    encrypt(None, data)
    print(f"entfernt: {removed[0]['date']} {removed[0]['description']}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("balance")
    s = sub.add_parser("show"); s.add_argument("month", nargs="?")
    sub.add_parser("json")
    a = sub.add_parser("add")
    a.add_argument("--date", required=True); a.add_argument("--cat", required=True)
    a.add_argument("--desc", required=True); a.add_argument("--payer", required=True, choices=PEOPLE)
    a.add_argument("--price", required=True, type=float); a.add_argument("--qty", type=int)
    a.add_argument("--split", action="store_true")
    a.add_argument("--pfand-qty", type=int); a.add_argument("--pfand-type", choices=list(PFAND_RATES))
    a.add_argument("--actor", default="CLI", help="wer die Änderung macht (Kawa/Zeynel/CLI)")
    r = sub.add_parser("rm"); r.add_argument("id")
    r.add_argument("--actor", default="CLI")
    h = sub.add_parser("history"); h.add_argument("-n", type=int, default=30)
    sub.add_parser("categories")
    sub.add_parser("validate")
    args = p.parse_args()

    data = decrypt(None)
    if args.cmd == "balance":
        cmd_balance(data, args)
    elif args.cmd == "show":
        cmd_show(data, args)
    elif args.cmd == "json":
        print(json.dumps(data, ensure_ascii=False, indent=2))
    elif args.cmd == "add":
        cmd_add(data, args)
    elif args.cmd == "rm":
        cmd_rm(data, args)
    elif args.cmd == "history":
        for h in data.get("history", [])[-args.n:]:
            ref = h.get("after") or h.get("before") or {}
            print(f"{h['ts']}  [{h['actor']}] {h['action']:<7} {h['entry']}  "
                  f"{ref.get('date','')} {ref.get('description','')}")
    elif args.cmd == "categories":
        print("\n".join(data["categories"]))
    elif args.cmd == "validate":
        errs = validate(data)
        print("OK — Schema gültig" if not errs else "FEHLER:\n" + "\n".join(errs))
        sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()

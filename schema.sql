-- Schulden-Tracker — server-autoritatives Schema (Cloudflare D1)
CREATE TABLE IF NOT EXISTS users (
  name       TEXT PRIMARY KEY,
  pw_hash    TEXT NOT NULL,
  pw_salt    TEXT NOT NULL,
  is_admin   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sessions (
  token   TEXT PRIMARY KEY,
  user    TEXT NOT NULL,
  expires INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS entries (
  id           TEXT PRIMARY KEY,
  date         TEXT NOT NULL,
  category     TEXT NOT NULL,
  description  TEXT NOT NULL,
  payer        TEXT NOT NULL,
  qty          INTEGER,
  unit_price   REAL NOT NULL,
  split5050    INTEGER NOT NULL DEFAULT 0,
  pfand_qty    INTEGER,
  pfand_type   TEXT,
  pay_status   TEXT,
  pay_method   TEXT,
  claimed_by   TEXT,
  claimed_ts   TEXT,
  confirmed_by TEXT,
  confirmed_ts TEXT,
  receipt      TEXT,
  receipt_note TEXT,
  mt           TEXT,
  created_by   TEXT
);
CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);

CREATE TABLE IF NOT EXISTS history (
  id     TEXT PRIMARY KEY,
  ts     TEXT NOT NULL,
  actor  TEXT NOT NULL,
  action TEXT NOT NULL,
  entry  TEXT,
  before TEXT,
  after  TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  k TEXT PRIMARY KEY,
  v TEXT
);

CREATE TABLE IF NOT EXISTS receipts (
  id   TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

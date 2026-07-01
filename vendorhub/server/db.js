const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'vendorhub.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  access_level TEXT DEFAULT 'Read',
  color TEXT DEFAULT '#29ABE2',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  group_id INTEGER REFERENCES groups(id),
  department TEXT,
  status TEXT DEFAULT 'active',
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER REFERENCES groups(id),
  module TEXT NOT NULL,
  access_level TEXT DEFAULT 'Read'
);

CREATE TABLE IF NOT EXISTS vendors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  gstin TEXT,
  website TEXT,
  address TEXT,
  geo_scope TEXT,
  empanelment_status TEXT DEFAULT 'In Evaluation',
  tier TEXT DEFAULT 'Tier 2',
  vendor_type TEXT,
  summary TEXT,
  logo_initial TEXT,
  logo_color TEXT,
  added_by TEXT,
  added_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendor_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  domain TEXT
);

CREATE TABLE IF NOT EXISTS vendor_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  tag TEXT
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT,
  role TEXT,
  email TEXT,
  phone TEXT
);

CREATE TABLE IF NOT EXISTS contracts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  type TEXT,
  start_date DATE,
  end_date DATE,
  value REAL,
  sla TEXT,
  status TEXT DEFAULT 'Active'
);

CREATE TABLE IF NOT EXISTS certifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT,
  issuer TEXT,
  expiry DATE,
  is_valid INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  rating REAL,
  on_time_delivery INTEGER,
  support_quality INTEGER,
  price_competitiveness INTEGER,
  notes TEXT,
  reviewed_by TEXT,
  reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  name TEXT,
  type TEXT,
  size INTEGER,
  file_path TEXT,
  uploaded_by TEXT,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS escalation_matrix (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
  level TEXT,
  name TEXT,
  contact TEXT,
  phone TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS backup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATETIME,
  type TEXT,
  size_mb REAL,
  status TEXT,
  destination TEXT,
  file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

function isFirstRun() {
  const row = db.prepare("SELECT value FROM settings WHERE key='initialized'").get();
  return !row;
}

module.exports = { db, isFirstRun };

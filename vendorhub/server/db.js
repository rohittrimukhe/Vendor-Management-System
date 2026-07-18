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

// Migrations — safe to run multiple times
const migrations = [
  `ALTER TABLE users ADD COLUMN reporting_manager_id INTEGER REFERENCES users(id)`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    action TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS vendor_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by TEXT,
    created_by_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE vendors ADD COLUMN risk_score INTEGER DEFAULT 0`,
  `ALTER TABLE vendors ADD COLUMN risk_level TEXT DEFAULT 'Low'`,
  `ALTER TABLE documents ADD COLUMN category TEXT DEFAULT 'Other'`,
  `ALTER TABLE documents ADD COLUMN expiry_date DATE`,
  `ALTER TABLE documents ADD COLUMN description TEXT`,
  `CREATE TABLE IF NOT EXISTS vendor_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assigned_to TEXT,
    assigned_to_id INTEGER REFERENCES users(id),
    due_date DATE,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    created_by TEXT,
    created_by_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME
  )`,
  `CREATE TABLE IF NOT EXISTS scoring_criteria (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    weight INTEGER DEFAULT 20,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS vendor_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    criteria_id INTEGER REFERENCES scoring_criteria(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    notes TEXT,
    scored_by TEXT,
    scored_by_id INTEGER,
    scored_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(vendor_id, criteria_id)
  )`,
  `CREATE TABLE IF NOT EXISTS vendor_onboarding (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    stage TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    assigned_to TEXT,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_by TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    field_type TEXT DEFAULT 'text',
    applies_to TEXT DEFAULT 'all',
    options TEXT,
    required INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS vendor_custom_fields (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    field_def_id INTEGER REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    value TEXT,
    UNIQUE(vendor_id, field_def_id)
  )`,
  // Vendor visibility: who can see a vendor
  `ALTER TABLE vendors ADD COLUMN visibility TEXT DEFAULT 'everyone'`,
  `CREATE TABLE IF NOT EXISTS vendor_visibility_users (
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (vendor_id, user_id)
  )`,
  // Vendor approval workflow
  `ALTER TABLE vendors ADD COLUMN approval_status TEXT DEFAULT 'approved'`,
  `ALTER TABLE vendors ADD COLUMN approval_requested_by INTEGER REFERENCES users(id)`,
  `ALTER TABLE vendors ADD COLUMN approval_reviewer_id INTEGER REFERENCES users(id)`,
  `CREATE TABLE IF NOT EXISTS vendor_approval_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    username TEXT,
    role TEXT,
    note TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
  `ALTER TABLE vendors ADD COLUMN primary_email TEXT`,
  `ALTER TABLE vendors ADD COLUMN primary_phone TEXT`,
];

for (const sql of migrations) {
  try { db.exec(sql); } catch (e) { /* column/table already exists — safe to ignore */ }
}

function isFirstRun() {
  const row = db.prepare("SELECT value FROM settings WHERE key='initialized'").get();
  return !row;
}

module.exports = { db, isFirstRun };

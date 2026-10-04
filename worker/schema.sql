PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('buyer','supplier','admin')),
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS supplier_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  business TEXT NOT NULL,
  phone TEXT NOT NULL,
  category TEXT,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  segment TEXT,
  location TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  emoji TEXT,
  supplier_name TEXT NOT NULL,
  supplier_profile_id TEXT,
  location TEXT,
  price REAL NOT NULL,
  unit TEXT NOT NULL,
  moq INTEGER NOT NULL DEFAULT 1,
  stock INTEGER NOT NULL DEFAULT 0,
  rating REAL NOT NULL DEFAULT 0,
  tiers_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  FOREIGN KEY (supplier_profile_id) REFERENCES supplier_profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  idempotency_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT,
  UNIQUE (buyer_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id INTEGER,
  product_name TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit TEXT NOT NULL,
  unit_price REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS supplier_splits (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  gross REAL NOT NULL,
  commission_rate REAL NOT NULL,
  commission REAL NOT NULL,
  net REAL NOT NULL,
  payout_status TEXT NOT NULL DEFAULT 'Pending',
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rfqs (
  id TEXT PRIMARY KEY,
  buyer_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  supplier_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  target_price REAL,
  delivery_location TEXT NOT NULL,
  needed_by TEXT,
  status TEXT NOT NULL DEFAULT 'Open',
  idempotency_key TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  UNIQUE (buyer_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS rfq_messages (
  id TEXT PRIMARY KEY,
  rfq_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  message TEXT NOT NULL,
  amount REAL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (rfq_id) REFERENCES rfqs(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT NOT NULL UNIQUE,
  order_id TEXT NOT NULL UNIQUE,
  buyer_id TEXT NOT NULL,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'Issued',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  buyer_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL,
  status TEXT NOT NULL,
  provider_payload_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_rfqs_buyer ON rfqs(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rfq_messages_rfq ON rfq_messages(rfq_id, created_at);
CREATE INDEX IF NOT EXISTS idx_supplier_splits_order ON supplier_splits(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
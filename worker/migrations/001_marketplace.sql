-- Additive, idempotent multi-vendor marketplace tables. No changes to legacy orders/products.
CREATE TABLE IF NOT EXISTS merchant_stores (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL,
  public_phone TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS merchant_uploads (
  key TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(store_id) REFERENCES merchant_stores(id) ON DELETE CASCADE,
  FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS merchant_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL CHECK (price >= 1),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit TEXT NOT NULL DEFAULT 'each',
  image_key TEXT,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Published','Archived')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(store_id) REFERENCES merchant_stores(id) ON DELETE CASCADE,
  FOREIGN KEY(image_key) REFERENCES merchant_uploads(key) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_merchant_products_store ON merchant_products(store_id,status,updated_at);
CREATE INDEX IF NOT EXISTS idx_merchant_uploads_owner ON merchant_uploads(owner_user_id,store_id);

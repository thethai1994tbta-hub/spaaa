const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const os = require('os');
const fs = require('fs');

const appData = path.join(os.homedir(), 'AppData', 'Local', 'SpaApp');
const dbPath = path.join(appData, 'spa.db');

if (!fs.existsSync(appData)) {
  fs.mkdirSync(appData, { recursive: true });
}

let db;

function getDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) console.error('[DB] Error opening database:', err);
      else console.log('[DB] Database connected');
    });
    db.configure('busyTimeout', 5000);
  }
  return db;
}

function initDatabase() {
  const database = getDatabase();

  database.serialize(() => {
    database.run('PRAGMA foreign_keys = ON');

    const schema = [
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE,
        email TEXT,
        address TEXT,
        points INTEGER DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS services (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        price REAL NOT NULL,
        duration INTEGER DEFAULT 60,
        description TEXT,
        category TEXT,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        position TEXT,
        salary REAL,
        commission_rate REAL DEFAULT 0.1,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        staff_id INTEGER NOT NULL,
        service_id INTEGER NOT NULL,
        booking_date DATETIME NOT NULL,
        status TEXT DEFAULT 'pending',
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (staff_id) REFERENCES staff(id),
        FOREIGN KEY (service_id) REFERENCES services(id)
      )`,
      `CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        booking_id INTEGER,
        customer_id INTEGER NOT NULL,
        staff_id INTEGER,
        amount REAL NOT NULL,
        payment_method TEXT,
        transaction_type TEXT DEFAULT 'service',
        commission_amount REAL,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (staff_id) REFERENCES staff(id),
        FOREIGN KEY (booking_id) REFERENCES bookings(id)
      )`,
      `CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        category TEXT,
        quantity INTEGER DEFAULT 0,
        unit_price REAL,
        reorder_level INTEGER DEFAULT 10,
        supplier TEXT,
        last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS backup_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        backup_path TEXT,
        backup_size INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date)`,
      `CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name)`,
    ];

    schema.forEach(sql => {
      database.run(sql, (err) => {
        if (err) console.error('[DB] Schema error:', err);
      });
    });
  });

  console.log('[DB] Database initialized at:', dbPath);
}

function closeDatabase() {
  if (db) {
    db.close((err) => {
      if (err) console.error('[DB] Error closing database:', err);
      db = null;
    });
  }
}

function getDatabasePath() {
  return dbPath;
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    const database = getDatabase();
    database.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

module.exports = {
  getDatabase,
  initDatabase,
  closeDatabase,
  getDatabasePath,
  runQuery,
  getQuery,
  allQuery,
};

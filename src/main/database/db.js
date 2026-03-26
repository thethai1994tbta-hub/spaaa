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
        steps TEXT,
        commission_rate REAL DEFAULT 0,
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
        customer_id INTEGER,
        staff_id INTEGER,
        amount REAL NOT NULL,
        payment_method TEXT,
        transaction_type TEXT DEFAULT 'service',
        commission_amount REAL,
        status TEXT DEFAULT 'completed',
        notes TEXT,
        date DATETIME,
        items TEXT,
        subtotal REAL,
        discount REAL,
        discount_type TEXT,
        points_used INTEGER,
        points_earned INTEGER,
        customer_name TEXT,
        staff_name TEXT,
        deleted INTEGER DEFAULT 0,
        expense_category TEXT,
        expense_category_label TEXT,
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
      `CREATE TABLE IF NOT EXISTS packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT,
        description TEXT,
        price REAL DEFAULT 0,
        sessions INTEGER DEFAULT 1,
        validity_days INTEGER DEFAULT 30,
        services TEXT, -- JSON array of service IDs
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staff_id INTEGER,
        staff_name TEXT,
        date DATETIME,
        check_in_time DATETIME,
        check_out_time DATETIME,
        status TEXT,
        notes TEXT,
        hours_worked REAL DEFAULT 0,
        deleted INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS stock_movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER,
        item_name TEXT,
        date DATETIME,
        quantity INTEGER,
        notes TEXT,
        type TEXT,
        user TEXT,
        unit_cost REAL DEFAULT 0,
        total_cost REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      `CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date)`,
    ];

    schema.forEach(sql => {
      database.run(sql, (err) => {
        if (err) console.error('[DB] Schema error:', err);
      });
    });

    // Schema migration for existing DBs (spa.db created by older versions)
    // Without this, inserts/updates using new columns may fail with "no such column".
    const ensureColumn = (table, column, ddl, cb) => {
      database.all(`PRAGMA table_info(${table})`, (err, rows) => {
        if (err) return cb();
        const exists = Array.isArray(rows) && rows.some((r) => r.name === column);
        if (exists) return cb();
        database.run(ddl, () => cb());
      });
    };

    const migrations = [
      // services
      { table: 'services', column: 'steps', ddl: 'ALTER TABLE services ADD COLUMN steps TEXT' },
      { table: 'services', column: 'commission_rate', ddl: 'ALTER TABLE services ADD COLUMN commission_rate REAL DEFAULT 0' },

      // transactions
      { table: 'transactions', column: 'notes', ddl: 'ALTER TABLE transactions ADD COLUMN notes TEXT' },
      { table: 'transactions', column: 'date', ddl: 'ALTER TABLE transactions ADD COLUMN date DATETIME' },
      { table: 'transactions', column: 'items', ddl: 'ALTER TABLE transactions ADD COLUMN items TEXT' },
      { table: 'transactions', column: 'subtotal', ddl: 'ALTER TABLE transactions ADD COLUMN subtotal REAL' },
      { table: 'transactions', column: 'discount', ddl: 'ALTER TABLE transactions ADD COLUMN discount REAL' },
      { table: 'transactions', column: 'discount_type', ddl: 'ALTER TABLE transactions ADD COLUMN discount_type TEXT' },
      { table: 'transactions', column: 'points_used', ddl: 'ALTER TABLE transactions ADD COLUMN points_used INTEGER' },
      { table: 'transactions', column: 'points_earned', ddl: 'ALTER TABLE transactions ADD COLUMN points_earned INTEGER' },
      { table: 'transactions', column: 'customer_name', ddl: 'ALTER TABLE transactions ADD COLUMN customer_name TEXT' },
      { table: 'transactions', column: 'staff_name', ddl: 'ALTER TABLE transactions ADD COLUMN staff_name TEXT' },
      { table: 'transactions', column: 'deleted', ddl: 'ALTER TABLE transactions ADD COLUMN deleted INTEGER DEFAULT 0' },
      { table: 'transactions', column: 'expense_category', ddl: 'ALTER TABLE transactions ADD COLUMN expense_category TEXT' },
      { table: 'transactions', column: 'expense_category_label', ddl: 'ALTER TABLE transactions ADD COLUMN expense_category_label TEXT' },
    ];

    // Run migrations sequentially to avoid locking the DB too long
    let mi = 0;
    const runNext = () => {
      if (mi >= migrations.length) return;
      const m = migrations[mi++];
      ensureColumn(m.table, m.column, m.ddl, runNext);
    };
    runNext();
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

const { ipcMain } = require('electron');
const { getDatabase, allQuery, getQuery, runQuery } = require('../database/db');
const path = require('path');
const os = require('os');
const fs = require('fs');

function setupIPC() {
  ipcMain.handle('db:customers:getAll', async () => {
    try {
      const data = await allQuery('SELECT * FROM customers ORDER BY name');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:customers:add', async (event, customer) => {
    try {
      const result = await runQuery(
        'INSERT INTO customers (name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?)',
        [customer.name, customer.phone || null, customer.email || null, customer.address || null, customer.notes || null]
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:services:getAll', async () => {
    try {
      const data = await allQuery('SELECT * FROM services WHERE active=1 ORDER BY name');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:services:add', async (event, service) => {
    try {
      const result = await runQuery(
        'INSERT INTO services (name, price, duration, description, category) VALUES (?, ?, ?, ?, ?)',
        [service.name, service.price, service.duration || 60, service.description || null, service.category || null]
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:staff:getAll', async () => {
    try {
      const data = await allQuery('SELECT * FROM staff WHERE active=1 ORDER BY name');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:staff:add', async (event, staff) => {
    try {
      const result = await runQuery(
        'INSERT INTO staff (name, phone, email, position, salary, commission_rate) VALUES (?, ?, ?, ?, ?, ?)',
        [staff.name, staff.phone || null, staff.email || null, staff.position || null, staff.salary || 0, staff.commission_rate || 0.1]
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:bookings:getAll', async () => {
    try {
      const data = await allQuery('SELECT * FROM bookings ORDER BY booking_date DESC');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:bookings:add', async (event, booking) => {
    try {
      const result = await runQuery(
        'INSERT INTO bookings (customer_id, staff_id, service_id, booking_date, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [booking.customer_id, booking.staff_id, booking.service_id, booking.booking_date, booking.status || 'pending', booking.notes || null]
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:transactions:getAll', async () => {
    try {
      const data = await allQuery('SELECT * FROM transactions ORDER BY created_at DESC');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:transactions:add', async (event, transaction) => {
    try {
      const result = await runQuery(
        'INSERT INTO transactions (booking_id, customer_id, staff_id, amount, payment_method, transaction_type, commission_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [transaction.booking_id || null, transaction.customer_id, transaction.staff_id || null, transaction.amount, transaction.payment_method || 'cash', transaction.transaction_type || 'service', transaction.commission_amount || 0, transaction.status || 'completed']
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:inventory:getAll', async () => {
    try {
      const data = await allQuery('SELECT * FROM inventory ORDER BY name');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:inventory:add', async (event, item) => {
    try {
      const result = await runQuery(
        'INSERT INTO inventory (name, category, quantity, unit_price, reorder_level, supplier) VALUES (?, ?, ?, ?, ?, ?)',
        [item.name, item.category || null, item.quantity || 0, item.unitPrice || item.unit_price || 0, item.reorderLevel || item.reorder_level || 10, item.supplier || null]
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:backup', () => {
    try {
      const appData = path.join(os.homedir(), 'AppData', 'Local', 'SpaApp');
      const backupDir = path.join(appData, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const dbPath = path.join(appData, 'spa.db');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, 'spa-' + timestamp + '.db');

      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, backupPath);
        const stats = fs.statSync(backupPath);
        return { success: true, path: backupPath, size: stats.size };
      } else {
        return { success: false, error: 'Database file not found' };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:dashboard:getStats', async () => {
    try {
      const todayRevenue = await getQuery("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE DATE(created_at) = DATE('now')");
      const monthRevenue = await getQuery("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')");
      const todayBookings = await getQuery("SELECT COUNT(*) as total FROM bookings WHERE DATE(booking_date) = DATE('now')");
      const totalCustomers = await getQuery("SELECT COUNT(*) as total FROM customers");

      return {
        success: true,
        data: {
          todayRevenue: todayRevenue?.total || 0,
          monthRevenue: monthRevenue?.total || 0,
          todayBookings: todayBookings?.total || 0,
          totalCustomers: totalCustomers?.total || 0,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:query', async (event, table, conditions) => {
    try {
      let query = `SELECT * FROM ${table}`;
      const params = [];

      if (conditions && conditions.length > 0) {
        const where = conditions.map(cond => {
          if (cond.operator === '==') {
            params.push(cond.value);
            return `${cond.field} = ?`;
          } else if (cond.operator === '>=') {
            params.push(cond.value);
            return `${cond.field} >= ?`;
          } else if (cond.operator === '<=') {
            params.push(cond.value);
            return `${cond.field} <= ?`;
          }
          return '';
        }).filter(w => w);

        if (where.length > 0) {
          query += ' WHERE ' + where.join(' AND ');
        }
      }

      const data = await (params.length > 0
        ? new Promise((resolve, reject) => {
            getDatabase().all(query, params, (err, rows) => {
              if (err) reject(err);
              else resolve(rows || []);
            });
          })
        : allQuery(query)
      );

      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupIPC };

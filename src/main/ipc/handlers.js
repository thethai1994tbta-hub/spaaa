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

  ipcMain.handle('db:customers:update', async (event, id, customer) => {
    try {
      await runQuery(
        'UPDATE customers SET name=?, phone=?, email=?, address=?, points=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [
          customer.name,
          customer.phone || null,
          customer.email || null,
          customer.address || null,
          customer.points ?? 0,
          customer.notes || null,
          id,
        ]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:customers:delete', async (event, id) => {
    try {
      await runQuery('DELETE FROM customers WHERE id=?', [id]);
      return { success: true };
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
        'INSERT INTO services (name, price, duration, description, category, steps, commission_rate, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          service.name,
          service.price,
          service.duration || 60,
          service.description || null,
          service.category || null,
          service.steps || null,
          Number(service.commissionRate ?? service.commission_rate) || 0,
          1,
        ]
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:services:update', async (event, id, service) => {
    try {
      await runQuery(
        'UPDATE services SET name=?, price=?, duration=?, description=?, category=?, steps=?, commission_rate=?, active=? WHERE id=?',
        [
          service.name,
          Number(service.price) || 0,
          Number(service.duration) || 60,
          service.description || null,
          service.category || null,
          service.steps || null,
          Number(service.commissionRate ?? service.commission_rate) || 0,
          service.active === false ? 0 : 1,
          id,
        ]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:services:delete', async (event, id) => {
    try {
      await runQuery('UPDATE services SET active=0 WHERE id=?', [id]);
      return { success: true };
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

  ipcMain.handle('db:staff:update', async (event, id, staff) => {
    try {
      await runQuery(
        'UPDATE staff SET name=?, phone=?, email=?, position=?, salary=?, commission_rate=?, active=? WHERE id=?',
        [
          staff.name,
          staff.phone || null,
          staff.email || null,
          staff.position || null,
          staff.salary || 0,
          Number(staff.commissionRate ?? staff.commission_rate) || 0,
          staff.active === false ? 0 : 1,
          id,
        ]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:staff:delete', async (event, id) => {
    try {
      await runQuery('UPDATE staff SET active=0 WHERE id=?', [id]);
      return { success: true };
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

  ipcMain.handle('db:bookings:update', async (event, id, booking) => {
    try {
      // allow either booking_date or bookingDate from renderer
      const bookingDate = booking.booking_date || booking.bookingDate || null;
      await runQuery(
        'UPDATE bookings SET customer_id=?, staff_id=?, service_id=?, booking_date=?, status=?, notes=? WHERE id=?',
        [
          booking.customer_id ?? booking.customerId ?? null,
          booking.staff_id ?? booking.staffId ?? null,
          booking.service_id ?? booking.serviceId ?? null,
          bookingDate,
          booking.status || 'pending',
          booking.notes || null,
          id,
        ]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:bookings:delete', async (event, id) => {
    try {
      await runQuery('DELETE FROM bookings WHERE id=?', [id]);
      return { success: true };
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

  
  ipcMain.handle('db:transactions:processOrder', async (event, data) => {
    return new Promise((resolve) => {
      const db = getDatabase();
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        let txError = null;
        const tx = data.transaction;
        
        db.run(
          'INSERT INTO transactions (booking_id, customer_id, staff_id, amount, payment_method, transaction_type, commission_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [tx.booking_id || null, tx.customer_id, tx.staff_id || null, tx.amount, tx.payment_method || 'cash', tx.transaction_type || 'product', tx.commission_amount || 0, tx.status || 'completed'],
          function(err) {
            if (err) { txError = err; return db.run('ROLLBACK', () => resolve({ success: false, error: err.message })); }
            
            const transactionId = this.lastID;
            let pendingUpdates = data.items.length;
            
            if (pendingUpdates === 0) {
              return db.run('COMMIT', () => resolve({ success: true, id: transactionId }));
            }
            
            for (const item of data.items) {
              if (item.type === 'product' && item.id) {
                db.run('UPDATE inventory SET quantity = quantity - ? WHERE id = ?', [item.quantity || 1, item.id], (err2) => {
                  if (err2) txError = err2;
                  pendingUpdates--;
                  if (pendingUpdates === 0) {
                    if (txError) {
                      db.run('ROLLBACK', () => resolve({ success: false, error: txError.message }));
                    } else {
                      db.run('COMMIT', () => resolve({ success: true, id: transactionId }));
                    }
                  }
                });
              } else {
                pendingUpdates--;
                if (pendingUpdates === 0) {
                  db.run('COMMIT', () => resolve({ success: true, id: transactionId }));
                }
              }
            }
          }
        );
      });
    });
  });


ipcMain.handle('db:transactions:add', async (event, transaction) => {
    try {
      const result = await runQuery(
        `INSERT INTO transactions (
          booking_id, customer_id, staff_id, amount, payment_method, transaction_type, commission_amount, status,
          notes, date, items, subtotal, discount, discount_type, points_used, points_earned,
          customer_name, staff_name, deleted, expense_category, expense_category_label
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          transaction.booking_id || null,
          transaction.customer_id ?? null,
          transaction.staff_id || null,
          transaction.amount,
          transaction.payment_method || 'cash',
          transaction.transaction_type || transaction.transactionType || 'service',
          transaction.commission_amount || 0,
          transaction.status || 'completed',
          transaction.notes || null,
          transaction.date || null,
          transaction.items ? JSON.stringify(transaction.items) : null,
          transaction.subtotal ?? null,
          transaction.discount ?? null,
          transaction.discount_type ?? null,
          transaction.points_used ?? null,
          transaction.points_earned ?? null,
          transaction.customer_name || transaction.customerName || null,
          transaction.staff_name || transaction.staffName || null,
          transaction.deleted ? 1 : 0,
          transaction.expense_category || transaction.expenseCategory || null,
          transaction.expense_category_label || transaction.expenseCategoryLabel || null,
        ]
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:transactions:update', async (event, id, data) => {
    try {
      // Minimal update support: only fields used by renderer (deleted flags, etc.)
      if (data.deleted !== undefined) {
        await runQuery('UPDATE transactions SET deleted=? WHERE id=?', [data.deleted ? 1 : 0, id]);
      }
      if (data.transactionType || data.transaction_type) {
        await runQuery('UPDATE transactions SET transaction_type=? WHERE id=?', [data.transactionType || data.transaction_type, id]);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:transactions:delete', async (event, id) => {
    try {
      await runQuery('DELETE FROM transactions WHERE id=?', [id]);
      return { success: true };
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

  ipcMain.handle('db:inventory:update', async (event, id, item) => {
    try {
      const result = await runQuery(
        'UPDATE inventory SET name=?, category=?, quantity=?, unit_price=?, reorder_level=?, supplier=? WHERE id=?',
        [item.name, item.category || null, item.quantity || 0, item.unitPrice || item.unit_price || 0, item.reorderLevel || item.reorder_level || 10, item.supplier || null, id]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:inventory:delete', async (event, id) => {
    try {
      await runQuery('DELETE FROM inventory WHERE id=?', [id]);
      return { success: true };
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

  ipcMain.handle('db:attendance:add', async (event, attendance) => {
    try {
      const result = await runQuery(
        'INSERT INTO attendance (staff_id, staff_name, date, check_in_time, check_out_time, status, notes, hours_worked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [attendance.staffId, attendance.staffName, new Date(attendance.date).toISOString(), new Date(attendance.checkInTime).toISOString(), attendance.checkOutTime ? new Date(attendance.checkOutTime).toISOString() : null, attendance.status || 'present', attendance.notes || null, attendance.hoursWorked || 0]
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:attendance:getAll', async () => {
    try {
      const data = await allQuery('SELECT * FROM attendance ORDER BY date DESC');
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:attendance:update', async (event, id, data) => {
    try {
      // Only update safe subset
      const fields = [];
      const params = [];
      if (data.checkOutTime !== undefined) { fields.push('check_out_time=?'); params.push(data.checkOutTime); }
      if (data.hoursWorked !== undefined) { fields.push('hours_worked=?'); params.push(data.hoursWorked); }
      if (data.status !== undefined) { fields.push('status=?'); params.push(data.status); }
      if (data.deleted !== undefined) { fields.push('deleted=?'); params.push(data.deleted ? 1 : 0); }
      if (fields.length === 0) return { success: true };
      params.push(id);
      await runQuery(`UPDATE attendance SET ${fields.join(', ')} WHERE id=?`, params);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:attendance:delete', async (event, id) => {
    try {
      await runQuery('DELETE FROM attendance WHERE id=?', [id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:stock-movements:add', async (event, movement) => {
    try {
      const result = await runQuery(
        'INSERT INTO stock_movements (item_id, item_name, date, quantity, notes, type, user) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [movement.itemId, movement.itemName, new Date(movement.date).toISOString(), movement.quantity, movement.notes || null, movement.type || 'import', movement.user || 'System']
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== PACKAGES (SQLite) ====================
  ipcMain.handle('db:packages:getAll', async () => {
    try {
      const rows = await allQuery('SELECT * FROM packages ORDER BY name');
      const data = rows.map(r => ({
        ...r,
        validityDays: r.validity_days,
        services: r.services ? (() => { try { return JSON.parse(r.services); } catch { return []; } })() : [],
      }));
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:packages:add', async (event, pkg) => {
    try {
      const result = await runQuery(
        'INSERT INTO packages (name, category, description, price, sessions, validity_days, services, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          pkg.name,
          pkg.category || null,
          pkg.description || null,
          Number(pkg.price) || 0,
          Number(pkg.sessions) || 1,
          Number(pkg.validityDays ?? pkg.validity_days) || 30,
          JSON.stringify(pkg.services || []),
          pkg.status || 'active',
        ]
      );
      return { success: true, id: result.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:packages:update', async (event, id, pkg) => {
    try {
      await runQuery(
        'UPDATE packages SET name=?, category=?, description=?, price=?, sessions=?, validity_days=?, services=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [
          pkg.name,
          pkg.category || null,
          pkg.description || null,
          Number(pkg.price) || 0,
          Number(pkg.sessions) || 1,
          Number(pkg.validityDays ?? pkg.validity_days) || 30,
          JSON.stringify(pkg.services || []),
          pkg.status || 'active',
          id,
        ]
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:packages:delete', async (event, id) => {
    try {
      await runQuery('UPDATE packages SET status=? WHERE id=?', ['inactive', id]);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== SETTINGS (SQLite) ====================
  ipcMain.handle('db:settings:get', async (event, key) => {
    try {
      const row = await getQuery('SELECT value FROM app_settings WHERE key=?', [key]);
      if (!row) return { success: false, error: 'Setting not found' };
      try {
        return { success: true, data: JSON.parse(row.value) };
      } catch {
        return { success: true, data: row.value };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:settings:set', async (event, key, value) => {
    try {
      const strValue = typeof value === 'string' ? value : JSON.stringify(value ?? {});
      await runQuery(
        `INSERT INTO app_settings (key, value, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`,
        [key, strValue]
      );
      return { success: true };
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

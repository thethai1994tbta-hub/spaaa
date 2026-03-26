const { ipcMain } = require('electron');
const {
  addDocument,
  getAllDocuments,
  updateDocument,
  deleteDocument,
  query,
  COLLECTIONS,
} = require('../database/firebaseDb');

function setupFirebaseIPC() {
  // ==================== CUSTOMERS ====================
  ipcMain.handle('db:customers:getAll', async () => {
    return getAllDocuments(COLLECTIONS.CUSTOMERS, { field: 'name', direction: 'asc' });
  });

  ipcMain.handle('db:customers:add', async (event, customer) => {
    return addDocument(COLLECTIONS.CUSTOMERS, {
      name: customer.name,
      phone: customer.phone || null,
      email: customer.email || null,
      address: customer.address || null,
      points: customer.points || 0,
      notes: customer.notes || null,
    });
  });

  ipcMain.handle('db:customers:update', async (event, id, customer) => {
    return updateDocument(COLLECTIONS.CUSTOMERS, id, customer);
  });

  ipcMain.handle('db:customers:delete', async (event, id) => {
    return deleteDocument(COLLECTIONS.CUSTOMERS, id);
  });

  // ==================== SERVICES ====================
  ipcMain.handle('db:services:getAll', async () => {
    return getAllDocuments(COLLECTIONS.SERVICES, { field: 'name', direction: 'asc' });
  });

  ipcMain.handle('db:services:add', async (event, service) => {
    return addDocument(COLLECTIONS.SERVICES, {
      name: service.name,
      category: service.category || null,
      price: service.price || 0,
      duration: service.duration || 60,
      description: service.description || null,
      steps: service.steps || null,
      commissionRate: service.commissionRate || 0,
      active: true,
    });
  });

  ipcMain.handle('db:services:update', async (event, id, service) => {
    return updateDocument(COLLECTIONS.SERVICES, id, {
      name: service.name,
      category: service.category || null,
      price: service.price || 0,
      duration: service.duration || 60,
      description: service.description || null,
      steps: service.steps || null,
      commissionRate: service.commissionRate || 0,
      active: service.active !== undefined ? service.active : true,
    });
  });

  ipcMain.handle('db:services:delete', async (event, id) => {
    // Soft delete - mark as inactive
    return updateDocument(COLLECTIONS.SERVICES, id, { active: false });
  });

  // ==================== STAFF ====================
  ipcMain.handle('db:staff:getAll', async () => {
    return getAllDocuments(COLLECTIONS.STAFF, { field: 'name', direction: 'asc' });
  });

  ipcMain.handle('db:staff:add', async (event, staff) => {
    return addDocument(COLLECTIONS.STAFF, {
      name: staff.name,
      phone: staff.phone || null,
      email: staff.email || null,
      position: staff.position || null,
      salary: staff.salary || 0,
      commissionRate: Number(staff.commission_rate ?? staff.commissionRate) || 0,
      active: true,
    });
  });

  ipcMain.handle('db:staff:update', async (event, id, staff) => {
    return updateDocument(COLLECTIONS.STAFF, id, {
      name: staff.name,
      phone: staff.phone || null,
      email: staff.email || null,
      position: staff.position || null,
      salary: staff.salary || 0,
      commissionRate: Number(staff.commission_rate ?? staff.commissionRate) || 0,
    });
  });

  ipcMain.handle('db:staff:delete', async (event, id) => {
    // Soft delete
    return updateDocument(COLLECTIONS.STAFF, id, { active: false });
  });

  // ==================== BOOKINGS ====================
  ipcMain.handle('db:bookings:getAll', async () => {
    return getAllDocuments(COLLECTIONS.BOOKINGS, { field: 'bookingDate', direction: 'desc' });
  });

  ipcMain.handle('db:bookings:add', async (event, booking) => {
    return addDocument(COLLECTIONS.BOOKINGS, {
      customerId: booking.customer_id,
      staffId: booking.staff_id,
      serviceId: booking.service_id,
      bookingDate: new Date(booking.booking_date),
      status: booking.status || 'pending',
      notes: booking.notes || null,
    });
  });

  ipcMain.handle('db:bookings:update', async (event, id, booking) => {
    const updateData = { ...booking };
    if (updateData.booking_date) {
      updateData.bookingDate = new Date(updateData.booking_date);
      delete updateData.booking_date;
    }
    return updateDocument(COLLECTIONS.BOOKINGS, id, updateData);
  });

  ipcMain.handle('db:bookings:delete', async (event, id) => {
    return deleteDocument(COLLECTIONS.BOOKINGS, id);
  });

  // ==================== TRANSACTIONS ====================
  ipcMain.handle('db:transactions:getAll', async () => {
    return getAllDocuments(COLLECTIONS.TRANSACTIONS, { field: 'createdAt', direction: 'desc' });
  });

  ipcMain.handle('db:transactions:add', async (event, transaction) => {
    return addDocument(COLLECTIONS.TRANSACTIONS, {
      bookingId: transaction.booking_id || null,
      customerId: transaction.customer_id || null,
      customerName: transaction.customer_name || '',
      staffId: transaction.staff_id || null,
      staffName: transaction.staff_name || '',
      items: transaction.items || [],
      subtotal: transaction.subtotal || 0,
      discount: transaction.discount || 0,
      discountType: transaction.discount_type || 'fixed',
      amount: transaction.amount,
      paymentMethod: transaction.payment_method || 'cash',
      paymentDetails: transaction.payment_details || null,
      transactionType: transaction.transaction_type || 'service',
      commissionAmount: transaction.commission_amount || 0,
      pointsUsed: transaction.points_used || 0,
      pointsEarned: transaction.points_earned || 0,
      notes: transaction.notes || '',
      status: transaction.status || 'completed',
      date: new Date(transaction.date || Date.now()),
      expenseCategory: transaction.expense_category || transaction.expenseCategory || null,
      expenseCategoryLabel: transaction.expense_category_label || transaction.expenseCategoryLabel || null,
    });
  });

  ipcMain.handle('db:transactions:update', async (event, id, transaction) => {
    return updateDocument(COLLECTIONS.TRANSACTIONS, id, transaction);
  });

  ipcMain.handle('db:transactions:delete', async (event, id) => {
    return deleteDocument(COLLECTIONS.TRANSACTIONS, id);
  });

  // ==================== INVENTORY ====================
  ipcMain.handle('db:inventory:getAll', async () => {
    return getAllDocuments(COLLECTIONS.INVENTORY, { field: 'name', direction: 'asc' });
  });

  ipcMain.handle('db:inventory:add', async (event, item) => {
    return addDocument(COLLECTIONS.INVENTORY, {
      name: item.name,
      category: item.category || null,
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || item.unit_price || 0,
      reorderLevel: item.reorderLevel || item.reorder_level || 10,
      supplier: item.supplier || null,
    });
  });

  ipcMain.handle('db:inventory:update', async (event, id, item) => {
    const updateData = {
      name: item.name,
      category: item.category || null,
      quantity: item.quantity || 0,
      unitPrice: item.unitPrice || item.unit_price || 0,
      reorderLevel: item.reorderLevel || item.reorder_level || 10,
      supplier: item.supplier || null,
    };
    return updateDocument(COLLECTIONS.INVENTORY, id, updateData);
  });

  ipcMain.handle('db:inventory:delete', async (event, id) => {
    return deleteDocument(COLLECTIONS.INVENTORY, id);
  });

  // ==================== DASHBOARD ====================
  ipcMain.handle('db:dashboard:getStats', async () => {
    try {
      // Get today's transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayEnd = new Date(today);
      todayEnd.setHours(23, 59, 59, 999);

      const todayTxResult = await query(COLLECTIONS.TRANSACTIONS, [
        { field: 'createdAt', operator: '>=', value: today },
        { field: 'createdAt', operator: '<=', value: todayEnd },
      ]);

      const isIncomeTx = (tx) => {
        const t = tx.transactionType || tx.transaction_type;
        return !tx.deleted && t !== 'commission' && t !== 'expense' && t !== 'expense_deleted' && t !== 'deleted' && (tx.amount || 0) > 0;
      };

      const todayRevenue = todayTxResult.success
        ? todayTxResult.data.filter(isIncomeTx).reduce((sum, tx) => sum + (tx.amount || 0), 0)
        : 0;

      // Get this month's transactions
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthTxResult = await query(COLLECTIONS.TRANSACTIONS, [
        { field: 'createdAt', operator: '>=', value: monthStart },
        { field: 'createdAt', operator: '<=', value: monthEnd },
      ]);

      const monthRevenue = monthTxResult.success
        ? monthTxResult.data.filter(isIncomeTx).reduce((sum, tx) => sum + (tx.amount || 0), 0)
        : 0;

      // Get today's bookings
      const bookingsResult = await query(COLLECTIONS.BOOKINGS, [
        { field: 'bookingDate', operator: '>=', value: today },
        { field: 'bookingDate', operator: '<=', value: todayEnd },
      ]);

      const todayBookings = bookingsResult.success ? bookingsResult.data.length : 0;

      // Get total customers
      const customersResult = await getAllDocuments(COLLECTIONS.CUSTOMERS);
      const totalCustomers = customersResult.success ? customersResult.data.length : 0;

      return {
        success: true,
        data: {
          todayRevenue,
          monthRevenue,
          todayBookings,
          totalCustomers,
        },
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // ==================== ATTENDANCE ====================
  ipcMain.handle('db:attendance:getAll', async () => {
    return getAllDocuments(COLLECTIONS.ATTENDANCE);
  });

  ipcMain.handle('db:attendance:delete', async (event, id) => {
    return deleteDocument(COLLECTIONS.ATTENDANCE, id);
  });

  ipcMain.handle('db:attendance:add', async (event, attendance) => {
    return addDocument(COLLECTIONS.ATTENDANCE, {
      staffId: attendance.staffId,
      staffName: attendance.staffName,
      date: new Date(attendance.date),
      checkInTime: new Date(attendance.checkInTime),
      checkOutTime: attendance.checkOutTime ? new Date(attendance.checkOutTime) : null,
      status: attendance.status || 'present',
      notes: attendance.notes || null,
      hoursWorked: attendance.hoursWorked || 0,
    });
  });

  ipcMain.handle('db:attendance:update', async (event, id, data) => {
    return updateDocument(COLLECTIONS.ATTENDANCE, id, {
      ...(data.checkOutTime && { checkOutTime: new Date(data.checkOutTime) }),
      ...(data.hoursWorked !== undefined && { hoursWorked: data.hoursWorked }),
      ...(data.status && { status: data.status }),
      ...(data.deleted !== undefined && { deleted: data.deleted }),
    });
  });

  // ==================== STOCK MOVEMENTS ====================
  ipcMain.handle('db:stock-movements:add', async (event, movement) => {
    return addDocument(COLLECTIONS.STOCK_MOVEMENTS, {
      itemId: movement.itemId,
      itemName: movement.itemName,
      date: new Date(movement.date),
      quantity: movement.quantity,
      unitCost: movement.unitCost || 0,
      totalCost: movement.totalCost || 0,
      notes: movement.notes || null,
      type: movement.type || 'import',
      user: movement.user || 'System',
    });
  });

  // ==================== PACKAGES ====================
  ipcMain.handle('db:packages:getAll', async () => {
    return getAllDocuments(COLLECTIONS.PACKAGES, { field: 'name', direction: 'asc' });
  });

  ipcMain.handle('db:packages:add', async (event, pkg) => {
    return addDocument(COLLECTIONS.PACKAGES, {
      name: pkg.name,
      category: pkg.category || null,
      description: pkg.description || null,
      price: pkg.price || 0,
      sessions: pkg.sessions || 1,
      validityDays: pkg.validityDays || 30,
      services: pkg.services || [],
      status: 'active',
    });
  });

  ipcMain.handle('db:packages:update', async (event, id, pkg) => {
    return updateDocument(COLLECTIONS.PACKAGES, id, {
      name: pkg.name,
      category: pkg.category || null,
      description: pkg.description || null,
      price: pkg.price || 0,
      sessions: pkg.sessions || 1,
      validityDays: pkg.validityDays || 30,
      services: pkg.services || [],
    });
  });

  ipcMain.handle('db:packages:delete', async (event, id) => {
    return updateDocument(COLLECTIONS.PACKAGES, id, { status: 'inactive' });
  });

  // ==================== GENERIC QUERY ====================
  ipcMain.handle('db:query', async (event, collection, conditions) => {
    return query(collection, conditions);
  });

  // ==================== APP SETTINGS ====================
  ipcMain.handle('db:settings:get', async (event, key) => {
    try {
      const doc = await require('../database/firebaseDb').getDatabase()
        .collection(COLLECTIONS.APP_SETTINGS)
        .doc(key)
        .get();

      if (doc.exists) {
        return { success: true, data: doc.data() };
      }
      return { success: false, error: 'Setting not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:settings:set', async (event, key, value) => {
    try {
      await require('../database/firebaseDb').getDatabase()
        .collection(COLLECTIONS.APP_SETTINGS)
        .doc(key)
        .set(value, { merge: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('[IPC] Firebase handlers registered');
}

module.exports = { setupFirebaseIPC };

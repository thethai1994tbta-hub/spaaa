const { allQuery } = require('../database/db');
const { getDatabase, COLLECTIONS } = require('../database/firebaseDb');
const admin = require('firebase-admin');

async function migrateData() {
  console.log('[Migration] Starting SQLite → Firebase migration...');

  try {
    const db = getDatabase();
    const stats = {
      customers: 0,
      services: 0,
      staff: 0,
      bookings: 0,
      transactions: 0,
      inventory: 0,
    };

    // Migrate Customers
    const customers = await allQuery('SELECT * FROM customers');
    for (const customer of customers) {
      await db.collection(COLLECTIONS.CUSTOMERS).add({
        name: customer.name,
        phone: customer.phone || null,
        email: customer.email || null,
        address: customer.address || null,
        points: customer.points || 0,
        notes: customer.notes || null,
        createdAt: new Date(customer.created_at),
        updatedAt: new Date(customer.updated_at),
      });
      stats.customers++;
    }
    console.log(`[Migration] ✓ Migrated ${stats.customers} customers`);

    // Migrate Services
    const services = await allQuery('SELECT * FROM services');
    for (const service of services) {
      await db.collection(COLLECTIONS.SERVICES).add({
        name: service.name,
        price: service.price,
        duration: service.duration || 60,
        description: service.description || null,
        category: service.category || null,
        active: service.active === 1,
        createdAt: new Date(service.created_at),
      });
      stats.services++;
    }
    console.log(`[Migration] ✓ Migrated ${stats.services} services`);

    // Migrate Staff
    const staff = await allQuery('SELECT * FROM staff');
    for (const s of staff) {
      await db.collection(COLLECTIONS.STAFF).add({
        name: s.name,
        phone: s.phone || null,
        email: s.email || null,
        position: s.position || null,
        salary: s.salary || 0,
        commissionRate: s.commission_rate || 0.1,
        active: s.active === 1,
        createdAt: new Date(s.created_at),
      });
      stats.staff++;
    }
    console.log(`[Migration] ✓ Migrated ${stats.staff} staff members`);

    // Migrate Bookings
    const bookings = await allQuery('SELECT * FROM bookings');
    for (const booking of bookings) {
      await db.collection(COLLECTIONS.BOOKINGS).add({
        customerId: booking.customer_id,
        staffId: booking.staff_id,
        serviceId: booking.service_id,
        bookingDate: new Date(booking.booking_date),
        status: booking.status || 'pending',
        notes: booking.notes || null,
        createdAt: new Date(booking.created_at),
      });
      stats.bookings++;
    }
    console.log(`[Migration] ✓ Migrated ${stats.bookings} bookings`);

    // Migrate Transactions
    const transactions = await allQuery('SELECT * FROM transactions');
    for (const tx of transactions) {
      await db.collection(COLLECTIONS.TRANSACTIONS).add({
        bookingId: tx.booking_id || null,
        customerId: tx.customer_id,
        staffId: tx.staff_id || null,
        amount: tx.amount,
        paymentMethod: tx.payment_method || 'cash',
        transactionType: tx.transaction_type || 'service',
        commissionAmount: tx.commission_amount || 0,
        status: tx.status || 'completed',
        createdAt: new Date(tx.created_at),
      });
      stats.transactions++;
    }
    console.log(`[Migration] ✓ Migrated ${stats.transactions} transactions`);

    // Migrate Inventory
    const inventory = await allQuery('SELECT * FROM inventory');
    for (const item of inventory) {
      await db.collection(COLLECTIONS.INVENTORY).add({
        name: item.name,
        category: item.category || null,
        quantity: item.quantity || 0,
        unitPrice: item.unit_price || 0,
        reorderLevel: item.reorder_level || 10,
        supplier: item.supplier || null,
        createdAt: new Date(item.last_updated),
      });
      stats.inventory++;
    }
    console.log(`[Migration] ✓ Migrated ${stats.inventory} inventory items`);

    console.log('[Migration] ✅ Migration completed successfully!');
    console.log('[Migration] Summary:', stats);

    return { success: true, stats };
  } catch (error) {
    console.error('[Migration] ❌ Error during migration:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { migrateData };

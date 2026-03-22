const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let db = null;
let initialized = false;

// Load Firebase config from JSON file
function loadFirebaseConfig() {
  try {
    const configPath = path.join(__dirname, '../../config/firebase-config.json');
    if (!fs.existsSync(configPath)) {
      console.error('[Firebase] Config file not found at:', configPath);
      console.error('[Firebase] Please copy firebase-template.json to firebase-config.json and fill in your credentials');
      throw new Error('Firebase config file not found');
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (error) {
    console.error('[Firebase] Error loading config:', error.message);
    throw error;
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

async function initDatabase() {
  if (initialized) return;

  try {
    const firebaseConfig = loadFirebaseConfig();

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        projectId: firebaseConfig.project_id,
      });
    }

    db = admin.firestore();
    initialized = true;

    console.log('[Firebase] Database initialized successfully');
    return db;
  } catch (error) {
    console.error('[Firebase] Initialization error:', error);
    throw error;
  }
}

// Collection names
const COLLECTIONS = {
  CUSTOMERS: 'customers',
  SERVICES: 'services',
  STAFF: 'staff',
  BOOKINGS: 'bookings',
  TRANSACTIONS: 'transactions',
  INVENTORY: 'inventory',
  STOCK_MOVEMENTS: 'stockMovements',
  ATTENDANCE: 'attendance',
  APP_SETTINGS: 'appSettings',
};

// Helper functions for Firestore operations
async function addDocument(collectionName, data) {
  try {
    const docRef = await getDatabase().collection(collectionName).add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getDocument(collectionName, docId) {
  try {
    const doc = await getDatabase().collection(collectionName).doc(docId).get();
    if (doc.exists) {
      return { success: true, data: { id: doc.id, ...doc.data() } };
    }
    return { success: false, error: 'Document not found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getAllDocuments(collectionName, orderBy = null) {
  try {
    let query = getDatabase().collection(collectionName);

    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction || 'asc');
    }

    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function updateDocument(collectionName, docId, data) {
  try {
    await getDatabase().collection(collectionName).doc(docId).update({
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function deleteDocument(collectionName, docId) {
  try {
    await getDatabase().collection(collectionName).doc(docId).delete();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function query(collectionName, conditions = []) {
  try {
    let queryRef = getDatabase().collection(collectionName);

    conditions.forEach(condition => {
      queryRef = queryRef.where(condition.field, condition.operator, condition.value);
    });

    const snapshot = await queryRef.get();
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function closeDatabase() {
  if (db) {
    try {
      await db.terminate();
      db = null;
      initialized = false;
      console.log('[Firebase] Database connection closed');
    } catch (error) {
      console.error('[Firebase] Error closing database:', error);
    }
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  addDocument,
  getDocument,
  getAllDocuments,
  updateDocument,
  deleteDocument,
  query,
  COLLECTIONS,
};

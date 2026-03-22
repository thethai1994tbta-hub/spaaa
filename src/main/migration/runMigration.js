const fs = require('fs');
const path = require('path');

// Load Firebase config
const configPath = path.join(__dirname, '../../config/firebase-config.json');
if (!fs.existsSync(configPath)) {
  console.error('❌ Firebase config not found!');
  console.error('Please create firebase-config.json first. See FIREBASE_SETUP.md');
  process.exit(1);
}

console.log('🔄 Starting migration from SQLite to Firebase...\n');

const { initDatabase: initFirebase } = require('../database/firebaseDb');
const { migrateData } = require('./sqliteToFirebase');

(async () => {
  try {
    // Initialize Firebase
    console.log('📡 Connecting to Firebase...');
    await initFirebase();
    console.log('✅ Firebase connected\n');

    // Run migration
    console.log('📤 Migrating data...\n');
    const result = await migrateData();

    if (result.success) {
      console.log('\n✨ Migration completed successfully!');
      console.log('📊 Summary:', result.stats);
      console.log('\n✅ Your data is now in Firebase Firestore');
      process.exit(0);
    } else {
      console.error('\n❌ Migration failed:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

/**
 * Clone ONLY "system config" collections from one Firebase project to another.
 *
 * Use case:
 * - Two stores are different (separate data)
 * - But want the SAME system logic/config: services, staff, inventory, packages, appSettings
 * - DO NOT clone operational data: customers, bookings, transactions, attendance, stockMovements
 *
 * Usage:
 *   node scripts/clone-system-config.js --from=clients/store1/firebase-config.json --to=clients/store2/firebase-config.json
 *   node scripts/clone-system-config.js --from=... --to=... --wipe
 *
 * Notes:
 * - Both --from and --to are Firebase Admin service account JSON files.
 * - This copies documents with the same IDs.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const args = process.argv.slice(2);
const getArg = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const fromPath = getArg('from');
const toPath = getArg('to');
const wipe = hasFlag('wipe');

if (!fromPath || !toPath) {
  console.error('❌ Missing args.');
  console.error('   Example: node scripts/clone-system-config.js --from=clients/store1/firebase-config.json --to=clients/store2/firebase-config.json');
  console.error('   Optional: --wipe (delete target collections before cloning)');
  process.exit(1);
}

const resolveJson = (p) => {
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  if (!fs.existsSync(abs)) {
    throw new Error(`File not found: ${abs}`);
  }
  const raw = fs.readFileSync(abs, 'utf8');
  const json = JSON.parse(raw);
  // Basic sanity: avoid template placeholders by accident
  if (String(json.project_id || '').includes('YOUR_')) {
    console.warn(`⚠️  Looks like a template firebase-config.json: ${abs}`);
    console.warn('   Please replace with real Firebase service account credentials.');
  }
  return { abs, json };
};

const { abs: fromAbs, json: fromCred } = resolveJson(fromPath);
const { abs: toAbs, json: toCred } = resolveJson(toPath);

// Collections to clone = "system logic/config"
const COLLECTIONS_TO_CLONE = [
  'services',
  'staff',
  'inventory',
  'packages',
  'appSettings',
];

// Safety: never clone these by default
const FORBIDDEN_COLLECTIONS = new Set([
  'customers',
  'bookings',
  'transactions',
  'attendance',
  'stockMovements',
]);

function initApp(appName, cred) {
  return admin.initializeApp(
    {
      credential: admin.credential.cert(cred),
      projectId: cred.project_id,
    },
    appName
  );
}

async function deleteCollection(db, name) {
  // Firestore has no "delete collection" API; we delete documents in batches.
  const colRef = db.collection(name);
  const pageSize = 300;
  let deleted = 0;

  while (true) {
    const snap = await colRef.limit(pageSize).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.size;

    // Avoid tight loop hammering
    await new Promise((r) => setTimeout(r, 50));
  }
  return deleted;
}

async function cloneCollection(fromDb, toDb, name) {
  const snap = await fromDb.collection(name).get();
  if (snap.empty) return { copied: 0 };

  const docs = snap.docs;
  let copied = 0;

  // 500 max ops per batch; use 400 for safety
  const batchSize = 400;
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = toDb.batch();
    const slice = docs.slice(i, i + batchSize);
    slice.forEach((doc) => {
      batch.set(toDb.collection(name).doc(doc.id), doc.data(), { merge: false });
    });
    await batch.commit();
    copied += slice.length;
  }

  return { copied };
}

(async () => {
  try {
    console.log('🔧 Clone system config collections');
    console.log(`   FROM: ${fromAbs}`);
    console.log(`     → project_id: ${fromCred.project_id}`);
    console.log(`   TO  : ${toAbs}`);
    console.log(`     → project_id: ${toCred.project_id}`);
    console.log(`   Collections: ${COLLECTIONS_TO_CLONE.join(', ')}`);
    console.log(`   Wipe target: ${wipe ? 'YES' : 'NO'}`);

    const fromApp = initApp('fromApp', fromCred);
    const toApp = initApp('toApp', toCred);
    const fromDb = fromApp.firestore();
    const toDb = toApp.firestore();

    for (const col of COLLECTIONS_TO_CLONE) {
      if (FORBIDDEN_COLLECTIONS.has(col)) {
        throw new Error(`Refusing to clone forbidden collection: ${col}`);
      }

      console.log(`\n📦 ${col}`);
      if (wipe) {
        const deleted = await deleteCollection(toDb, col);
        console.log(`   🧹 wiped ${deleted} docs`);
      }

      const { copied } = await cloneCollection(fromDb, toDb, col);
      console.log(`   ✅ copied ${copied} docs`);
    }

    console.log('\n✨ Done.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    process.exit(1);
  }
})();


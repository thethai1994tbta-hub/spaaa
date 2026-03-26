/**
 * One-command setup for "store2":
 * - Ensure clients/<toSlug>/ exists (copy from clients/template if missing)
 * - Validate both firebase-config.json are REAL credentials (not placeholders)
 * - Clone ONLY system-logic collections from store1 -> store2:
 *   services, staff, inventory, packages, appSettings
 * - Build the app for store2
 *
 * Usage:
 *   npm run oneclick:client-config -- --fromSlug=ten-spa --toSlug=shop-2 --wipe
 *
 * Notes:
 * - This does NOT clone operational data (customers/bookings/transactions/attendance).
 * - `--wipe` clears target system collections before copying.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(ROOT, 'clients');
const TEMPLATE_DIR = path.join(CLIENTS_DIR, 'template');

const args = process.argv.slice(2);
const getArg = (name) => {
  const found = args.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=').slice(1).join('=') : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const fromSlug = getArg('fromSlug') || getArg('from');
const toSlug = getArg('toSlug') || getArg('to');
const wipe = hasFlag('wipe');

if (!fromSlug || !toSlug) {
  console.error('❌ Missing args.');
  console.error('   Example:');
  console.error('   npm run oneclick:client-config -- --fromSlug=ten-spa --toSlug=shop-2 --wipe');
  process.exit(1);
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function isLikelyTemplateFirebase(json) {
  const pid = String(json.project_id || '');
  const pk = String(json.private_key || '');
  return (
    pid.includes('YOUR_PROJECT_ID') ||
    pid.includes('YOUR_') ||
    pk.includes('YOUR_PRIVATE_KEY') ||
    !pk.includes('BEGIN PRIVATE KEY')
  );
}

function copyDirRecursive(src, dst) {
  ensureDir(dst);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const ent of entries) {
    const s = path.join(src, ent.name);
    const d = path.join(dst, ent.name);
    if (ent.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function validateFirebaseConfig(p) {
  if (!fs.existsSync(p)) {
    throw new Error(`firebase-config.json not found: ${p}`);
  }
  const json = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (isLikelyTemplateFirebase(json)) {
    throw new Error(`firebase-config.json looks like a template/placeholder: ${p}`);
  }
  return json;
}

// Ensure client folders exist
const fromClientDir = path.join(CLIENTS_DIR, fromSlug);
const toClientDir = path.join(CLIENTS_DIR, toSlug);

if (!fs.existsSync(fromClientDir)) {
  throw new Error(`Missing from client folder: ${fromClientDir}`);
}

if (!fs.existsSync(toClientDir)) {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    throw new Error(`Missing template folder: ${TEMPLATE_DIR}`);
  }
  console.log(`📁 to client folder missing. Copy template -> ${toClientDir}`);
  copyDirRecursive(TEMPLATE_DIR, toClientDir);
}

const fromFirebase = path.join(fromClientDir, 'firebase-config.json');
const toFirebase = path.join(toClientDir, 'firebase-config.json');

console.log('🔎 Validate Firebase credentials...');
validateFirebaseConfig(fromFirebase);
validateFirebaseConfig(toFirebase);

// Clone system logic
console.log('\n📦 Clone system config (no operational data)...');
const wipeArg = wipe ? '--wipe' : '';
execSync(
  `node ${path.join(ROOT, 'scripts', 'clone-system-config.js')} --from=${fromFirebase} --to=${toFirebase} ${wipeArg}`,
  { stdio: 'inherit' }
);

// Build store2 app
console.log(`\n🚀 Build client: ${toSlug}`);
execSync(`node ${path.join(ROOT, 'build-client.js')} --client=${toSlug}`, { stdio: 'inherit' });

console.log('\n✅ Done.');
console.log(`Output: ${path.join(ROOT, 'releases', toSlug)}`);


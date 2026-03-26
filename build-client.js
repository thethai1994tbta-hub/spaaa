/**
 * build-client.js
 * ================
 * Script build phần mềm riêng cho từng cửa hàng spa.
 *
 * Cách dùng:
 *   node build-client.js --client=ten-spa
 *   node build-client.js --client=ten-spa --dry-run   (chỉ xem log, không build)
 *
 * Yêu cầu:
 *   clients/<ten-spa>/client-config.json
 *   clients/<ten-spa>/firebase-config.json
 *   clients/<ten-spa>/icon.ico  (tùy chọn)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── Parse args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const found = args.find(a => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : null;
};

const clientSlug = getArg('client');
const isDryRun = args.includes('--dry-run');

if (!clientSlug) {
  console.error('❌  Thiếu tham số --client');
  console.error('   Ví dụ: node build-client.js --client=ten-spa');
  process.exit(1);
}

// ─── Paths ───────────────────────────────────────────────────────────────────
const ROOT = __dirname;
const CLIENT_DIR = path.join(ROOT, 'clients', clientSlug);
const CONFIG_FILE = path.join(CLIENT_DIR, 'client-config.json');
const FIREBASE_SRC = path.join(CLIENT_DIR, 'firebase-config.json');
const FIREBASE_DEST = path.join(ROOT, 'src', 'config', 'firebase-config.json');
const BRANDING_FILE = path.join(ROOT, 'src', 'renderer', 'branding.js');
const ELECTRON_BUILDER_FILE = path.join(ROOT, 'electron-builder.json');
const ICON_SRC = path.join(CLIENT_DIR, 'icon.ico');
const ICON_DEST = path.join(ROOT, 'public', 'images', 'icon.ico');
const OUTPUT_DIR = path.join(ROOT, 'releases', clientSlug);

// ─── Backup/restore originals ────────────────────────────────────────────────
const FIREBASE_BACKUP = path.join(ROOT, 'src', 'config', '_firebase-backup.json');
const ELECTRON_BUILDER_BACKUP = path.join(ROOT, '_electron-builder-backup.json');
const ICON_BACKUP = path.join(ROOT, 'public', 'images', '_icon-backup.ico');

function log(msg) { console.log(`  ${msg}`); }
function step(msg) { console.log(`\n📦 ${msg}`); }
function success(msg) { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }

// ─── Validate ─────────────────────────────────────────────────────────────────
step(`Đang chuẩn bị build cho khách hàng: ${clientSlug.toUpperCase()}`);

if (!fs.existsSync(CLIENT_DIR)) {
  console.error(`❌  Không tìm thấy thư mục: clients/${clientSlug}`);
  console.error(`   Hãy tạo thư mục và điền đủ file config.`);
  process.exit(1);
}

if (!fs.existsSync(CONFIG_FILE)) {
  console.error(`❌  Không tìm thấy: clients/${clientSlug}/client-config.json`);
  process.exit(1);
}

// ─── Load config ──────────────────────────────────────────────────────────────
const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
const {
  displayName = clientSlug,
  tagline = 'Quản Lý Chuyên Nghiệp',
  primaryColor = '#ff69b4',
  appId = `com.spa.${clientSlug}.management`,
  version = '1.0.0',
  iconFile = 'icon.ico',
} = config;

log(`Tên hiển thị : ${displayName}`);
log(`Màu chủ đạo  : ${primaryColor}`);
log(`App ID       : ${appId}`);
log(`Phiên bản    : ${version}`);
log(`Output       : releases/${clientSlug}/`);

if (isDryRun) {
  console.log('\n🔵 [DRY RUN] - Không thực sự build, chỉ hiển thị các bước sẽ thực hiện.\n');
}

// ─── Step 1: Backup originals ────────────────────────────────────────────────
step('Bước 1/5: Backup file gốc...');

if (!isDryRun) {
  if (fs.existsSync(FIREBASE_DEST)) {
    fs.copyFileSync(FIREBASE_DEST, FIREBASE_BACKUP);
    success('Backup firebase-config.json');
  }
  if (fs.existsSync(ELECTRON_BUILDER_FILE)) {
    fs.copyFileSync(ELECTRON_BUILDER_FILE, ELECTRON_BUILDER_BACKUP);
    success('Backup electron-builder.json');
  }
  if (fs.existsSync(ICON_DEST)) {
    fs.copyFileSync(ICON_DEST, ICON_BACKUP);
    success('Backup icon.ico');
  }
} else {
  log('[DRY RUN] Sẽ backup: firebase-config.json, electron-builder.json, icon.ico');
}

// ─── Step 2: Copy Firebase config ────────────────────────────────────────────
step('Bước 2/5: Copy Firebase config của khách hàng...');

if (!fs.existsSync(FIREBASE_SRC)) {
  warn(`Không có firebase-config.json → Sẽ dùng SQLite làm database`);
} else {
  if (!isDryRun) {
    fs.copyFileSync(FIREBASE_SRC, FIREBASE_DEST);
    success('firebase-config.json đã copy');
  } else {
    log(`[DRY RUN] Copy: clients/${clientSlug}/firebase-config.json → src/config/firebase-config.json`);
  }
}

// ─── Step 3: Copy icon ────────────────────────────────────────────────────────
step('Bước 3/5: Copy icon...');

const clientIconPath = path.join(CLIENT_DIR, iconFile);
if (!fs.existsSync(clientIconPath)) {
  warn(`Không có icon.ico → Dùng icon mặc định`);
} else {
  if (!isDryRun) {
    if (!fs.existsSync(path.dirname(ICON_DEST))) {
      fs.mkdirSync(path.dirname(ICON_DEST), { recursive: true });
    }
    fs.copyFileSync(clientIconPath, ICON_DEST);
    success('icon.ico đã copy');
  } else {
    log(`[DRY RUN] Copy: clients/${clientSlug}/${iconFile} → public/images/icon.ico`);
  }
}

// ─── Step 4: Generate branding.js ────────────────────────────────────────────
step('Bước 4/5: Tạo file branding...');

const brandingContent = `// ⚠️  AUTO-GENERATED by build-client.js — KHÔNG SỬA TAY
// Client: ${clientSlug} | Build: ${new Date().toISOString()}

export const BRANDING = {
  slug: '${clientSlug}',
  displayName: '${displayName}',
  tagline: '${tagline}',
  primaryColor: '${primaryColor}',
  appId: '${appId}',
};

export default BRANDING;
`;

if (!isDryRun) {
  fs.writeFileSync(BRANDING_FILE, brandingContent, 'utf8');
  success('src/renderer/branding.js đã tạo');
} else {
  log(`[DRY RUN] Tạo file: src/renderer/branding.js`);
  log(`   displayName: "${displayName}", primaryColor: "${primaryColor}"`);
}

// ─── Step 5: Update electron-builder.json ────────────────────────────────────
step('Bước 5/5: Cập nhật electron-builder.json...');

const builderConfig = {
  appId: appId,
  productName: displayName,
  files: [
    'dist/**/*',
    'public/**/*',
    'src/main/**/*',
    'src/config/**/*',
    'package.json',
    '!generate-key.js',
    '!node_modules/sqlite3/deps/**/*',
    '!node_modules/sqlite3/src/**/*',
  ],
  npmRebuild: false,
  asarUnpack: ['public/preload.js'],
  directories: {
    buildResources: 'public/images',
    output: `releases/${clientSlug}`,
  },
  win: {
    target: [
      { target: 'nsis', arch: ['x64'] },
      { target: 'portable', arch: ['x64'] },
    ],
    icon: 'public/images/icon.ico',
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: displayName,
  },
};

if (!isDryRun) {
  fs.writeFileSync(ELECTRON_BUILDER_FILE, JSON.stringify(builderConfig, null, 2), 'utf8');
  success('electron-builder.json đã cập nhật');
} else {
  log(`[DRY RUN] Cập nhật electron-builder.json:`);
  log(`   productName: "${displayName}", appId: "${appId}"`);
  log(`   output:      "releases/${clientSlug}"`);
}

// ─── Build ────────────────────────────────────────────────────────────────────
if (!isDryRun) {
  console.log('\n🚀 Bắt đầu build...\n');
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    execSync('npm run build', { stdio: 'inherit', cwd: ROOT });
    console.log(`\n✅ BUILD THÀNH CÔNG!`);
    console.log(`📁 File .exe nằm tại: releases/${clientSlug}/`);
  } catch (err) {
    console.error('\n❌ Build thất bại:', err.message);
  } finally {
    // ─── Restore originals ───────────────────────────────────────────────────
    console.log('\n🔄 Đang khôi phục file gốc...');
    if (fs.existsSync(FIREBASE_BACKUP)) {
      fs.copyFileSync(FIREBASE_BACKUP, FIREBASE_DEST);
      fs.unlinkSync(FIREBASE_BACKUP);
      log('Restored firebase-config.json');
    }
    if (fs.existsSync(ELECTRON_BUILDER_BACKUP)) {
      fs.copyFileSync(ELECTRON_BUILDER_BACKUP, ELECTRON_BUILDER_FILE);
      fs.unlinkSync(ELECTRON_BUILDER_BACKUP);
      log('Restored electron-builder.json');
    }
    if (fs.existsSync(ICON_BACKUP)) {
      fs.copyFileSync(ICON_BACKUP, ICON_DEST);
      fs.unlinkSync(ICON_BACKUP);
      log('Restored icon.ico');
    }
    console.log('✅ File gốc đã được khôi phục.\n');
  }
} else {
  console.log('\n🔵 [DRY RUN] Hoàn tất. Chạy không có --dry-run để build thật.\n');
}

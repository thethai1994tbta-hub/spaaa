const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SECRET = 'SPA-VIP-2026-THAI';
const LICENSE_FILE = 'license.key';

function getLicensePath() {
  const userDataPath = app ? app.getPath('userData') : path.join(process.env.APPDATA || process.env.HOME, '.spa-vip');
  return path.join(userDataPath, LICENSE_FILE);
}

// Generate a machine ID from hardware info
function getMachineId() {
  const os = require('os');
  const raw = `${os.hostname()}-${os.platform()}-${os.arch()}-${os.cpus()[0]?.model || 'cpu'}`;
  return crypto.createHash('md5').update(raw).digest('hex').substring(0, 12).toUpperCase();
}

// Generate license key for a given machine ID and expiry
// Format: XXXX-XXXX-XXXX-XXXX (16 chars)
function generateLicenseKey(machineId, expiryDate) {
  const data = `${machineId}|${expiryDate}|${SECRET}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  const key = hash.substring(0, 16).toUpperCase();
  return `${key.slice(0, 4)}-${key.slice(4, 8)}-${key.slice(8, 12)}-${key.slice(12, 16)}`;
}

// Validate a license key against machine ID
function validateLicenseKey(licenseKey, machineId, expiryDate) {
  const expected = generateLicenseKey(machineId, expiryDate);
  return licenseKey === expected;
}

// Save license to file
function saveLicense(licenseKey, expiryDate) {
  try {
    const licensePath = getLicensePath();
    const dir = path.dirname(licensePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const data = JSON.stringify({
      key: licenseKey,
      expiry: expiryDate,
      activatedAt: new Date().toISOString(),
    });

    // Simple obfuscation
    const encoded = Buffer.from(data).toString('base64');
    fs.writeFileSync(licensePath, encoded, 'utf8');
    return true;
  } catch (error) {
    console.error('[License] Save error:', error);
    return false;
  }
}

// Load and verify saved license
function loadLicense() {
  try {
    const licensePath = getLicensePath();
    if (!fs.existsSync(licensePath)) {
      return { valid: false, reason: 'no_license' };
    }

    const encoded = fs.readFileSync(licensePath, 'utf8');
    const data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));

    const machineId = getMachineId();
    const isValid = validateLicenseKey(data.key, machineId, data.expiry);

    if (!isValid) {
      return { valid: false, reason: 'invalid_key' };
    }

    // Check expiry
    const expiry = new Date(data.expiry);
    if (expiry < new Date()) {
      return { valid: false, reason: 'expired', expiry: data.expiry };
    }

    return {
      valid: true,
      key: data.key,
      expiry: data.expiry,
      machineId,
    };
  } catch (error) {
    return { valid: false, reason: 'corrupted' };
  }
}

// Activate license with key and expiry
function activateLicense(licenseKey, expiryDate) {
  const machineId = getMachineId();
  const isValid = validateLicenseKey(licenseKey, machineId, expiryDate);

  if (!isValid) {
    return { success: false, error: 'Key bản quyền không hợp lệ cho máy này' };
  }

  const expiry = new Date(expiryDate);
  if (expiry < new Date()) {
    return { success: false, error: 'Key đã hết hạn' };
  }

  const saved = saveLicense(licenseKey, expiryDate);
  if (!saved) {
    return { success: false, error: 'Không thể lưu bản quyền' };
  }

  return { success: true, expiry: expiryDate, machineId };
}

module.exports = {
  getMachineId,
  generateLicenseKey,
  validateLicenseKey,
  loadLicense,
  activateLicense,
};

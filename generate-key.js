/**
 * License Key Generator for SPA VIP Management
 *
 * Usage:
 *   node generate-key.js <MACHINE_ID> <EXPIRY_DATE>
 *
 * Example:
 *   node generate-key.js A1B2C3D4E5F6 2027-12-31
 */

const crypto = require('crypto');

const SECRET = 'SPA-VIP-2026-THAI';

function generateLicenseKey(machineId, expiryDate) {
  const data = `${machineId}|${expiryDate}|${SECRET}`;
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  const key = hash.substring(0, 16).toUpperCase();
  return `${key.slice(0, 4)}-${key.slice(4, 8)}-${key.slice(8, 12)}-${key.slice(12, 16)}`;
}

// ============ CLI ============
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('');
  console.log('=== SPA VIP - License Key Generator ===');
  console.log('');
  console.log('Usage: node generate-key.js <MACHINE_ID> <EXPIRY_DATE>');
  console.log('');
  console.log('Example:');
  console.log('  node generate-key.js A1B2C3D4E5F6 2027-12-31');
  console.log('');
  process.exit(1);
}

const machineId = args[0].toUpperCase();
const expiryDate = args[1];

// Validate date
const date = new Date(expiryDate);
if (isNaN(date.getTime())) {
  console.error('Error: Invalid date format. Use YYYY-MM-DD');
  process.exit(1);
}

const key = generateLicenseKey(machineId, expiryDate);

console.log('');
console.log('╔══════════════════════════════════════╗');
console.log('║   SPA VIP - License Key Generated    ║');
console.log('╠══════════════════════════════════════╣');
console.log(`║  Machine ID : ${machineId.padEnd(22)}║`);
console.log(`║  Expiry     : ${expiryDate.padEnd(22)}║`);
console.log(`║  Key        : ${key.padEnd(22)}║`);
console.log('╚══════════════════════════════════════╝');
console.log('');
console.log('Gửi thông tin trên cho khách hàng để kích hoạt.');
console.log('');

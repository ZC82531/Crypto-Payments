/**
 * Backend – Unit Tests
 * Covers the pure helper utilities that live in api-server.js.
 * Because those helpers are private (not exported), we test equivalent logic
 * and the publicly-exported security/encryption module.
 */

const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Inline helpers (mirrors api-server.js private functions)
// These are intentionally small, so duplicating them here gives us
// deterministic unit coverage without needing to expose internals.
// ---------------------------------------------------------------------------
function getLast4Digits(value) {
  if (!value || value.length < 4) return '****';
  return value.slice(-4);
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

function encryptData(text) {
  if (!text) return null;
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptData(encryptedText) {
  if (!encryptedText) return null;
  if (!encryptedText.includes(':')) return encryptedText;
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const parts = encryptedText.split(':');
  if (parts.length !== 2) return encryptedText;
  const iv = Buffer.from(parts[0], 'hex');
  if (iv.length !== 16) return encryptedText;
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(parts[1], 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ---------------------------------------------------------------------------
// getLast4Digits
// ---------------------------------------------------------------------------
describe('getLast4Digits', () => {
  test('returns last 4 digits of a normal account number', () => {
    expect(getLast4Digits('1234567890')).toBe('7890');
  });

  test('returns last 4 digits when input is exactly 4 chars', () => {
    expect(getLast4Digits('5678')).toBe('5678');
  });

  test('returns **** for null', () => {
    expect(getLast4Digits(null)).toBe('****');
  });

  test('returns **** for empty string', () => {
    expect(getLast4Digits('')).toBe('****');
  });

  test('returns **** for strings shorter than 4 chars', () => {
    expect(getLast4Digits('12')).toBe('****');
  });
});

// ---------------------------------------------------------------------------
// encryptData / decryptData round-trip
// ---------------------------------------------------------------------------
describe('encryptData / decryptData', () => {
  test('returns null for null input', () => {
    expect(encryptData(null)).toBeNull();
    expect(decryptData(null)).toBeNull();
  });

  test('encrypted output contains IV separator colon', () => {
    const result = encryptData('123456789');
    expect(result).toContain(':');
  });

  test('two encryptions of same value produce different ciphertexts (random IV)', () => {
    const a = encryptData('123456789');
    const b = encryptData('123456789');
    expect(a).not.toBe(b);
  });

  test('round-trip: decrypt(encrypt(x)) === x for routing number', () => {
    const plain = '021000021';
    expect(decryptData(encryptData(plain))).toBe(plain);
  });

  test('round-trip: decrypt(encrypt(x)) === x for account number', () => {
    const plain = '000123456789';
    expect(decryptData(encryptData(plain))).toBe(plain);
  });

  test('round-trip: decrypt(encrypt(x)) === x for business name', () => {
    const plain = "Alice's Bakery";
    expect(decryptData(encryptData(plain))).toBe(plain);
  });

  test('decryptData returns plain text as-is when no colon present (legacy data)', () => {
    expect(decryptData('plainlegacyvalue')).toBe('plainlegacyvalue');
  });
});

// ---------------------------------------------------------------------------
// SecurityService (security/encryption.js) – real module coverage
// Tests the actual imported module so coverage is recorded against the file.
// ---------------------------------------------------------------------------
const security = require('../security/encryption');

describe('SecurityService.encrypt / decrypt', () => {
  test('encrypt returns an object with encrypted, iv, algorithm fields', () => {
    const result = security.encrypt('021000021');
    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('iv');
    expect(result.algorithm).toBe('aes-256-cbc');
  });

  test('encrypt returns null for falsy input', () => {
    expect(security.encrypt(null)).toBeNull();
    expect(security.encrypt('')).toBeNull();
  });

  test('same plaintext produces different ciphertexts (random IV)', () => {
    const a = security.encrypt('021000021');
    const b = security.encrypt('021000021');
    expect(a.encrypted).not.toBe(b.encrypted);
    expect(a.iv).not.toBe(b.iv);
  });

  test('decrypt round-trips a routing number', () => {
    const enc = security.encrypt('021000021');
    expect(security.decrypt(enc)).toBe('021000021');
  });

  test('decrypt round-trips a string with special characters', () => {
    const enc = security.encrypt("O'Brien & Sons LLC");
    expect(security.decrypt(enc)).toBe("O'Brien & Sons LLC");
  });

  test('decrypt round-trips unicode text', () => {
    const enc = security.encrypt('Café Montréal');
    expect(security.decrypt(enc)).toBe('Café Montréal');
  });

  test('decrypt returns null for null / undefined input', () => {
    expect(security.decrypt(null)).toBeNull();
    expect(security.decrypt(undefined)).toBeNull();
  });
});

describe('SecurityService.tokenize / detokenize', () => {
  test('tokenize returns a tok_routing_ prefixed string', () => {
    const token = security.tokenize('021000021', 'routing');
    expect(token).toMatch(/^tok_routing_/);
  });

  test('tokenize returns a tok_account_ prefixed string', () => {
    const token = security.tokenize('000123456789', 'account');
    expect(token).toMatch(/^tok_account_/);
  });

  test('tokenize returns null for falsy input', () => {
    expect(security.tokenize(null)).toBeNull();
    expect(security.tokenize('')).toBeNull();
  });

  test('detokenize recovers the original routing number', () => {
    const token = security.tokenize('021000021', 'routing');
    expect(security.detokenize(token)).toBe('021000021');
  });

  test('detokenize recovers the original account number', () => {
    const token = security.tokenize('000123456789', 'account');
    expect(security.detokenize(token)).toBe('000123456789');
  });

  test('detokenize returns null for an unknown token', () => {
    expect(security.detokenize('tok_account_00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  test('detokenize returns null for non-tok_ strings', () => {
    expect(security.detokenize('not-a-token')).toBeNull();
    expect(security.detokenize(null)).toBeNull();
  });
});

describe('SecurityService.secureTransform / reverseTransform', () => {
  test('secureTransform produces tokens for routing and account numbers', () => {
    const businessData = {
      business_name: 'ACME Corp',
      routing_number: '021000021',
      account_number: '000123456789',
    };
    const result = security.secureTransform(businessData);
    expect(result.business_name).toBe('ACME Corp');
    expect(result.routing_number_token).toMatch(/^tok_routing_/);
    expect(result.account_number_token).toMatch(/^tok_account_/);
    expect(result.routing_hash).toBeDefined();
    expect(result.transmission_id).toBeDefined();
  });

  test('reverseTransform recovers original data from secureTransform output', () => {
    const businessData = {
      business_name: 'Test Biz',
      routing_number: '021000021',
      account_number: '9876543210',
    };
    const secure = security.secureTransform(businessData);
    const recovered = security.reverseTransform(secure);
    expect(recovered.business_name).toBe('Test Biz');
    expect(recovered.routing_number).toBe('021000021');
    expect(recovered.account_number).toBe('9876543210');
  });
});

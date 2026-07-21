import crypto from 'crypto';

// CONFIGURATION
const ALGORITHM = 'aes-256-gcm';
const ENCODING = 'hex';
const HMAC_ALGO = 'sha256';

// 1. KEY GENERATION
export const generateAPIKey = () => {
  const buffer = crypto.randomBytes(32);
  return 'akira_' + buffer.toString('base64url');
};

// 2. ENCRYPTION (AES-256-GCM)
export const encrypt = (text, masterKey) => {
  const iv = crypto.randomBytes(12); // NIST SP 800-38D recommended 12 bytes for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(masterKey, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', ENCODING);
  encrypted += cipher.final(ENCODING);

  const authTag = cipher.getAuthTag().toString(ENCODING);

  return `${iv.toString(ENCODING)}:${authTag}:${encrypted}`;
};

// 3. DECRYPTION (AES-256-GCM)
export const decrypt = (text, masterKey) => {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), ENCODING);
  const authTag = Buffer.from(textParts.shift(), ENCODING);
  const encryptedText = Buffer.from(textParts.join(':'), ENCODING);

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(masterKey, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, ENCODING, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// 4. HASHING / FINGERPRINTING
export const hashFingerprint = (key) => {
  return crypto.createHash('sha256').update(key).digest('hex');
};

// 5. DIGITAL SIGNATURE
export const signData = (data, secret) => {
  const hmac = crypto.createHmac(HMAC_ALGO, secret);
  hmac.update(JSON.stringify(data));
  return hmac.digest('hex');
};
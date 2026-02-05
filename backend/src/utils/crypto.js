import crypto from 'crypto';

// CONFIGURATION
const ALGORITHM = 'aes-256-cbc';
const ENCODING = 'hex';
const HMAC_ALGO = 'sha256';

// 1. KEY GENERATION
export const generateAPIKey = () => {
  const buffer = crypto.randomBytes(32);
  return 'akira_' + buffer.toString('base64url');
};

// 2. ENCRYPTION
export const encrypt = (text, masterKey) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(masterKey, 'hex'), iv);

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// 3. DECRYPTION
export const decrypt = (text, masterKey) => {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(masterKey, 'hex'), iv);

  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
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
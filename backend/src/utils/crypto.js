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

// 6. FORWARD-SECURE KEY DERIVATION (HKDF-based)
// Derives a unique signing key per log entry using HKDF
// Even if current MASTER_KEY leaks, past derived keys cannot be recomputed
export const deriveSigningKey = (masterKey, sequenceNumber) => {
  const ikm = Buffer.from(masterKey, 'hex');
  const salt = Buffer.from(`akira-audit-seq-${sequenceNumber}`);
  const info = Buffer.from('audit-log-signing-v1');

  // HKDF-Extract
  const prk = crypto.createHmac('sha256', salt).update(ikm).digest();
  // HKDF-Expand (single block, 32 bytes)
  const okm = crypto.createHmac('sha256', prk)
    .update(Buffer.concat([info, Buffer.from([1])]))
    .digest();

  return okm.toString('hex');
};

// 7. HASH-CHAINED AUDIT SIGNATURE
// Signs: HMAC(derivedKey, previousHash + entryData)
// This prevents truncation attacks — deleting any entry breaks the chain
export const signChainedData = (data, masterKey, previousHash, sequenceNumber) => {
  const derivedKey = deriveSigningKey(masterKey, sequenceNumber);
  const payload = JSON.stringify({ previousHash, ...data });

  const hmac = crypto.createHmac(HMAC_ALGO, derivedKey);
  hmac.update(payload);
  return hmac.digest('hex');
};

// 8. CHAIN VERIFICATION
// Verifies the full audit chain integrity (called during export)
export const verifyChain = (logs, masterKey) => {
  const results = [];
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    const expectedPrevHash = i === 0 ? 'GENESIS' : logs[i - 1].integritySignature;

    // Check chain linkage
    if (log.previousHash !== expectedPrevHash) {
      results.push({ seq: log.sequenceNumber, valid: false, reason: 'CHAIN_BREAK' });
      continue;
    }

    // Check sequence monotonicity
    if (i > 0 && log.sequenceNumber !== logs[i - 1].sequenceNumber + 1) {
      results.push({ seq: log.sequenceNumber, valid: false, reason: 'SEQUENCE_GAP' });
      continue;
    }

    // Recompute signature
    const dataToVerify = {
      action: log.action,
      actor: log.actor,
      actorDisplay: log.actorDisplay,
      timestamp: log.timestamp,
      details: log.details
    };
    const recomputed = signChainedData(dataToVerify, masterKey, log.previousHash, log.sequenceNumber);

    results.push({
      seq: log.sequenceNumber,
      valid: crypto.timingSafeEqual(Buffer.from(recomputed), Buffer.from(log.integritySignature)),
      reason: null
    });
  }
  return results;
};
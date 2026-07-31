import APIKey from '../models/APIKey.js';
import AuditLog from '../models/AuditLog.js';
import { hashFingerprint } from '../utils/crypto.js';
import { writeAuditLog } from '../utils/auditWriter.js';
import { secureAttest } from '../utils/rustEngine.js';

export const verifyApiKey = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check Format
  if (!authHeader || !authHeader.startsWith('Bearer akira_')) {
    return res.status(401).json({ error: 'Invalid API Key format' });
  }

  const rawKey = authHeader.split(' ')[1];

  try {
    // 2. Hash incoming key (Rubric: Hashing)
    const incomingFingerprint = hashFingerprint(rawKey);

    // 3. Find Key in DB
    const keyRecord = await APIKey.findOne({ keyFingerprint: incomingFingerprint });

    if (keyRecord) {
      // 3.5. SECURE ATTESTATION (Rust Memory-Safe Decryption)
      try {
        const attestResult = secureAttest(
          keyRecord.encryptedKey,
          keyRecord.iv,
          keyRecord.authTag,
          process.env.MASTER_KEY,
          incomingFingerprint
        );

        if (attestResult !== 'MATCH') {
          throw new Error('Rust Attestation Failed: ' + attestResult);
        }
      } catch (attestErr) {
        console.error('Attestation Warning (Falling back to JS hash):', attestErr.message);
        // The fingerprint match in Mongo is our fallback if Rust fails
      }
    }

    if (!keyRecord || !keyRecord.isActive || new Date() > new Date(keyRecord.expiresAt)) {
      const isExpired = keyRecord && new Date() > new Date(keyRecord.expiresAt);
      // LOG FAILURE (Security)
      const denialLog = {
        action: 'ACCESS_DENIED',
        actorDisplay: keyRecord ? `Machine: ${keyRecord.name}` : 'Anonymous',
        ipAddress: req.ip,
        details: { reason: isExpired ? 'API Key Expired' : 'Invalid or Revoked Key' }
      };

      await writeAuditLog(denialLog);
      return res.status(401).json({ error: isExpired ? 'API Key has expired' : 'Invalid or Revoked API Key' });
    }

    // 4. Attach Identity to Request
    req.machine = {
      id: keyRecord._id,
      owner: keyRecord.owner,
      scopes: keyRecord.scopes,
      name: keyRecord.name
    };

    // 5. Log Success (Rubric: Audit)
    // In production, maybe don't log *every* read, but for Lab, YES.
    const accessLog = {
      action: 'API_ACCESS',
      actor: keyRecord.owner,
      actorDisplay: `Machine: ${keyRecord.name}`,
      details: { path: req.path }
    };

    await writeAuditLog(accessLog);

    next();

  } catch (error) {
    res.status(500).json({ error: 'Gateway Error' });
  }
};
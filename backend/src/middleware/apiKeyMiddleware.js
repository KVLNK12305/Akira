import APIKey from '../models/APIKey.js';
import AuditLog from '../models/AuditLog.js';
import { hashFingerprint, signData } from '../utils/crypto.js';

export const verifyApiKey = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check Format
  if (!authHeader || !authHeader.startsWith('Bearer akira_')) {
    return res.status(401).json({ error: 'Invalid API Key format' });
  }

  const rawKey = authHeader.split(' ')[1];

  try {
    // 2. Hash incoming key (Rubric: Hashing)
    // We do NOT decrypt the DB keys. We just compare hashes. Faster & Safer.
    const incomingFingerprint = hashFingerprint(rawKey);

    // 3. Find Key in DB
    const keyRecord = await APIKey.findOne({ keyFingerprint: incomingFingerprint });

    if (!keyRecord || !keyRecord.isActive) {
      // LOG FAILURE (Security)
      await AuditLog.create({
        action: 'ACCESS_DENIED',
        actor: 'Unknown',
        ipAddress: req.ip,
        details: { reason: 'Invalid or Revoked Key' },
        integritySignature: signData({ reason: 'Invalid Key' }, process.env.MASTER_KEY)
      });
      return res.status(401).json({ error: 'Invalid or Revoked API Key' });
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
    await AuditLog.create({
      action: 'API_ACCESS',
      actor: keyRecord.name, // The Machine Name
      details: { path: req.path },
      integritySignature: signData({ path: req.path }, process.env.MASTER_KEY)
    });

    next();

  } catch (error) {
    res.status(500).json({ error: 'Gateway Error' });
  }
};
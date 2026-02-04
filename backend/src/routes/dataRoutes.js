import express from 'express';
import { verifyApiKey } from '../middleware/apiKeyMiddleware.js';
import APIKey from '../models/APIKey.js';
import AuditLog from '../models/AuditLog.js';
import { hashFingerprint, signData } from '../utils/crypto.js';

const router = express.Router();

// Protected by API Key
router.get('/secret-report', verifyApiKey, (req, res) => {
  res.json({
    status: 'success',
    data: 'This is confidential data meant only for machines.',
    identity: `Authenticated as ${req.machine.name}`,
    scopes: req.machine.scopes
  });
});

// 👁️ NHI LIVE LAB: Detailed Validation Simulation
router.post('/nhi-validate', async (req, res) => {
  const { key, isBase64 } = req.body;

  if (!key) return res.status(400).json({ error: 'Key is required' });

  let rawKey = key;
  let steps = [];

  try {
    // Stage 1: Decoding
    steps.push({ stage: 'TRANSPORT', msg: isBase64 ? 'Decoding Base64 Payload...' : 'Direct Payload Received.' });
    if (isBase64) {
      rawKey = Buffer.from(key, 'base64').toString('utf8');
    }

    // Stage 2: Format Check
    steps.push({ stage: 'PROTOCOL', msg: 'Checking Akira Prefix (akira_)...' });
    if (!rawKey.startsWith('akira_')) {
      return res.status(401).json({
        success: false,
        error: 'Protocol Mismatch: Missing akira_ prefix',
        steps
      });
    }

    // Stage 3: Hashing
    steps.push({ stage: 'SECURITY', msg: 'Computing SHA-256 Fingerprint...' });
    const fingerprint = hashFingerprint(rawKey);

    // Stage 4: DB Lookup
    steps.push({ stage: 'IDENTITY', msg: 'Querying Key Vault for Fingerprint match...' });
    const keyRecord = await APIKey.findOne({ keyFingerprint: fingerprint });

    if (!keyRecord) {
      steps.push({ stage: 'DENIED', msg: 'No matching Non-Human Identity found.' });
      return res.status(404).json({ success: false, error: 'Identity Not Found', steps });
    }

    if (!keyRecord.isActive) {
      steps.push({ stage: 'DENIED', msg: 'Identity exists but is REVOKED/INACTIVE.' });
      return res.status(403).json({ success: false, error: 'Identity Inactive', steps });
    }

    // Stage 5: Success
    steps.push({ stage: 'SUCCESS', msg: `NHI Validated: ${keyRecord.name}` });

    // Log the simulation
    const logEntry = {
      action: 'NHI_SIMULATION_SUCCESS',
      actor: keyRecord.name,
      details: { simulation: true, isBase64 },
      integritySignature: signData({ sim: true }, process.env.MASTER_KEY)
    };
    await AuditLog.create(logEntry);

    res.json({
      success: true,
      identity: {
        name: keyRecord.name,
        id: keyRecord._id,
        scopes: keyRecord.scopes,
        createdAt: keyRecord.createdAt
      },
      steps
    });

  } catch (err) {
    res.status(500).json({ error: 'Simulation Engine Error', details: err.message });
  }
});

export default router;
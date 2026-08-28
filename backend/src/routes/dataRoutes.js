import express from 'express';
import { verifyApiKey } from '../middleware/apiKeyMiddleware.js';
import { verifyEphemeralToken } from '../middleware/ephemeralMiddleware.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import APIKey from '../models/APIKey.js';
import AuditLog from '../models/AuditLog.js';
import { hashFingerprint } from '../utils/crypto.js';
import { writeAuditLog } from '../utils/auditWriter.js';

const router = express.Router();

// Accept EITHER legacy API key OR ephemeral SVID token
const verifyMachineIdentity = (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer akira_')) {
    return verifyApiKey(req, res, next);        // Legacy path
  }
  return verifyEphemeralToken(req, res, next);  // New ephemeral path
};

// Helper to require specific machine scope
const requireScope = (requiredScope) => (req, res, next) => {
  if (!req.machine || !req.machine.scopes || !req.machine.scopes.includes(requiredScope)) {
    return res.status(403).json({
      error: `INSUFFICIENT_SCOPE: Missing required payment scope '${requiredScope}'`,
      grantedScopes: req.machine?.scopes || []
    });
  }
  next();
};

// Protected by API Key
router.get('/secret-report', verifyMachineIdentity, (req, res) => {
  res.json({
    status: 'success',
    data: 'This is confidential data meant only for machines.',
    identity: `Authenticated as ${req.machine.name}`,
    scopes: req.machine.scopes,
    riskScore: req.machine.riskScore
  });
});

// 💳 PAYMENT INFRASTRUCTURE ENDPOINTS (Non-Human Machine Ops)
router.post('/payment/charge', verifyMachineIdentity, requireScope('payment:initiate'), async (req, res) => {
  const { amount, currency = 'USD', destinationAccount } = req.body;
  
  res.json({
    success: true,
    transactionId: `txn_${Date.now()}`,
    status: 'AUTHORIZED',
    amount,
    currency,
    destinationAccount,
    processedBy: req.machine.name,
    timestamp: new Date().toISOString()
  });
});

router.post('/payment/settle', verifyMachineIdentity, requireScope('payment:settle'), async (req, res) => {
  const { batchId = `batch_${Date.now()}`, count = 1 } = req.body;

  res.json({
    success: true,
    batchId,
    status: 'SETTLED',
    recordsSettled: count,
    settledBy: req.machine.name,
    timestamp: new Date().toISOString()
  });
});

router.post('/payment/refund', verifyMachineIdentity, requireScope('refund:process'), async (req, res) => {
  const { transactionId, refundAmount, reason } = req.body;

  res.json({
    success: true,
    refundId: `ref_${Date.now()}`,
    originalTransaction: transactionId,
    refundAmount,
    reason,
    processedBy: req.machine.name,
    timestamp: new Date().toISOString()
  });
});

router.get('/ledger/transactions', verifyMachineIdentity, requireScope('ledger:read'), async (req, res) => {
  res.json({
    success: true,
    ledger: 'AKIRA-CORE-LEDGER-V1',
    transactions: [
      { id: 'txn_98234', amount: 4500.00, currency: 'USD', status: 'SETTLED' },
      { id: 'txn_98235', amount: 120.50, currency: 'USD', status: 'SETTLED' },
      { id: 'txn_98236', amount: 89000.00, currency: 'USD', status: 'AUTHORIZED' }
    ],
    auditedBy: req.machine.name
  });
});

// 👁️ NHI LIVE LAB: Detailed Validation Simulation
router.post('/nhi-validate', verifyToken, async (req, res) => {
  const { key: rawKeyContent, isBase64 } = req.body;

  if (!rawKeyContent) return res.status(400).json({ error: 'Key is required' });

  // 🛡️ SECURITY FIX: NoSQL Injection Prevention (Force String)
  let rawKey = String(rawKeyContent);
  let steps = [];

  try {
    // Stage 1: Decoding
    steps.push({ stage: 'TRANSPORT', msg: isBase64 ? 'Decoding Base64 Payload...' : 'Direct Payload Received.' });
    if (isBase64) {
      rawKey = Buffer.from(rawKey, 'base64').toString('utf8');
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
      actor: keyRecord.owner,
      actorDisplay: `Simulation: ${keyRecord.name}`,
      details: { simulation: true, isBase64, machineName: keyRecord.name },
      timestamp: new Date()
    };

    await writeAuditLog(logEntry);

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
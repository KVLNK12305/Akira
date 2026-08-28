import APIKey from '../models/APIKey.js';
import AuditLog from '../models/AuditLog.js';
import { hashFingerprint } from '../utils/crypto.js';
import { writeAuditLog } from '../utils/auditWriter.js';
import { secureAttest } from '../utils/rustEngine.js';
import { scoreNHIRequest } from '../services/riskEngine.js';
import { quarantineKey } from '../services/containmentService.js';
import { updateNHIProfile } from '../services/profileBuilder.js';

export const verifyApiKey = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Check Format
  if (!authHeader || !authHeader.startsWith('Bearer akira_')) {
    return res.status(401).json({ error: 'Invalid API Key format. Expected Bearer akira_<token>' });
  }

  const rawKey = authHeader.split(' ')[1];

  try {
    // 2. Hash incoming key (SHA-256 Fingerprint)
    const incomingFingerprint = hashFingerprint(rawKey);

    // 3. Find Key in DB
    const keyRecord = await APIKey.findOne({ keyFingerprint: incomingFingerprint });

    let attestStatus = 'MATCH';
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

        attestStatus = attestResult;
        if (attestResult !== 'MATCH') {
          console.warn('Rust Attestation Mismatch:', attestResult);
        }
      } catch (attestErr) {
        console.error('Attestation Warning (Rust offline/fallback):', attestErr.message);
        attestStatus = 'MATCH'; // Fallback if Rust module is optional in environment
      }
    }

    // 4. Check for Quarantine or Inactivity
    if (keyRecord && keyRecord.status === 'QUARANTINED') {
      const containmentLog = {
        action: 'QUARANTINED_ACCESS_BLOCKED',
        actorDisplay: `Machine: ${keyRecord.name}`,
        ipAddress: req.ip,
        details: {
          keyId: keyRecord._id,
          reason: keyRecord.quarantineReason || 'Quarantined by automated containment engine',
          quarantinedAt: keyRecord.quarantinedAt
        }
      };
      await writeAuditLog(containmentLog);

      return res.status(403).json({
        error: 'ACCESS CONTAINED: This Machine Identity has been QUARANTINED due to anomalous risk detection.',
        status: 'QUARANTINED',
        machineName: keyRecord.name,
        quarantineReason: keyRecord.quarantineReason,
        quarantinedAt: keyRecord.quarantinedAt
      });
    }

    if (!keyRecord || !keyRecord.isActive || new Date() > new Date(keyRecord.expiresAt)) {
      const isExpired = keyRecord && new Date() > new Date(keyRecord.expiresAt);
      const denialLog = {
        action: 'ACCESS_DENIED',
        actorDisplay: keyRecord ? `Machine: ${keyRecord.name}` : 'Anonymous',
        ipAddress: req.ip,
        details: { reason: isExpired ? 'API Key Expired' : 'Invalid or Revoked Key' }
      };

      await writeAuditLog(denialLog);
      return res.status(401).json({ error: isExpired ? 'API Key has expired' : 'Invalid or Revoked API Key' });
    }

    // 5. 🤖 AI-POWERED REAL-TIME RISK DETECTION & POLICY EVALUATION
    const riskAssessment = await scoreNHIRequest({
      keyRecord,
      clientIP: req.ip,
      userAgent: req.headers['user-agent'] || '',
      headers: req.headers || {},
      body: req.body || {},
      requestPath: req.originalUrl || req.path,
      requestMethod: req.method,
      requestedScopes: keyRecord.scopes || [],
      attestStatus
    });

    // 6. 🚨 AUTOMATED CONTAINMENT INTERCEPTION
    if (riskAssessment.action === 'CONTAINED') {
      await quarantineKey(
        keyRecord._id,
        `Automated Containment: Risk score ${riskAssessment.riskScore}/100 (${riskAssessment.signals.map(s => s.signal).join(', ')})`,
        { id: null, username: 'AKIRA AI-Risk Sentinel' }
      );

      return res.status(403).json({
        error: 'CRITICAL SECURITY CONTAINMENT: Anomalous machine behavior triggered automated quarantine.',
        status: 'QUARANTINED',
        riskScore: riskAssessment.riskScore,
        riskLevel: riskAssessment.riskLevel,
        signals: riskAssessment.signals,
        containmentActions: riskAssessment.containmentActions
      });
    }

    // 7. Update Behavioral Profile Baseline
    updateNHIProfile({
      keyId: keyRecord._id,
      machineName: keyRecord.name,
      clientIP: req.ip,
      userAgent: req.headers['user-agent'] || '',
      headers: req.headers || {},
      requestPath: req.originalUrl || req.path,
      requestMethod: req.method,
      scopes: keyRecord.scopes || []
    }).catch(err => console.error('Background profile update err:', err.message));

    // 8. Attach Identity and Risk Context to Request
    req.machine = {
      id: keyRecord._id,
      owner: keyRecord.owner,
      scopes: keyRecord.scopes,
      name: keyRecord.name,
      riskScore: riskAssessment.riskScore,
      riskLevel: riskAssessment.riskLevel
    };

    // 9. Immutable Audit Log Entry
    const accessLog = {
      action: 'API_ACCESS',
      actor: keyRecord.owner,
      actorDisplay: `Machine: ${keyRecord.name}`,
      details: {
        path: req.originalUrl || req.path,
        method: req.method,
        riskScore: riskAssessment.riskScore,
        riskLevel: riskAssessment.riskLevel
      }
    };
    await writeAuditLog(accessLog);

    next();

  } catch (error) {
    console.error('API Key Middleware error:', error);
    res.status(500).json({ error: 'Gateway Security Pipeline Error' });
  }
};
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import APIKey from '../models/APIKey.js';
import EphemeralToken from '../models/EphemeralToken.js';
import { writeAuditLog } from '../utils/auditWriter.js';
import { hashFingerprint } from '../utils/crypto.js';

const TOKEN_SECRET = process.env.TOKEN_SECRET || process.env.JWT_SECRET;

// @desc    Exchange a static API key for a short-lived ephemeral JWT
// @route   POST /api/v1/token/issue
export const issueEphemeralToken = async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer akira_')) {
    return res.status(401).json({ error: 'Present your root credential (akira_ key) to request a session token.' });
  }

  const rawKey = authHeader.split(' ')[1];
  const { ttl = 300, scopes: requestedScopes } = req.body; // Default 5 min

  try {
    // 1. Validate root credential via fingerprint (never decrypt)
    const fingerprint = hashFingerprint(rawKey);
    const parentKey = await APIKey.findOne({ keyFingerprint: fingerprint, isActive: true });

    if (!parentKey || new Date() > new Date(parentKey.expiresAt)) {
      return res.status(401).json({ error: 'Root credential invalid, expired, or revoked.' });
    }

    // 2. Enforce scope narrowing (requested scopes must be subset of parent)
    const allowedScopes = requestedScopes
      ? requestedScopes.filter(s => parentKey.scopes.includes(s))
      : parentKey.scopes;

    // 3. Enforce TTL ceiling (max 1 hour, min 30 seconds)
    const clampedTTL = Math.max(30, Math.min(ttl, 3600));

    // 4. Generate JWT-SVID
    const jti = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + clampedTTL * 1000);

    const token = jwt.sign(
      {
        jti,
        sub: parentKey._id.toString(),        // Subject = parent key ID
        owner: parentKey.owner.toString(),
        scopes: allowedScopes,
        type: 'ephemeral_svid',               // Machine token type
        iss: 'akira-gateway',
        aud: 'akira-data-plane'
      },
      TOKEN_SECRET,
      { expiresIn: clampedTTL }
    );

    // 5. Record issuance in DB (for revocation + audit)
    await EphemeralToken.create({
      parentKey: parentKey._id,
      jti,
      ttl: clampedTTL,
      scopes: allowedScopes,
      attestation: {
        clientIP: req.ip,
        userAgent: req.headers['user-agent']
      },
      expiresAt
    });

    // 6. Audit log
    const logEntry = {
      action: 'EPHEMERAL_TOKEN_ISSUED',
      actor: parentKey.owner,
      actorDisplay: `Machine: ${parentKey.name}`,
      ipAddress: req.ip,
      timestamp: new Date(),
      details: { jti, ttl: clampedTTL, scopes: allowedScopes, parentKeyId: parentKey._id }
    };

    await writeAuditLog(logEntry);

    res.status(201).json({
      token,
      type: 'ephemeral_svid',
      expiresIn: clampedTTL,
      expiresAt: expiresAt.toISOString(),
      scopes: allowedScopes,
      jti
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Revoke an ephemeral token before expiry
// @route   POST /api/v1/token/revoke
export const revokeEphemeralToken = async (req, res) => {
  const { jti } = req.body;
  if (!jti) return res.status(400).json({ error: 'Token ID (jti) required.' });

  try {
    const token = await EphemeralToken.findOne({ jti });
    if (!token) return res.status(404).json({ error: 'Token not found.' });

    token.revoked = true;
    await token.save();

    const logEntry = {
      action: 'EPHEMERAL_TOKEN_REVOKED',
      actor: req.user?.id || null,
      actorDisplay: req.user?.username || 'System',
      timestamp: new Date(),
      details: { jti }
    };

    await writeAuditLog(logEntry);

    res.json({ success: true, message: 'Token revoked.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

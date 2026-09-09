import jwt from 'jsonwebtoken';
import EphemeralToken from '../models/EphemeralToken.js';
import APIKey from '../models/APIKey.js';
import { createFailClosedError } from './policies/failure-policy.js';

const TOKEN_SECRET = process.env.TOKEN_SECRET || process.env.JWT_SECRET;

/**
 * Validates an ephemeral JWT-SVID credential (§10).
 * 
 * Guarantees:
 * 1. Cryptographic signature and token expiry are valid.
 * 2. Token has not been revoked in the EphemeralToken ledger.
 * 3. Parent root identity has not been quarantined.
 * 4. Token type is strictly 'ephemeral_svid' (no static/user tokens permitted).
 */
export const authenticateSvidToken = async (tokenString) => {
  if (!tokenString || typeof tokenString !== 'string') {
    throw createFailClosedError('AUTH_VALIDATION', new Error('Missing ephemeral SVID credential'));
  }

  // Strip 'Bearer ' prefix if present
  const cleanToken = tokenString.startsWith('Bearer ')
    ? tokenString.slice(7).trim()
    : tokenString.trim();

  try {
    // 1. Verify JWT signature + expiration
    const decoded = jwt.verify(cleanToken, TOKEN_SECRET, {
      issuer: 'akira-gateway',
      audience: 'akira-data-plane'
    });

    if (decoded.type !== 'ephemeral_svid') {
      const typeErr = new Error('Invalid token type: MCP requires ephemeral_svid');
      typeErr.code = 'INVALID_TOKEN_TYPE';
      throw createFailClosedError('AUTH_VALIDATION', typeErr);
    }

    // 2. Check revocation in database
    const tokenRecord = await EphemeralToken.findOne({ jti: decoded.jti });
    if (!tokenRecord || tokenRecord.revoked) {
      const revErr = new Error(tokenRecord?.revoked ? 'Ephemeral SVID has been revoked' : 'Ephemeral SVID not found in registry');
      revErr.code = 'TOKEN_REVOKED';
      throw createFailClosedError('AUTH_VALIDATION', revErr);
    }

    // 3. Check Parent Key status (Quarantine / Active)
    const parentKey = await APIKey.findById(tokenRecord.parentKey || decoded.sub);
    if (!parentKey || !parentKey.isActive || parentKey.status === 'QUARANTINED') {
      // Auto-revoke token if parent key was quarantined
      if (tokenRecord && !tokenRecord.revoked) {
        tokenRecord.revoked = true;
        await tokenRecord.save().catch(() => {});
      }

      const qErr = new Error(`Parent machine identity is QUARANTINED (${parentKey?.quarantineReason || 'Anomalous posture'})`);
      qErr.code = 'PARENT_QUARANTINED';
      throw createFailClosedError('AUTH_VALIDATION', qErr);
    }

    return {
      id: parentKey._id.toString(),
      sub: decoded.sub,
      jti: decoded.jti,
      name: parentKey.name,
      owner: parentKey.owner ? parentKey.owner.toString() : null,
      scopes: decoded.scopes || [],
      riskScore: parentKey.riskScore || 0,
      status: parentKey.status,
      simulationEligible: parentKey.simulationEligible || false,
      tokenExpiresAt: new Date(decoded.exp * 1000),
      rawToken: cleanToken
    };
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      const expErr = new Error('Ephemeral SVID token expired');
      expErr.code = 'TOKEN_EXPIRED';
      throw createFailClosedError('AUTH_VALIDATION', expErr);
    }
    if (err.failClosed) {
      throw err;
    }
    throw createFailClosedError('AUTH_VALIDATION', err);
  }
};

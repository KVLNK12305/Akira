import jwt from 'jsonwebtoken';
import EphemeralToken from '../models/EphemeralToken.js';
import APIKey from '../models/APIKey.js';
import { writeAuditLog } from '../utils/auditWriter.js';

const TOKEN_SECRET = process.env.TOKEN_SECRET || process.env.JWT_SECRET;

export const verifyEphemeralToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ey')) {
    return res.status(401).json({ error: 'Ephemeral SVID token required.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Verify JWT signature + expiry
    const decoded = jwt.verify(token, TOKEN_SECRET, {
      issuer: 'akira-gateway',
      audience: 'akira-data-plane'
    });

    if (decoded.type !== 'ephemeral_svid') {
      return res.status(401).json({ error: 'Invalid token type. Expected ephemeral_svid.' });
    }

    // 2. Check revocation status in DB
    const tokenRecord = await EphemeralToken.findOne({ jti: decoded.jti });

    if (!tokenRecord || tokenRecord.revoked) {
      const denialLog = {
        action: 'EPHEMERAL_ACCESS_DENIED',
        actorDisplay: `Machine: ${decoded.sub}`,
        ipAddress: req.ip,
        details: { reason: tokenRecord?.revoked ? 'Token Revoked' : 'Token Not Found', jti: decoded.jti }
      };
      await writeAuditLog(denialLog);
      return res.status(401).json({ error: 'Token revoked or invalid.' });
    }

    // 3. Verify Parent Key Status (Quarantine Check)
    const parentKey = await APIKey.findById(tokenRecord.parentKey || decoded.sub);
    if (parentKey && parentKey.status === 'QUARANTINED') {
      // Auto-revoke this token immediately
      tokenRecord.revoked = true;
      await tokenRecord.save();

      const quarantineDenialLog = {
        action: 'EPHEMERAL_PARENT_QUARANTINED',
        actorDisplay: `Machine: ${parentKey.name}`,
        ipAddress: req.ip,
        details: { parentKeyId: parentKey._id, jti: decoded.jti, reason: parentKey.quarantineReason }
      };
      await writeAuditLog(quarantineDenialLog);

      return res.status(403).json({
        error: 'ACCESS CONTAINED: Root credential for this token has been QUARANTINED due to anomalous risk.',
        status: 'QUARANTINED',
        parentKeyName: parentKey.name,
        quarantineReason: parentKey.quarantineReason
      });
    }

    // 4. Attach machine identity to request
    req.machine = {
      id: decoded.sub,
      owner: decoded.owner,
      scopes: decoded.scopes,
      jti: decoded.jti,
      tokenType: 'ephemeral',
      name: parentKey?.name || 'Machine-SVID',
      riskScore: parentKey?.riskScore || 0
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Ephemeral token expired. Re-issue from your root credential.' });
    }
    return res.status(401).json({ error: 'Token validation failed.' });
  }
};


import APIKey from '../models/APIKey.js';
import EphemeralToken from '../models/EphemeralToken.js';
import User from '../models/User.js';
import { writeAuditLog } from '../utils/auditWriter.js';
import { sendEmail } from '../utils/mailer.js';

/**
 * Quarantines an NHI API key and automatically contains all running sessions.
 * 
 * @param {string} keyId - ID of the APIKey
 * @param {string} reason - Reason for automated or manual quarantine
 * @param {Object} [actor] - Actor triggering the action (System or Admin user)
 * @returns {Promise<Object>}
 */
export const quarantineKey = async (keyId, reason, actor = { id: null, username: 'AKIRA AI-Risk Engine' }) => {
  const key = await APIKey.findById(keyId);
  if (!key) throw new Error('API Key not found for containment');

  // 1. Update Key status
  key.status = 'QUARANTINED';
  key.isActive = false;
  key.quarantinedAt = new Date();
  key.quarantineReason = reason || 'Anomalous behavior detected by AI Risk Engine';
  await key.save();

  // 2. Automated Token Invalidation: Mass-revoke all active ephemeral tokens
  const revokedTokensResult = await EphemeralToken.updateMany(
    { parentKey: keyId, revoked: false },
    { $set: { revoked: true } }
  );

  // 3. Write Cryptographically-Signed Audit Log (WORM Hash Chain)
  const logEntry = {
    action: 'NHI_QUARANTINED',
    actor: actor.id || null,
    actorDisplay: actor.username || 'AKIRA AI-Risk Engine',
    details: {
      keyId,
      machineName: key.name,
      reason: key.quarantineReason,
      revokedTokensCount: revokedTokensResult.modifiedCount,
      timestamp: new Date()
    }
  };
  await writeAuditLog(logEntry);

  // 4. Alert Admin Personnel via Email (Non-blocking)
  alertAdminsOnContainment({
    key,
    reason: key.quarantineReason,
    revokedCount: revokedTokensResult.modifiedCount
  }).catch(e => console.error('Admin email notify err:', e.message));

  return {
    success: true,
    keyId: key._id,
    machineName: key.name,
    status: key.status,
    revokedTokensCount: revokedTokensResult.modifiedCount
  };
};

/**
 * Releases an NHI from quarantine back to active status (Human-in-the-Loop Admin Action).
 * 
 * @param {string} keyId - ID of the APIKey
 * @param {Object} actor - Admin user releasing the quarantine
 * @returns {Promise<Object>}
 */
export const releaseQuarantine = async (keyId, actor) => {
  const key = await APIKey.findById(keyId);
  if (!key) throw new Error('API Key not found');

  key.status = 'ACTIVE';
  key.isActive = true;
  key.quarantinedAt = null;
  key.quarantineReason = null;
  key.riskScore = 0; // Reset risk score on explicit admin clearance
  await key.save();

  // Cryptographic audit entry
  const logEntry = {
    action: 'NHI_QUARANTINE_RELEASED',
    actor: actor.id,
    actorDisplay: actor.username,
    details: {
      keyId,
      machineName: key.name,
      releasedBy: actor.username,
      timestamp: new Date()
    }
  };
  await writeAuditLog(logEntry);

  return {
    success: true,
    message: `NHI ${key.name} successfully released from quarantine.`,
    key
  };
};

/**
 * Revokes all ephemeral tokens for a given parent key.
 */
export const massRevokeTokens = async (keyId, actor = { username: 'System' }) => {
  const result = await EphemeralToken.updateMany(
    { parentKey: keyId, revoked: false },
    { $set: { revoked: true } }
  );

  const logEntry = {
    action: 'EPHEMERAL_TOKENS_MASS_REVOKED',
    actor: actor.id || null,
    actorDisplay: actor.username || 'System',
    details: {
      parentKeyId: keyId,
      tokensRevoked: result.modifiedCount,
      timestamp: new Date()
    }
  };
  await writeAuditLog(logEntry);

  return result.modifiedCount;
};

/**
 * Dispatches high-severity email alert to all platform Admins.
 */
export const alertAdminsOnContainment = async ({ key, reason, revokedCount, riskScore = 85 }) => {
  try {
    const admins = await User.find({ role: { $in: ['Admin', 'superadmin'] } });
    const adminEmails = admins.map(u => u.email).filter(Boolean);

    if (adminEmails.length === 0) return;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #090d16; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #ef4444;">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #ef4444; margin: 0; font-size: 22px;">🚨 AKIRA CRITICAL: NHI Automated Containment Triggered</h2>
        </div>
        <p style="color: #94a3b8; font-size: 15px;">A non-human machine identity has triggered automated quarantine due to high risk assessment.</p>
        
        <div style="background: #111827; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Machine Identity:</td>
              <td style="color: #f8fafc; font-weight: bold;">${key.name}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Key ID:</td>
              <td style="color: #cbd5e1; font-family: monospace;">${key._id}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Risk Severity:</td>
              <td style="color: #ef4444; font-weight: bold;">CRITICAL (Score: ${riskScore}/100)</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Trigger Reason:</td>
              <td style="color: #fbbf24;">${reason}</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Active Tokens Revoked:</td>
              <td style="color: #38bdf8; font-weight: bold;">${revokedCount} ephemeral SVID tokens</td>
            </tr>
            <tr>
              <td style="color: #64748b; padding: 6px 0;">Timestamp (UTC):</td>
              <td style="color: #cbd5e1;">${new Date().toISOString()}</td>
            </tr>
          </table>
        </div>

        <p style="color: #cbd5e1; font-size: 13px;">
          Access from this machine identity is now <strong>completely blocked</strong> at the gateway. 
          To review signals or release quarantine, log into the <strong>AKIRA Threat Intel Dashboard</strong>.
        </p>
      </div>
    `;

    await sendEmail({
      to: adminEmails,
      subject: `🚨 [CONTAINMENT TRIGGERED] Machine Identity '${key.name}' Quarantined`,
      html: htmlContent
    });
  } catch (err) {
    console.error('Failed to send admin containment alert email:', err.message);
  }
};

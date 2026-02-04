import AuditLog from '../models/AuditLog.js';
import { signData } from '../utils/crypto.js';

// @desc    Get all audit logs for the current user
// @route   GET /api/audit-logs
export const getMyLogs = async (req, res) => {
  try {
    // If admin, show all? For now, let's just show logs where the user is the actor.
    const logs = await AuditLog.find({ actor: req.user.id })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Export all audit logs with digital signature
// @route   GET /api/audit-logs/export
export const exportLogs = async (req, res) => {
  try {
    // 1. Fetch all system logs
    const allLogs = await AuditLog.find()
      .populate('actor', 'username email role')
      .sort({ timestamp: -1 });

    // 2. Prepare the payload
    const payload = {
      system: 'AKIRA Secure Gateway',
      exportedAt: new Date(),
      exportedBy: {
        id: req.user._id,
        username: req.user.username,
        role: req.user.role
      },
      logCount: allLogs.length,
      logs: allLogs
    };

    // 3. Sign the payload for integrity verification
    const signature = signData(payload, process.env.MASTER_KEY || 'default_secret');

    const report = {
      ...payload,
      integritySignature: signature,
      verificationMethod: 'HMAC-SHA256'
    };

    // 4. Record this export event in the Audit Logs (Chain of Custody)
    const exportEvent = new AuditLog({
      action: 'LOGS_EXPORTED',
      actor: req.user._id,
      ipAddress: req.ip,
      details: {
        logCount: allLogs.length,
        signature: signature
      },
      integritySignature: signData({ action: 'LOGS_EXPORTED', actor: req.user._id }, process.env.MASTER_KEY || 'default_secret')
    });
    await exportEvent.save();

    res.json(report);
  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ error: 'Failed to generate secure log export' });
  }
};
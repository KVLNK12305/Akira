import AuditLog from '../models/AuditLog.js';

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
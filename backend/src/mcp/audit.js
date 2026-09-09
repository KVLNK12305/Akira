import { writeAuditLog } from '../utils/auditWriter.js';
import AuditLog from '../models/AuditLog.js';
import { verifyChain } from '../utils/crypto.js';
import { createFailClosedError } from './policies/failure-policy.js';

/**
 * Synchronous, Fail-Closed MCP Audit Writer (§14)
 * 
 * If the audit ledger write fails, the tool call MUST fail closed (throwing an exception),
 * ensuring no un-audited action can ever execute.
 */
export const recordMcpAuditEvent = async ({
  requestId,
  action = 'MCP_TOOL_CALL',
  caller,
  toolName,
  decision = 'ALLOW', // 'ALLOW' | 'DENY'
  reason = null,
  clientIP = '127.0.0.1',
  details = {}
}) => {
  const logEntry = {
    action,
    actor: caller?.owner || null,
    actorDisplay: caller ? `Machine: ${caller.name || caller.id}` : 'Anonymous AI Agent',
    ipAddress: clientIP,
    timestamp: new Date(),
    details: {
      requestId,
      toolName,
      decision,
      callerId: caller?.id || null,
      callerScopes: caller?.scopes || [],
      callerRiskScore: caller?.riskScore || 0,
      reason: reason || undefined,
      ...details
    }
  };

  try {
    const writtenLog = await writeAuditLog(logEntry);
    return {
      success: true,
      sequenceNumber: writtenLog.sequenceNumber,
      integritySignature: writtenLog.integritySignature,
      requestId
    };
  } catch (err) {
    console.error('CRITICAL: Synchronous MCP audit ledger write failed:', err.message);
    // Fail-Closed: deny operation if audit write failed
    throw createFailClosedError('AUDIT_WRITER', err);
  }
};

/**
 * Audit Chain Integrity Background Verification (§14)
 * Verifies that the forward-secure HKDF hash chain has not been tampered with or truncated.
 */
export const checkAuditChainIntegrity = async ({ startSeq = 0, limit } = {}) => {
  try {
    const query = { sequenceNumber: { $gte: startSeq } };
    let q = AuditLog.find(query).sort({ sequenceNumber: 1 });
    if (limit) q = q.limit(limit);
    const logs = await q.lean();

    if (logs.length === 0) {
      return { valid: true, count: 0, issues: [] };
    }

    const masterKey = process.env.MASTER_KEY || 'default_master_key';
    const issues = verifyChain(logs, masterKey);

    const invalidIssues = issues.filter(i => !i.valid);
    const isValid = invalidIssues.length === 0;

    return {
      valid: isValid,
      count: logs.length,
      invalidCount: invalidIssues.length,
      issues: invalidIssues
    };
  } catch (err) {
    console.error('Error during audit chain integrity verification:', err.message);
    return { valid: false, error: err.message };
  }
};

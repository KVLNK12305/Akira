import RiskEvent from '../models/RiskEvent.js';
import APIKey from '../models/APIKey.js';
import NHIProfile from '../models/NHIProfile.js';
import { TOOL_RISK_CLASSES } from './policies/tool-policy.js';

// Tier Rate Limits (allowed requests per 60-second window)
const TIER_LIMITS = {
  [TOOL_RISK_CLASSES.READ]: 60,
  [TOOL_RISK_CLASSES.INVESTIGATION]: 15,
  [TOOL_RISK_CLASSES.SIMULATION]: 5,
  [TOOL_RISK_CLASSES.CONTAINMENT]: 2
};

const WINDOW_MS = 60 * 1000; // 1 minute

// In-memory sliding windows: Map<identityId:tier, number[]>
const requestWindows = new Map();

// In-memory tracking of abuse counts: Map<identityId, { denies: number, lastDeny: number }>
const abuseTracker = new Map();

/**
 * Checks and records rate limit for a caller and tool tier.
 */
export const checkMcpRateLimit = (caller, toolRiskClass = TOOL_RISK_CLASSES.READ) => {
  const callerId = caller?.id || 'anonymous';
  const limit = TIER_LIMITS[toolRiskClass] || 30;
  const now = Date.now();
  const key = `${callerId}:${toolRiskClass}`;

  const timestamps = (requestWindows.get(key) || []).filter(t => now - t < WINDOW_MS);

  if (timestamps.length >= limit) {
    // Breached rate limit!
    requestWindows.set(key, timestamps);
    return {
      allowed: false,
      code: 'RATE_LIMIT_EXCEEDED',
      limit,
      current: timestamps.length,
      windowSeconds: 60,
      reason: `Rate limit exceeded for tier [${toolRiskClass}]: maximum ${limit} calls per minute`
    };
  }

  timestamps.push(now);
  requestWindows.set(key, timestamps);

  return {
    allowed: true,
    limit,
    remaining: limit - timestamps.length
  };
};

/**
 * Closed-Loop Risk Feedback (§18, §28):
 * Reports MCP abuse, probe attempts, or rate-limit violations back into the real AKIRA Risk Engine.
 * Dynamically raises the caller NHI's risk score and records a formal RiskEvent.
 */
export const reportMcpAbuseSignal = async ({
  caller,
  toolName,
  signalName,
  weight = 25,
  details = {},
  clientIP = '127.0.0.1'
}) => {
  if (!caller || !caller.id) return;

  const callerId = caller.id;
  const now = Date.now();

  // Update abuse tracking
  const tracker = abuseTracker.get(callerId) || { denies: 0, lastDeny: 0 };
  if (now - tracker.lastDeny < 5 * 60 * 1000) {
    tracker.denies += 1;
  } else {
    tracker.denies = 1;
  }
  tracker.lastDeny = now;
  abuseTracker.set(callerId, tracker);

  // Escalate weight if repeated probing
  let escalatedWeight = weight;
  if (tracker.denies >= 3) {
    escalatedWeight += 15; // Extra penalty for sustained probing
  }

  try {
    // 1. Fetch current key record to update its risk score
    const keyRecord = await APIKey.findById(callerId);
    if (!keyRecord) return;

    const previousScore = keyRecord.riskScore || 0;
    const newRiskScore = Math.min(100, Math.max(0, previousScore + escalatedWeight));

    let riskLevel = 'LOW';
    if (newRiskScore >= 75) riskLevel = 'CRITICAL';
    else if (newRiskScore >= 50) riskLevel = 'HIGH';
    else if (newRiskScore >= 25) riskLevel = 'MEDIUM';

    const action = riskLevel === 'CRITICAL' ? 'CONTAINED' : (riskLevel === 'HIGH' ? 'FLAGGED' : 'ALLOWED');
    const containmentActions = [];
    if (action === 'CONTAINED') {
      containmentActions.push('KEY_QUARANTINED', 'TOKEN_REVOKED', 'ADMIN_ALERTED');
      keyRecord.status = 'QUARANTINED';
      keyRecord.isActive = false;
      keyRecord.quarantinedAt = new Date();
      keyRecord.quarantineReason = `Automated MCP Abuse Containment: Repeated probe signals (${signalName})`;
    }

    keyRecord.riskScore = newRiskScore;
    await keyRecord.save();

    // Reflect directly on current in-memory caller identity
    caller.riskScore = newRiskScore;
    if (action === 'CONTAINED') {
      caller.status = 'QUARANTINED';
    }

    // Map signalName to valid RiskEvent enum
    let resolvedSignal = 'SUSPICIOUS_PATTERN';
    if (signalName.includes('SCOPE')) resolvedSignal = 'SCOPE_ESCALATION';
    else if (signalName.includes('RATE') || signalName.includes('VELOCITY')) resolvedSignal = 'VELOCITY_SPIKE';
    else if (signalName.includes('SYSTEM')) resolvedSignal = 'SYSTEM_FAILURE';

    // 2. Persist real RiskEvent into MongoDB
    await RiskEvent.create({
      apiKey: keyRecord._id,
      machineName: keyRecord.name || 'AI-MCP-Agent',
      parentKeyFingerprint: keyRecord.keyFingerprint || 'UNKNOWN',
      riskScore: newRiskScore,
      riskLevel,
      signals: [
        {
          signal: resolvedSignal,
          weight: escalatedWeight,
          details: {
            mcpSignal: signalName,
            toolName,
            consecutiveDenials: tracker.denies,
            ...details
          }
        }
      ],
      action,
      containmentActions,
      requestPath: `mcp://tools/${toolName}`,
      requestMethod: 'MCP_TOOL_CALL',
      clientIP,
      requestedScopes: caller.scopes || [],
      timestamp: new Date()
    });

    // 3. Update violation count in profile if profile exists
    await NHIProfile.updateOne(
      { apiKey: keyRecord._id },
      { $inc: { violationCount: 1 }, $set: { lastSeen: new Date() } }
    ).catch(() => {});

    console.warn(`🚨 [MCP CLOSED-LOOP RISK SENTINEL] Signal ${signalName} applied to ${keyRecord.name} (Risk ${previousScore} -> ${newRiskScore}/100)`);
  } catch (err) {
    console.error('Failed to report MCP abuse signal into risk engine:', err.message);
  }
};

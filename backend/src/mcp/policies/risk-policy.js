import { TOOL_RISK_CLASSES } from './tool-policy.js';

/**
 * Risk-Adaptive Authorization Policy (§12 Policy C)
 * 
 * Authorization = NHI Identity + MCP Scope + Tool Risk Class + AKIRA Risk Score(caller) + Policy
 * 
 * Thresholds:
 * - CRITICAL (Risk >= 90 or QUARANTINED): ALL tool calls DENIED full stop.
 * - HIGH (Risk >= 75): Simulation DENIED, Read tools allowed with strict rate limits.
 * - ELEVATED (Risk >= 50): Simulation requires step-up approval (denied without explicit approval), Read allowed.
 * - LOW / MEDIUM (Risk < 50): All authorized tools permitted within rate limits.
 */

export const THRESHOLDS = {
  CRITICAL: 90,
  HIGH: 75,
  ELEVATED: 50
};

export const evaluateRiskAdaptivePolicy = ({ caller, toolPolicy }) => {
  const callerRisk = Number(caller?.riskScore) || 0;
  const callerStatus = caller?.status || 'ACTIVE';

  // 1. Quarantined or Critical Risk Identity: FULL SHUTDOWN
  if (callerStatus === 'QUARANTINED' || callerRisk >= THRESHOLDS.CRITICAL) {
    return {
      allowed: false,
      code: 'CALLER_QUARANTINED_OR_CRITICAL',
      reason: `Caller identity risk is critical (${callerRisk}/100, status: ${callerStatus}). All MCP execution is contained.`
    };
  }

  // 2. High Risk Identity: Simulation tools blocked
  if (callerRisk >= THRESHOLDS.HIGH) {
    if (toolPolicy.riskClass === TOOL_RISK_CLASSES.SIMULATION || toolPolicy.riskClass === TOOL_RISK_CLASSES.CONTAINMENT) {
      return {
        allowed: false,
        code: 'HIGH_RISK_SIMULATION_BLOCKED',
        reason: `Caller identity has elevated risk (${callerRisk}/100). Privileged simulation/containment tools are blocked.`
      };
    }
  }

  // 3. Elevated Risk Identity: Simulation tools require explicit approval flag
  if (callerRisk >= THRESHOLDS.ELEVATED) {
    if (toolPolicy.riskClass === TOOL_RISK_CLASSES.SIMULATION) {
      if (!caller.approvedForElevatedSimulation) {
        return {
          allowed: false,
          code: 'ELEVATED_RISK_APPROVAL_REQUIRED',
          reason: `Caller risk is elevated (${callerRisk}/100). Simulation execution requires step-up administrator authorization.`
        };
      }
    }
  }

  return { allowed: true };
};

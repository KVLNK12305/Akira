import { TOOL_DEFINITIONS } from './policies/tool-policy.js';
import { evaluateRiskAdaptivePolicy } from './policies/risk-policy.js';
import { verifyCallerTargetAccess } from './confused-deputy.js';
import { createFailClosedError } from './policies/failure-policy.js';

/**
 * AKIRA MCP Authorization Engine (§11, §12, §26)
 * 
 * Enforces:
 * 1. Default Deny on unknown tool or missing identity
 * 2. Least-Privilege Scope Matching against caller's SVID scopes
 * 3. Risk-Adaptive Authorization based on caller's current risk score
 * 4. Confused-Deputy target authorization scoping
 */
export const authorizeMcpRequest = async ({
  caller,
  toolName,
  toolArgs = {}
}) => {
  try {
    // 1. Policy A: Missing caller identity -> Fail closed
    if (!caller || !caller.id) {
      throw createFailClosedError('AUTH_VALIDATION', new Error('Unauthenticated caller'));
    }

    // 2. Policy A: Unknown tool -> Fail closed
    const toolPolicy = TOOL_DEFINITIONS[toolName];
    if (!toolPolicy) {
      const err = new Error(`Unknown or unregistered MCP tool: '${toolName}'`);
      err.code = 'UNKNOWN_TOOL';
      throw createFailClosedError('POLICY_EVALUATION', err);
    }

    // 3. Policy B: Least-Privilege Scope Verification
    const callerScopes = caller.scopes || [];
    const hasRequiredScope = toolPolicy.requiredScopes.some(reqScope => 
      callerScopes.includes(reqScope) || callerScopes.includes('mcp:admin') || callerScopes.includes('admin')
    );

    if (!hasRequiredScope) {
      const scopeErr = new Error(`Access Denied: Missing required scope [${toolPolicy.requiredScopes.join(' or ')}] for tool '${toolName}'`);
      scopeErr.code = 'INSUFFICIENT_SCOPE';
      scopeErr.failClosed = true;
      scopeErr.requiredScopes = toolPolicy.requiredScopes;
      scopeErr.callerScopes = callerScopes;
      throw scopeErr;
    }

    // 4. Policy C: Risk-Adaptive Evaluation (Caller's own risk degrades posture)
    const riskDecision = evaluateRiskAdaptivePolicy({ caller, toolPolicy });
    if (!riskDecision.allowed) {
      const riskErr = new Error(riskDecision.reason);
      riskErr.code = riskDecision.code;
      riskErr.failClosed = true;
      throw riskErr;
    }

    // 5. Confused-Deputy Scoping Verification (if target keyId is present)
    let queryConstraint = {};
    if (toolArgs.keyId) {
      const deputyCheck = await verifyCallerTargetAccess(caller, toolArgs.keyId);
      if (!deputyCheck.allowed) {
        const deputyErr = new Error(deputyCheck.reason);
        deputyErr.code = deputyCheck.code;
        deputyErr.failClosed = true;
        throw deputyErr;
      }
      queryConstraint = deputyCheck.queryConstraint || {};
    }

    return {
      authorized: true,
      toolPolicy,
      queryConstraint
    };
  } catch (err) {
    if (err.failClosed) throw err;
    // Wrap any unexpected exception into fail-closed policy error
    throw createFailClosedError('POLICY_EVALUATION', err);
  }
};

/**
 * AKIRA MCP Failure Policy — Fail-Closed Everywhere (§26)
 * 
 * Every external dependency the MCP layer calls has an explicit failure behavior: DENY.
 * No action is permitted to succeed if its safety or audit check fails or times out.
 */

export const FAILURE_MODES = {
  AUTH_VALIDATION: {
    dependency: 'Auth/SVID validation',
    onFailure: 'DENY',
    auditCode: 'AUTH_UNAVAILABLE',
    message: 'Identity attestation could not be verified'
  },
  POLICY_EVALUATION: {
    dependency: 'Scope/Policy engine',
    onFailure: 'DENY',
    auditCode: 'POLICY_ENGINE_ERROR',
    message: 'Policy authorization check encountered an internal fault'
  },
  RISK_ENGINE: {
    dependency: 'Risk engine',
    onFailure: 'DENY',
    auditCode: 'RISK_ENGINE_UNAVAILABLE',
    message: 'Risk Sentinel scoring service unavailable (fail-closed)'
  },
  AUDIT_WRITER: {
    dependency: 'Audit writer (WORM Hash Chain)',
    onFailure: 'DENY',
    auditCode: 'AUDIT_WRITE_FAILED',
    message: 'Audit ledger write failed; underlying operation denied'
  },
  RATE_LIMITER: {
    dependency: 'Rate limiter store',
    onFailure: 'DENY',
    auditCode: 'RATE_LIMITER_ERROR',
    message: 'Rate limit tracking error (fail-closed)'
  },
  DATA_STORE: {
    dependency: 'MongoDB / Data plane',
    onFailure: 'DENY',
    auditCode: 'DATA_STORE_ERROR',
    message: 'Underlying data store query failed'
  },
  SIMULATION_GUARD: {
    dependency: 'Simulation target eligibility guard',
    onFailure: 'DENY',
    auditCode: 'TARGET_NOT_SIMULATION_ELIGIBLE',
    message: 'Target identity is not flagged simulation-eligible'
  }
};

/**
 * Creates a standard fail-closed structured error.
 */
export const createFailClosedError = (failureType, originalError = null) => {
  const spec = FAILURE_MODES[failureType] || {
    dependency: 'Unknown',
    onFailure: 'DENY',
    auditCode: 'SYSTEM_FAULT',
    message: 'A security dependency failed closed'
  };

  const error = new Error(spec.message);
  error.code = spec.auditCode;
  error.dependency = spec.dependency;
  error.status = 403;
  error.failClosed = true;

  if (originalError) {
    error.internalDetails = originalError.message;
  }

  return error;
};

import { assertSafeObject, assertValidKeyId, assertStrictKeys } from './validationUtils.js';

/**
 * Validates inputs for 'get_risk_score'.
 */
export const validateRiskScoreInput = (args) => {
  assertSafeObject(args);
  assertStrictKeys(args, ['keyId'], 'get_risk_score');

  if (!args.keyId) {
    throw new Error(`Missing required parameter: 'keyId' for get_risk_score`);
  }
  assertValidKeyId(args.keyId, 'keyId');

  return {
    keyId: args.keyId.trim()
  };
};

/**
 * Validates inputs for 'get_risk_events'.
 */
export const validateRiskEventsInput = (args) => {
  assertSafeObject(args);
  assertStrictKeys(args, ['keyId', 'level', 'action', 'limit', 'page'], 'get_risk_events');

  const validated = {};

  if (args.keyId !== undefined && args.keyId !== null) {
    assertValidKeyId(args.keyId, 'keyId');
    validated.keyId = args.keyId.trim();
  }

  if (args.level !== undefined && args.level !== null) {
    const safeLevel = String(args.level).toUpperCase();
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(safeLevel)) {
      throw new Error(`Invalid parameter 'level': must be one of [LOW, MEDIUM, HIGH, CRITICAL]`);
    }
    validated.level = safeLevel;
  }

  if (args.action !== undefined && args.action !== null) {
    const safeAction = String(args.action).toUpperCase();
    if (!['ALLOWED', 'FLAGGED', 'CONTAINED'].includes(safeAction)) {
      throw new Error(`Invalid parameter 'action': must be one of [ALLOWED, FLAGGED, CONTAINED]`);
    }
    validated.action = safeAction;
  }

  if (args.limit !== undefined && args.limit !== null) {
    const parsed = parseInt(args.limit, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error(`Invalid parameter 'limit': must be a positive integer`);
    }
    validated.limit = Math.min(parsed, 100); // Enforce server-side ceiling of 100
  } else {
    validated.limit = 20;
  }

  if (args.page !== undefined && args.page !== null) {
    const parsed = parseInt(args.page, 10);
    if (isNaN(parsed) || parsed < 1) {
      throw new Error(`Invalid parameter 'page': must be a positive integer`);
    }
    validated.page = parsed;
  } else {
    validated.page = 1;
  }

  return validated;
};

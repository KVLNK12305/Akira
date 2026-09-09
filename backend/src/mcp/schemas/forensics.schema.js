import { assertSafeObject, assertValidKeyId, assertStrictKeys } from './validationUtils.js';

/**
 * Validates inputs for 'investigate_nhi'.
 */
export const validateForensicsInput = (args) => {
  assertSafeObject(args);
  assertStrictKeys(args, ['keyId', 'timeWindowHours'], 'investigate_nhi');

  if (!args.keyId) {
    throw new Error(`Missing required parameter: 'keyId' for investigate_nhi`);
  }
  assertValidKeyId(args.keyId, 'keyId');

  let timeWindowHours = 24;
  if (args.timeWindowHours !== undefined && args.timeWindowHours !== null) {
    const parsed = parseInt(args.timeWindowHours, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 168) {
      throw new Error(`Invalid parameter 'timeWindowHours': must be an integer between 1 and 168 (7 days)`);
    }
    timeWindowHours = parsed;
  }

  return {
    keyId: args.keyId.trim(),
    timeWindowHours
  };
};

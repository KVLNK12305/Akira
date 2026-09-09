import { assertSafeObject, assertValidKeyId, assertStrictKeys } from './validationUtils.js';

/**
 * Validates inputs for 'get_nhi_profile' and 'get_behavioral_baseline'.
 */
export const validateNhiInput = (args, toolName = 'get_nhi_profile') => {
  assertSafeObject(args);
  assertStrictKeys(args, ['keyId'], toolName);

  if (!args.keyId) {
    throw new Error(`Missing required parameter: 'keyId' for ${toolName}`);
  }
  assertValidKeyId(args.keyId, 'keyId');

  return {
    keyId: args.keyId.trim()
  };
};

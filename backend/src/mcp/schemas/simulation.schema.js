import { assertSafeObject, assertValidKeyId, assertStrictKeys } from './validationUtils.js';

export const ALLOWED_ATTACK_SCENARIOS = [
  'PAYMENT_EXFILTRATION',
  'IMPOSSIBLE_TRAVEL',
  'COMPROMISED_KEY_BREACH',
  'UNAUTHORIZED_REFUND'
];

/**
 * Validates inputs for 'simulate_attack'.
 */
export const validateSimulationInput = (args) => {
  assertSafeObject(args);
  assertStrictKeys(args, ['keyId', 'attackScenario'], 'simulate_attack');

  if (!args.keyId) {
    throw new Error(`Missing required parameter: 'keyId' for simulate_attack`);
  }
  assertValidKeyId(args.keyId, 'keyId');

  if (!args.attackScenario) {
    throw new Error(`Missing required parameter: 'attackScenario' for simulate_attack`);
  }

  const scenario = String(args.attackScenario).trim();
  if (!ALLOWED_ATTACK_SCENARIOS.includes(scenario)) {
    throw new Error(`Invalid 'attackScenario': must be one of [${ALLOWED_ATTACK_SCENARIOS.join(', ')}]`);
  }

  return {
    keyId: args.keyId.trim(),
    attackScenario: scenario
  };
};

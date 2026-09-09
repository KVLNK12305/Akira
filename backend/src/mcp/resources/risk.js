import { getRiskScoreByKeyId } from '../../services/nhiService.js';
import { assertValidKeyId } from '../schemas/validationUtils.js';

export const readRiskResource = async (uri, context = {}) => {
  // Pattern: risk://{keyId}
  const keyId = uri.replace('risk://', '').trim();
  assertValidKeyId(keyId, 'uri keyId');

  const riskData = await getRiskScoreByKeyId(keyId);
  if (!riskData) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(riskData, null, 2)
  };
};

import { getProfileByKeyId, getBehavioralBaseline } from '../../services/nhiService.js';
import { assertValidKeyId } from '../schemas/validationUtils.js';

export const readNhiResource = async (uri, context = {}) => {
  // Pattern: nhi://{keyId}
  const keyId = uri.replace('nhi://', '').trim();
  assertValidKeyId(keyId, 'uri keyId');

  const profile = await getProfileByKeyId(keyId);
  if (!profile) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(profile, null, 2)
  };
};

export const readBaselineResource = async (uri, context = {}) => {
  // Pattern: baseline://{keyId}
  const keyId = uri.replace('baseline://', '').trim();
  assertValidKeyId(keyId, 'uri keyId');

  const baseline = await getBehavioralBaseline(keyId);
  if (!baseline) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(baseline, null, 2)
  };
};

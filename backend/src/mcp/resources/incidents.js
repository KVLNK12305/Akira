import RiskEvent from '../../models/RiskEvent.js';
import { assertValidKeyId } from '../schemas/validationUtils.js';

export const readIncidentResource = async (uri, context = {}) => {
  // Pattern: incident://{incidentId}
  const incidentId = uri.replace('incident://', '').trim();
  assertValidKeyId(incidentId, 'uri incidentId');

  const incident = await RiskEvent.findById(incidentId).populate('apiKey', 'name status');
  if (!incident) {
    throw new Error(`Resource not found: ${uri}`);
  }

  return {
    uri,
    mimeType: 'application/json',
    text: JSON.stringify(incident, null, 2)
  };
};

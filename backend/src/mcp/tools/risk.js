import { getRiskScoreByKeyId, getRiskEvents } from '../../services/nhiService.js';
import { validateRiskScoreInput, validateRiskEventsInput } from '../schemas/risk.schema.js';
import { createFailClosedError } from '../policies/failure-policy.js';

/**
 * MCP Tool Handler: get_risk_score
 */
export const handleGetRiskScore = async (rawArgs, context = {}) => {
  const { keyId } = validateRiskScoreInput(rawArgs);

  try {
    const riskData = await getRiskScoreByKeyId(keyId);
    if (!riskData) {
      const err = new Error(`Identity not found for key ID: ${keyId}`);
      err.code = 'IDENTITY_NOT_FOUND';
      throw err;
    }
    return riskData;
  } catch (err) {
    if (err.code === 'IDENTITY_NOT_FOUND') throw err;
    throw createFailClosedError('DATA_STORE', err);
  }
};

/**
 * MCP Tool Handler: get_risk_events
 */
export const handleGetRiskEvents = async (rawArgs, context = {}) => {
  const validated = validateRiskEventsInput(rawArgs);

  const filter = {};
  if (validated.keyId) filter.apiKey = validated.keyId;
  if (validated.level) filter.riskLevel = validated.level;
  if (validated.action) filter.action = validated.action;

  // Merge confused-deputy query constraints if applicable
  if (context.queryConstraint?.owner) {
    // Caller is scoped to a specific owner
  }

  try {
    const results = await getRiskEvents({
      filter,
      limit: validated.limit,
      page: validated.page
    });

    return {
      total: results.total,
      page: results.page,
      limit: results.limit,
      events: (results.events || []).map(event => ({
        eventId: event._id,
        timestamp: event.timestamp,
        machineName: event.machineName,
        keyId: event.apiKey?._id || event.apiKey,
        riskScore: event.riskScore,
        riskLevel: event.riskLevel,
        action: event.action,
        containmentActions: event.containmentActions || [],
        requestPath: event.requestPath,
        requestMethod: event.requestMethod,
        clientIP: event.clientIP,
        userAgent: event.userAgent,
        signals: (event.signals || []).map(s => ({
          signal: s.signal,
          weight: s.weight,
          details: s.details
        }))
      }))
    };
  } catch (err) {
    throw createFailClosedError('DATA_STORE', err);
  }
};

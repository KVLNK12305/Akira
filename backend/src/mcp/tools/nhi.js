import { getProfileByKeyId, getBehavioralBaseline } from '../../services/nhiService.js';
import { validateNhiInput } from '../schemas/nhi.schema.js';
import { createFailClosedError } from '../policies/failure-policy.js';

/**
 * MCP Tool Handler: get_nhi_profile
 */
export const handleGetNhiProfile = async (rawArgs, context = {}) => {
  const { keyId } = validateNhiInput(rawArgs, 'get_nhi_profile');

  try {
    const profile = await getProfileByKeyId(keyId);
    if (!profile) {
      const err = new Error(`No NHI profile found for key ID: ${keyId}`);
      err.code = 'PROFILE_NOT_FOUND';
      throw err;
    }

    const key = profile.apiKey;

    return {
      keyId: key?._id || profile.apiKey,
      machineName: profile.machineName,
      status: key?.status || 'UNKNOWN',
      currentRiskScore: key?.riskScore || 0,
      quarantined: key?.status === 'QUARANTINED',
      quarantinedAt: key?.quarantinedAt || null,
      quarantineReason: key?.quarantineReason || null,
      scopes: key?.scopes || [],
      simulationEligible: key?.simulationEligible || false,
      baselineEstablished: profile.baselineEstablished || false,
      baselineEstablishedAt: profile.baselineEstablishedAt || null,
      totalRequestsLearned: profile.totalRequests || 0,
      learningThreshold: profile.learningThreshold || 10,
      violationCount: profile.violationCount || 0,
      avgRequestsPerHour: profile.avgRequestsPerHour || 0,
      peakRequestsPerHour: profile.peakRequestsPerHour || 0,
      lastSeen: profile.lastSeen || null,
      createdAt: key?.createdAt || null,
      expiresAt: key?.expiresAt || null
    };
  } catch (err) {
    if (err.code === 'PROFILE_NOT_FOUND') throw err;
    throw createFailClosedError('DATA_STORE', err);
  }
};

/**
 * MCP Tool Handler: get_behavioral_baseline
 */
export const handleGetBehavioralBaseline = async (rawArgs, context = {}) => {
  const { keyId } = validateNhiInput(rawArgs, 'get_behavioral_baseline');

  try {
    const baseline = await getBehavioralBaseline(keyId);
    if (!baseline) {
      const err = new Error(`No behavioral baseline data found for key ID: ${keyId}`);
      err.code = 'BASELINE_NOT_FOUND';
      throw err;
    }
    return baseline;
  } catch (err) {
    if (err.code === 'BASELINE_NOT_FOUND') throw err;
    throw createFailClosedError('DATA_STORE', err);
  }
};

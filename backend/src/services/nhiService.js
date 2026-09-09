import APIKey from '../models/APIKey.js';
import NHIProfile from '../models/NHIProfile.js';
import RiskEvent from '../models/RiskEvent.js';
import EphemeralToken from '../models/EphemeralToken.js';
import CompromisedCredential from '../models/CompromisedCredential.js';
import { scoreNHIRequest } from './riskEngine.js';
import { quarantineKey } from './containmentService.js';
import { writeAuditLog } from '../utils/auditWriter.js';

/**
 * Service: Retrieves NHI Profile with populated API key metadata.
 */
export const getProfileByKeyId = async (keyId) => {
  if (!keyId) throw new Error('keyId is required');
  const profile = await NHIProfile.findOne({ apiKey: keyId })
    .populate('apiKey', 'name status scopes riskScore simulationEligible quarantinedAt quarantineReason expiresAt createdAt');
  return profile;
};

/**
 * Service: Retrieves risk score, level, and current containment status for an NHI.
 */
export const getRiskScoreByKeyId = async (keyId) => {
  if (!keyId) throw new Error('keyId is required');
  const [key, profile, latestEvent] = await Promise.all([
    APIKey.findById(keyId).select('name status riskScore simulationEligible quarantinedAt quarantineReason'),
    NHIProfile.findOne({ apiKey: keyId }).select('violationCount lastSeen baselineEstablished totalRequests'),
    RiskEvent.findOne({ apiKey: keyId }).sort({ timestamp: -1 }).select('riskScore riskLevel action signals timestamp')
  ]);

  if (!key) return null;

  return {
    keyId: key._id,
    name: key.name,
    status: key.status,
    riskScore: key.riskScore || 0,
    riskLevel: latestEvent?.riskLevel || (key.riskScore >= 75 ? 'CRITICAL' : key.riskScore >= 50 ? 'HIGH' : key.riskScore >= 25 ? 'MEDIUM' : 'LOW'),
    action: key.status === 'QUARANTINED' ? 'CONTAINED' : (latestEvent?.action || 'ALLOWED'),
    violationCount: profile?.violationCount || 0,
    baselineEstablished: profile?.baselineEstablished || false,
    lastSeen: profile?.lastSeen || null,
    quarantinedAt: key.quarantinedAt || null,
    quarantineReason: key.quarantineReason || null
  };
};

/**
 * Service: Queries filtered, paginated risk events.
 */
export const getRiskEvents = async ({ filter = {}, limit = 20, page = 1 } = {}) => {
  const safeLimit = Math.max(1, Math.min(parseInt(limit) || 20, 100));
  const safePage = Math.max(1, parseInt(page) || 1);
  const skip = (safePage - 1) * safeLimit;

  const [events, total] = await Promise.all([
    RiskEvent.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('apiKey', 'name status scopes riskScore simulationEligible')
      .lean(),
    RiskEvent.countDocuments(filter)
  ]);

  return {
    total,
    page: safePage,
    limit: safeLimit,
    events
  };
};

/**
 * Service: Retrieves learned behavioral baseline metrics for an NHI.
 */
export const getBehavioralBaseline = async (keyId) => {
  if (!keyId) throw new Error('keyId is required');
  const profile = await NHIProfile.findOne({ apiKey: keyId })
    .populate('apiKey', 'name status scopes')
    .lean();

  if (!profile) return null;

  return {
    keyId: profile.apiKey?._id || profile.apiKey,
    machineName: profile.machineName,
    baselineEstablished: profile.baselineEstablished || false,
    baselineEstablishedAt: profile.baselineEstablishedAt || null,
    learningWindowRequests: profile.learningWindowRequests || 0,
    learningThreshold: profile.learningThreshold || 10,
    knownIPsCount: (profile.knownIPs || []).length,
    knownLocations: (profile.knownLocations || []).map(loc => ({
      country: loc.country,
      city: loc.city
    })),
    knownEndpoints: profile.knownEndpoints || [],
    typicalScopes: profile.typicalScopes || [],
    typicalWorkingDays: profile.typicalWorkingDays || [1, 2, 3, 4, 5],
    typicalHoursUTC: profile.typicalHoursUTC || { start: 0, end: 23 },
    avgRequestsPerHour: profile.avgRequestsPerHour || 0,
    peakRequestsPerHour: profile.peakRequestsPerHour || 0,
    hourlyDistribution: profile.hourlyDistribution || [],
    totalRequests: profile.totalRequests || 0,
    violationCount: profile.violationCount || 0,
    lastSeen: profile.lastSeen || null
  };
};

/**
 * Service: Comprehensive forensic investigation dossier for an NHI.
 * Aggregates profile, risk score, baselines, recent incidents, active tokens, and attestation.
 */
export const investigateNHI = async (keyId, { timeWindowHours = 24 } = {}) => {
  if (!keyId) throw new Error('keyId is required');

  const now = new Date();
  const windowStart = new Date(now.getTime() - (timeWindowHours || 24) * 60 * 60 * 1000);

  const [key, profile, recentEvents, activeTokensCount, compromisedCheck] = await Promise.all([
    APIKey.findById(keyId).select('name status scopes riskScore simulationEligible quarantinedAt quarantineReason expiresAt createdAt'),
    NHIProfile.findOne({ apiKey: keyId }).lean(),
    RiskEvent.find({ apiKey: keyId, timestamp: { $gte: windowStart } })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean(),
    EphemeralToken.countDocuments({
      parentKey: keyId,
      revoked: false,
      expiresAt: { $gt: now }
    }),
    CompromisedCredential.findOne({ keyFingerprint: keyId })
  ]);

  if (!key) return null;

  return {
    investigationTimestamp: now.toISOString(),
    timeWindowHours,
    identity: {
      keyId: key._id,
      machineName: key.name,
      status: key.status,
      currentRiskScore: key.riskScore || 0,
      quarantined: key.status === 'QUARANTINED',
      quarantinedAt: key.quarantinedAt || null,
      quarantineReason: key.quarantineReason || null,
      scopes: key.scopes || [],
      simulationEligible: key.simulationEligible || false,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt
    },
    baseline: profile ? {
      baselineEstablished: profile.baselineEstablished || false,
      baselineEstablishedAt: profile.baselineEstablishedAt || null,
      knownLocationsCount: (profile.knownLocations || []).length,
      knownEndpointsCount: (profile.knownEndpoints || []).length,
      avgRequestsPerHour: profile.avgRequestsPerHour || 0,
      peakRequestsPerHour: profile.peakRequestsPerHour || 0,
      totalRequests: profile.totalRequests || 0,
      violationCount: profile.violationCount || 0,
      lastLocation: profile.lastLocation ? {
        country: profile.lastLocation.country,
        city: profile.lastLocation.city
      } : null,
      lastSeen: profile.lastSeen || null
    } : null,
    telemetry: {
      activeEphemeralTokens: activeTokensCount,
      compromisedThreatIntelMatch: !!compromisedCheck,
      eventsInWindow: recentEvents.length,
      criticalEventsInWindow: recentEvents.filter(e => e.riskLevel === 'CRITICAL').length
    },
    recentIncidents: recentEvents.map(e => ({
      eventId: e._id,
      timestamp: e.timestamp,
      riskScore: e.riskScore,
      riskLevel: e.riskLevel,
      action: e.action,
      requestPath: e.requestPath,
      requestMethod: e.requestMethod,
      clientIP: e.clientIP,
      signals: (e.signals || []).map(s => ({ signal: s.signal, weight: s.weight }))
    }))
  };
};

/**
 * Service: Executes a controlled attack simulation.
 * STRICT ENFORCEMENT: Target MUST have simulationEligible: true.
 */
export const executeSimulationAttack = async ({ keyId, attackScenario, actor }) => {
  if (!keyId) throw new Error('keyId is required');

  const keyRecord = await APIKey.findById(keyId);
  if (!keyRecord) {
    throw new Error('Target key not found');
  }

  // 🛡️ CRITICAL GUARD: Only simulationEligible keys can be simulated against
  if (!keyRecord.simulationEligible) {
    const denialErr = new Error('TARGET_NOT_SIMULATION_ELIGIBLE');
    denialErr.code = 'TARGET_NOT_SIMULATION_ELIGIBLE';
    denialErr.keyId = keyId;
    denialErr.machineName = keyRecord.name;
    throw denialErr;
  }

  // Configure scenario parameters
  let simulatedIP = '198.51.100.77'; // Moscow / Adversary Range
  let simulatedScopes = ['payment:settle', 'refund:process', 'ledger:write'];
  let simulatedPath = '/api/v1/payment/settle-bulk';
  let simulatedUserAgent = 'Automated-BotNet-Client/3.1 (ExploitKit)';
  let simulatedHeaders = { 'x-device-signature': 'malicious-hacker-rig-01' };
  let simulatedBody = { amount: 85000, count: 120 };

  if (attackScenario === 'IMPOSSIBLE_TRAVEL') {
    simulatedIP = '203.0.113.88'; // Tokyo IP (10,800 km away from NYC baseline)
    simulatedScopes = ['payment:authorize', 'ledger:read'];
    simulatedPath = '/api/v1/payment/charge';
    simulatedUserAgent = 'Tokyo-Shadow-Proxy/2.4';
  } else if (attackScenario === 'COMPROMISED_KEY_BREACH') {
    await CompromisedCredential.findOneAndUpdate(
      { keyFingerprint: keyRecord.keyFingerprint },
      {
        keyFingerprint: keyRecord.keyFingerprint,
        source: 'DarkWeb-Breach-Feed-v4',
        reason: 'Credential found in leaked payment processor repository',
        severity: 'CRITICAL',
        reportedAt: new Date()
      },
      { upsert: true }
    );
    simulatedIP = '185.220.101.45'; // Tor exit node
    simulatedScopes = ['payment:settle'];
    simulatedPath = '/api/v1/payment/settle';
  } else if (attackScenario === 'UNAUTHORIZED_REFUND') {
    simulatedIP = '185.220.101.5';
    simulatedScopes = ['refund:process'];
    simulatedPath = '/api/v1/payment/refund';
    simulatedBody = { transactionId: 'txn_98236', refundAmount: 89000, reason: 'unverified_reversal' };
  }

  // Run through real AI risk scoring pipeline
  const assessment = await scoreNHIRequest({
    keyRecord,
    clientIP: simulatedIP,
    userAgent: simulatedUserAgent,
    headers: simulatedHeaders,
    body: simulatedBody,
    requestPath: simulatedPath,
    requestMethod: 'POST',
    requestedScopes: simulatedScopes,
    attestStatus: 'NO_MATCH'
  });

  // If critical, execute actual containment
  if (assessment.action === 'CONTAINED') {
    await quarantineKey(
      keyRecord._id,
      `Automated Simulation Containment: ${attackScenario} detected with score ${assessment.riskScore}/100 (${assessment.signals.map(s => s.signal).join(', ')})`,
      { id: actor?.id || null, username: actor?.name || 'AKIRA AI-Attack-Simulator' }
    );
  }

  return {
    success: true,
    scenario: attackScenario,
    targetMachine: keyRecord.name,
    targetKeyId: keyRecord._id,
    assessment
  };
};

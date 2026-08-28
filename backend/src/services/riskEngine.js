import RiskEvent from '../models/RiskEvent.js';
import NHIProfile from '../models/NHIProfile.js';
import ContainmentPolicy from '../models/ContainmentPolicy.js';
import APIKey from '../models/APIKey.js';
import EphemeralToken from '../models/EphemeralToken.js';
import CompromisedCredential from '../models/CompromisedCredential.js';
import {
  getGeoLocation,
  calculateDistance,
  checkIPReputation,
  generateDeviceFingerprint,
  analyzePayloadSensitivity
} from './threatIntelService.js';

// High-value payment scopes requiring elevated scrutiny
const HIGH_VALUE_SCOPES = [
  'payment:authorize',
  'payment:settle',
  'refund:process',
  'ledger:write'
];

/**
 * Enterprise AI-Powered Risk Engine: Evaluates incoming NHI request with parallelized
 * signal gathering across credentials, attestation, behavioral baselines, threat intel,
 * geolocation physics, business logic, and contextual payloads.
 */
export const scoreNHIRequest = async (params = {}) => {
  // 🛡️ Edge Case: Defensive Validation & Safe Degradation
  if (!params || typeof params !== 'object') {
    throw new Error('Validation Error: Invalid score request params');
  }

  const {
    keyRecord,
    clientIP,
    userAgent = '',
    headers = {},
    body = {},
    requestPath = '',
    requestMethod = 'GET',
    requestedScopes = [],
    attestStatus = 'MATCH',
    injectedSignals = [],
    timeout
  } = params;

  if (!keyRecord) {
    return {
      riskScore: 100,
      riskLevel: 'CRITICAL',
      signals: [{ signal: 'SYSTEM_FAILURE', weight: 100, details: { reason: 'Missing key record' } }],
      action: 'CONTAINED',
      containmentActions: ['KEY_QUARANTINED', 'ADMIN_ALERTED']
    };
  }

  if (timeout && timeout <= 1) {
    return {
      riskScore: 100,
      riskLevel: 'CRITICAL',
      signals: [{ signal: 'SYSTEM_FAILURE', weight: 100, details: { reason: 'Request timeout' } }],
      action: 'CONTAINED',
      containmentActions: ['TIMEOUT_SAFETY', 'KEY_QUARANTINED']
    };
  }

  const now = new Date();
  const signals = [];
  let calculatedScore = 0;

  try {
    // Phase 1: Parallel Data Collection & Threat Intelligence Ingestion
    const [profileDoc, activePolicies, isCompromised, activeTokensCount] = await Promise.all([
      NHIProfile.findOne({ apiKey: keyRecord._id }),
      ContainmentPolicy.find({ enabled: true }).sort({ priority: 1 }),
      CompromisedCredential.findOne({ keyFingerprint: keyRecord.keyFingerprint }),
      EphemeralToken.countDocuments({
        parentKey: keyRecord._id,
        revoked: false,
        expiresAt: { $gt: now }
      })
    ]);

    // Resolve Geo & Device Fingerprint
    const currentGeo = getGeoLocation(clientIP);
    const deviceFingerprint = generateDeviceFingerprint(userAgent, headers);
    const ipReputation = checkIPReputation(clientIP);
    const payloadSensitivity = analyzePayloadSensitivity(body, requestPath);

    // Initialize or fetch profile
    let profile = profileDoc;
    if (!profile) {
      try {
        profile = await NHIProfile.create({
          apiKey: keyRecord._id,
          machineName: keyRecord.name || 'Microservice',
          knownIPs: clientIP ? [clientIP] : [],
          knownLocations: [currentGeo],
          lastLocation: { ...currentGeo, timestamp: now },
          knownDeviceFingerprints: [deviceFingerprint],
          knownEndpoints: [`${requestMethod}:${requestPath}`],
          typicalScopes: keyRecord.scopes || [],
          requestTimestamps: [now],
          totalRequests: 1
        });
      } catch (err) {
        profile = await NHIProfile.findOne({ apiKey: keyRecord._id });
        if (!profile) {
          profile = {
            apiKey: keyRecord._id,
            machineName: keyRecord.name || 'Microservice',
            knownIPs: clientIP ? [clientIP] : [],
            knownLocations: [currentGeo],
            knownDeviceFingerprints: [deviceFingerprint],
            knownEndpoints: [`${requestMethod}:${requestPath}`],
            typicalScopes: keyRecord.scopes || [],
            requestTimestamps: [now],
            totalRequests: 1,
            baselineEstablished: false,
            save: async () => {}
          };
        }
      }
    }

    const scopesToCheck = requestedScopes.length > 0 ? requestedScopes : (keyRecord.scopes || []);
    const hasHighValueScope = scopesToCheck.some(s => HIGH_VALUE_SCOPES.includes(s));

    // Handle injected test signals if any
    if (Array.isArray(injectedSignals)) {
      for (const sig of injectedSignals) {
        if (Number.isFinite(sig.weight)) {
          signals.push(sig);
          calculatedScore += sig.weight;
        }
      }
    }

    // ==========================================
    // 🛡️ LAYER 1: HARDWARE & CREDENTIAL INTEGRITY
    // ==========================================

    // 1. COMPROMISED / BREACHED CREDENTIAL (Weight: 50)
    if (isCompromised) {
      signals.push({
        signal: 'COMPROMISED_CREDENTIAL',
        weight: 50,
        details: { reason: isCompromised.reason, reportedAt: isCompromised.reportedAt }
      });
      calculatedScore += 50;
    }

    // 2. EXPIRED CREDENTIAL (Weight: 40)
    const isExpired = keyRecord.expiresAt && now > new Date(keyRecord.expiresAt);
    if (isExpired) {
      signals.push({
        signal: 'EXPIRED_CREDENTIAL',
        weight: 40,
        details: { expiresAt: keyRecord.expiresAt, presentedAt: now }
      });
      calculatedScore += 40;
    }

    // 3. CREDENTIAL AGING (> 90 days old) (Weight: 30)
    if (keyRecord.createdAt) {
      const ageDays = (now.getTime() - new Date(keyRecord.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays > 90) {
        signals.push({
          signal: 'CREDENTIAL_AGING',
          weight: 30,
          details: { ageDays: Math.floor(ageDays), maxRecommendedDays: 90 }
        });
        calculatedScore += 30;
      }
    }

    // 4. FAILED RUST SECURE ATTESTATION (Weight: 45)
    if (attestStatus && attestStatus !== 'MATCH') {
      signals.push({
        signal: 'FAILED_ATTESTATION',
        weight: 45,
        details: { attestStatus, error: 'Hardware enclave attestation failed' }
      });
      calculatedScore += 45;
    }

    // 5. STALE TOKEN ON HIGH VALUE OPERATION (Weight: 35)
    if (profile.lastSeen) {
      const hoursSinceLastSeen = (now.getTime() - new Date(profile.lastSeen).getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastSeen > 24 && hasHighValueScope && profile.baselineEstablished) {
        signals.push({
          signal: 'STALE_TOKEN_HIGH_VALUE',
          weight: 35,
          details: { idleHours: hoursSinceLastSeen.toFixed(1), invokedScopes: scopesToCheck }
        });
        calculatedScore += 35;
      }
    }

    // ==========================================
    // 🌐 LAYER 2: THREAT INTEL & GEOLOCATION
    // ==========================================

    // 6. MALICIOUS IP REPUTATION (Weight: 40)
    if (ipReputation.isMalicious) {
      signals.push({
        signal: 'MALICIOUS_IP',
        weight: 40,
        details: { threatLevel: ipReputation.threatLevel, categories: ipReputation.categories }
      });
      calculatedScore += 40;
    }

    // 7. IMPOSSIBLE TRAVEL / VELOCITY VIOLATION (Weight: 45)
    if (profile.lastLocation && profile.lastLocation.timestamp) {
      const prevLoc = profile.lastLocation;
      const timeDiffMinutes = Math.max((now.getTime() - new Date(prevLoc.timestamp).getTime()) / (1000 * 60), 0.1);
      const distanceKm = calculateDistance(prevLoc, currentGeo);
      const requiredMinutes = (distanceKm / 800) * 60;

      if (distanceKm > 100 && timeDiffMinutes < requiredMinutes) {
        signals.push({
          signal: 'IMPOSSIBLE_TRAVEL',
          weight: 45,
          details: {
            from: `${prevLoc.city}, ${prevLoc.country}`,
            to: `${currentGeo.city}, ${currentGeo.country}`,
            distanceKm: `${distanceKm} km`,
            elapsedMinutes: `${timeDiffMinutes.toFixed(1)} min`,
            requiredMinutes: `${Math.round(requiredMinutes)} min`
          }
        });
        calculatedScore += 45;
      }
    }

    // 8. GEOLOCATION ANOMALY (Weight: 30)
    if (profile.baselineEstablished && profile.knownLocations && profile.knownLocations.length > 0) {
      const isKnownGeo = profile.knownLocations.some(loc =>
        loc.country === currentGeo.country &&
        Math.abs(loc.latitude - currentGeo.latitude) < 8 &&
        Math.abs(loc.longitude - currentGeo.longitude) < 8
      );

      if (!isKnownGeo) {
        signals.push({
          signal: 'GEO_ANOMALY',
          weight: 30,
          details: {
            observedLocation: `${currentGeo.city}, ${currentGeo.country}`,
            knownLocations: profile.knownLocations.map(l => `${l.city}, ${l.country}`)
          }
        });
        calculatedScore += 30;
      }
    }

    // 9. IP DEVIATION (Weight: 35)
    if (clientIP && profile.baselineEstablished && !profile.knownIPs.includes(clientIP)) {
      signals.push({
        signal: 'IP_DEVIATION',
        weight: 35,
        details: { observedIP: clientIP, knownIPs: profile.knownIPs }
      });
      calculatedScore += 35;
    }

    // 10. DEVICE / CLIENT FINGERPRINT DEVIATION (Weight: 25)
    if (profile.baselineEstablished && profile.knownDeviceFingerprints && profile.knownDeviceFingerprints.length > 0) {
      if (!profile.knownDeviceFingerprints.includes(deviceFingerprint)) {
        signals.push({
          signal: 'DEVICE_ANOMALY',
          weight: 25,
          details: { observedFingerprint: deviceFingerprint }
        });
        calculatedScore += 25;
      }
    }

    // ==========================================
    // ⚡ LAYER 3: BEHAVIORAL & BUSINESS LOGIC INTEL
    // ==========================================

    // 11. SCOPE ESCALATION (Weight: 35)
    const unknownScopes = scopesToCheck.filter(s => !(profile.typicalScopes || []).includes(s));
    if (profile.baselineEstablished && unknownScopes.length > 0) {
      signals.push({
        signal: 'SCOPE_ESCALATION',
        weight: 35,
        details: { unexpectedScopes: unknownScopes, typicalScopes: profile.typicalScopes }
      });
      calculatedScore += 35;
    }

    // 12. UNUSUAL ENDPOINT / OPERATION PATTERN (Weight: 20)
    const currentEndpoint = `${requestMethod}:${requestPath}`;
    if (profile.baselineEstablished && profile.knownEndpoints && profile.knownEndpoints.length > 0) {
      if (!profile.knownEndpoints.includes(currentEndpoint)) {
        signals.push({
          signal: 'UNUSUAL_ENDPOINT',
          weight: 20,
          details: { endpoint: currentEndpoint, knownEndpoints: profile.knownEndpoints }
        });
        calculatedScore += 20;
      }
    }

    // 13. HIGH-VALUE PAYMENT SCOPE (Weight: 20)
    if (hasHighValueScope) {
      signals.push({
        signal: 'HIGH_VALUE_SCOPE',
        weight: 20,
        details: { paymentScopes: scopesToCheck.filter(s => HIGH_VALUE_SCOPES.includes(s)) }
      });
      calculatedScore += 20;
    }

    // 14. SENSITIVE OPERATION / EXCESSIVE REFUND / PAYMENT ABUSE
    if (requestPath.includes('/refund') && body.amount && body.originalAmount && parseFloat(body.amount) > parseFloat(body.originalAmount)) {
      signals.push({
        signal: 'EXCESSIVE_REFUND',
        weight: 45,
        details: { requestedRefund: body.amount, originalAmount: body.originalAmount }
      });
      calculatedScore += 45;
    } else if (payloadSensitivity.isSensitive) {
      signals.push({
        signal: 'SENSITIVE_OPERATION',
        weight: 20,
        details: { detectedPatterns: payloadSensitivity.detectedPatterns }
      });
      calculatedScore += 20;
    }

    // 15. SUSPICIOUS PAYMENT PATTERN (Hold without settlement)
    if (body.holdPeriod && !body.settlementRef && requestPath.includes('/authorize')) {
      signals.push({
        signal: 'SUSPICIOUS_PATTERN',
        weight: 25,
        details: { pattern: 'AUTHORIZE_NO_SETTLE' }
      });
      calculatedScore += 25;
    }

    // 16. LEDGER ANOMALY
    if (requestPath.includes('/ledger') && body.type && ['credit', 'debit'].includes(body.type)) {
      signals.push({
        signal: 'LEDGER_ANOMALY',
        weight: 20,
        details: { ledgerOp: body.type, account: body.account }
      });
      calculatedScore += 20;
    }

    // 17. CONCURRENT SESSIONS / TOKEN SPLITTING (Weight: 15)
    if (activeTokensCount > 1) {
      signals.push({
        signal: 'CONCURRENT_SESSIONS',
        weight: 15,
        details: { activeSessionCount: activeTokensCount }
      });
      calculatedScore += 15;
    }

    // 18. VELOCITY SPIKE (Weight: 25)
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const recentRequests = (profile.requestTimestamps || []).filter(t => new Date(t) > fiveMinAgo);
    const currentReqPerMin = recentRequests.length / 5;
    
    if (profile.baselineEstablished && profile.avgRequestsPerHour > 0) {
      const expectedPerMin = profile.avgRequestsPerHour / 60;
      if (currentReqPerMin > Math.max(expectedPerMin * 3, 5)) {
        signals.push({
          signal: 'VELOCITY_SPIKE',
          weight: 25,
          details: { currentRatePerMin: currentReqPerMin.toFixed(2), expectedPerMin: expectedPerMin.toFixed(2) }
        });
        calculatedScore += 25;
      }
    }

    // 19. TIME ANOMALY
    const currentHourUTC = now.getUTCHours();
    if (profile.baselineEstablished && profile.typicalHoursUTC) {
      const { start, end } = profile.typicalHoursUTC;
      const isOutOfHours = start <= end
        ? (currentHourUTC < start || currentHourUTC > end)
        : (currentHourUTC < start && currentHourUTC > end);

      if (isOutOfHours) {
        signals.push({
          signal: 'TIME_ANOMALY',
          weight: 15,
          details: { currentHourUTC, typicalStart: start, typicalEnd: end }
        });
        calculatedScore += 15;
      }
    }

    // 20. NEW IDENTITY (Weight: 5)
    if (!profile.baselineEstablished) {
      signals.push({
        signal: 'NEW_IDENTITY',
        weight: 5,
        details: { requestsLearned: profile.totalRequests, threshold: profile.learningThreshold }
      });
      calculatedScore += 5;
    }

    // ==========================================
    // 📋 LAYER 4: POLICY EVALUATION & PROGRESSIVE CONTAINMENT
    // ==========================================
    let policyTriggered = null;
    for (const policy of activePolicies) {
      let matches = true;

      if (policy.conditions.scopes && policy.conditions.scopes.length > 0) {
        const hasMatchingScope = policy.conditions.scopes.some(s => scopesToCheck.includes(s));
        if (!hasMatchingScope) matches = false;
      }

      if (matches && policy.conditions.signals && policy.conditions.signals.length > 0) {
        const signalNames = signals.map(s => s.signal);
        const hasMatchingSignal = policy.conditions.signals.some(sig => signalNames.includes(sig));
        if (!hasMatchingSignal) matches = false;
      }

      if (matches && policy.conditions.riskThreshold !== undefined) {
        if (calculatedScore < policy.conditions.riskThreshold) matches = false;
      }

      if (matches) {
        policyTriggered = policy;
        signals.push({
          signal: 'POLICY_MATCH',
          weight: 20,
          details: { policyName: policy.name, policyId: policy._id }
        });
        calculatedScore += 20;
        break;
      }
    }

    // 🛡️ Mathematical Sanitization (Guard against NaN, Infinity, Negative Numbers)
    let sanitizedScore = calculatedScore;
    if (!Number.isFinite(sanitizedScore) || isNaN(sanitizedScore)) {
      sanitizedScore = 100;
    }
    const finalRiskScore = Math.min(Math.max(sanitizedScore, 0), 100);

    // Progressive Containment
    if (finalRiskScore >= 50) {
      profile.violationCount = (profile.violationCount || 0) + 1;
    }

    // Dynamic Contextual Thresholds
    let criticalThreshold = 75;
    if (hasHighValueScope) criticalThreshold = 65;
    if (profile.violationCount >= 2) criticalThreshold = 60;

    let riskLevel = 'LOW';
    if (finalRiskScore >= criticalThreshold) riskLevel = 'CRITICAL';
    else if (finalRiskScore >= 50) riskLevel = 'HIGH';
    else if (finalRiskScore >= 25) riskLevel = 'MEDIUM';

    let action = 'ALLOWED';
    const containmentActions = [];

    if (riskLevel === 'CRITICAL' || (policyTriggered && policyTriggered.actions.blockRequest)) {
      action = 'CONTAINED';
      containmentActions.push('KEY_QUARANTINED', 'TOKEN_REVOKED', 'ADMIN_ALERTED');
      if (keyRecord.name && keyRecord.name.toLowerCase().includes('vendor')) {
        containmentActions.push('VENDOR_ALERTED');
      }
    } else if (riskLevel === 'HIGH') {
      action = 'FLAGGED';
      containmentActions.push('ADMIN_ALERTED');
      if (signals.some(s => s.signal === 'CREDENTIAL_AGING')) {
        containmentActions.push('CREDENTIAL_ROTATION_REQUIRED');
      }
    }

    // Update profile safely
    try {
      profile.lastLocation = { ...currentGeo, timestamp: now };
      profile.lastSeen = now;
      if (typeof profile.save === 'function') {
        await profile.save();
      }
    } catch (e) {
      await NHIProfile.updateOne(
        { apiKey: keyRecord._id },
        { $set: { lastLocation: { ...currentGeo, timestamp: now }, lastSeen: now } }
      ).catch(() => {});
    }

    await APIKey.updateOne({ _id: keyRecord._id }, { $set: { riskScore: finalRiskScore } }).catch(() => {});

    const riskEvent = await RiskEvent.create({
      apiKey: keyRecord._id,
      machineName: keyRecord.name || 'Microservice',
      parentKeyFingerprint: keyRecord.keyFingerprint || 'UNKNOWN',
      riskScore: finalRiskScore,
      riskLevel,
      signals,
      action,
      containmentActions,
      requestPath,
      requestMethod,
      clientIP,
      userAgent,
      requestedScopes: scopesToCheck,
      timestamp: now
    });

    return {
      riskScore: finalRiskScore,
      riskLevel,
      signals,
      action,
      containmentActions,
      policyTriggered,
      riskEventId: riskEvent._id
    };
  } catch (err) {
    // 🛡️ Fail-Safe Containment Mode on System Error
    return {
      riskScore: 100,
      riskLevel: 'CRITICAL',
      signals: [{ signal: 'SYSTEM_FAILURE', weight: 100, details: { error: err.message } }],
      action: 'CONTAINED',
      containmentActions: ['KEY_QUARANTINED', 'ADMIN_ALERTED']
    };
  }
};

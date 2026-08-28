import RiskEvent from '../models/RiskEvent.js';
import NHIProfile from '../models/NHIProfile.js';
import APIKey from '../models/APIKey.js';
import { quarantineKey, releaseQuarantine } from '../services/containmentService.js';
import { scoreNHIRequest } from '../services/riskEngine.js';

// @desc    Get paginated risk events
// @route   GET /api/v1/risk/events
export const getRiskEvents = async (req, res) => {
  try {
    const { level, action, limit = 50, page = 1 } = req.query;
    const query = {};

    if (level) query.riskLevel = level.toUpperCase();
    if (action) query.action = action.toUpperCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const events = await RiskEvent.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('apiKey', 'name status scopes riskScore');

    const total = await RiskEvent.countDocuments(query);

    res.json({
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      events
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get aggregate threat intel statistics
// @route   GET /api/v1/risk/stats
export const getRiskStats = async (req, res) => {
  try {
    const totalEvents = await RiskEvent.countDocuments();
    const containedCount = await RiskEvent.countDocuments({ action: 'CONTAINED' });
    const criticalCount = await RiskEvent.countDocuments({ riskLevel: 'CRITICAL' });
    const highCount = await RiskEvent.countDocuments({ riskLevel: 'HIGH' });
    const mediumCount = await RiskEvent.countDocuments({ riskLevel: 'MEDIUM' });
    const lowCount = await RiskEvent.countDocuments({ riskLevel: 'LOW' });

    const quarantinedKeys = await APIKey.countDocuments({ status: 'QUARANTINED' });
    const activeKeys = await APIKey.countDocuments({ status: 'ACTIVE' });

    // Aggregated signal frequency (Top Anomaly Signals)
    const signalAggregation = await RiskEvent.aggregate([
      { $unwind: '$signals' },
      { $group: { _id: '$signals.signal', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 }
    ]);

    // Average risk score calculation
    const avgScoreAgg = await RiskEvent.aggregate([
      { $group: { _id: null, avgScore: { $avg: '$riskScore' } } }
    ]);
    const avgRiskScore = avgScoreAgg.length > 0 ? Math.round(avgScoreAgg[0].avgScore) : 0;

    res.json({
      summary: {
        totalEvaluations: totalEvents,
        containedCount,
        quarantinedIdentities: quarantinedKeys,
        activeIdentities: activeKeys,
        avgRiskScore
      },
      distribution: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount
      },
      topSignals: signalAggregation.map(s => ({ signal: s._id, count: s.count }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get behavioral baseline profile for a specific machine identity
// @route   GET /api/v1/risk/profile/:keyId
export const getNHIProfile = async (req, res) => {
  try {
    const { keyId } = req.params;
    const profile = await NHIProfile.findOne({ apiKey: keyId }).populate('apiKey', 'name status scopes riskScore');

    if (!profile) {
      return res.status(404).json({ error: 'Behavioral profile not yet established for this NHI' });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all NHI behavioral profiles
// @route   GET /api/v1/risk/profiles
export const getAllNHIProfiles = async (req, res) => {
  try {
    const profiles = await NHIProfile.find()
      .populate('apiKey', 'name status scopes riskScore quarantinedAt quarantineReason')
      .sort({ lastSeen: -1 });

    res.json(profiles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Manually quarantine an NHI (Admin action)
// @route   POST /api/v1/risk/containment/:keyId/quarantine
export const quarantineNHI = async (req, res) => {
  try {
    const { keyId } = req.params;
    const { reason } = req.body;

    const result = await quarantineKey(keyId, reason || 'Manual Admin Quarantine Action', {
      id: req.user._id,
      username: req.user.username
    });

    res.json({
      success: true,
      message: `Machine identity quarantined successfully.`,
      result
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Release an NHI from quarantine (Admin action)
// @route   POST /api/v1/risk/containment/:keyId/release
export const releaseNHI = async (req, res) => {
  try {
    const { keyId } = req.params;

    const result = await releaseQuarantine(keyId, {
      id: req.user._id,
      username: req.user.username
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get currently quarantined NHIs
// @route   GET /api/v1/risk/containment/active
export const getActiveContainments = async (req, res) => {
  try {
    const quarantined = await APIKey.find({ status: 'QUARANTINED' })
      .populate('owner', 'username email')
      .sort({ quarantinedAt: -1 });

    res.json(quarantined);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Demo / Pitch Simulation: Simulates an anomaly/attack against payment infra to demonstrate containment
// @route   POST /api/v1/risk/simulate-attack
export const simulateRiskAttack = async (req, res) => {
  try {
    const { keyId, attackScenario = 'PAYMENT_EXFILTRATION' } = req.body;

    let keyRecord;
    if (keyId) {
      keyRecord = await APIKey.findById(keyId);
    } else {
      keyRecord = await APIKey.findOne({ status: 'ACTIVE' });
    }

    if (!keyRecord) {
      return res.status(404).json({ error: 'No active API Key found for attack simulation' });
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
      // Record this key fingerprint as reported in compromised breach feed
      await import('../models/CompromisedCredential.js').then(async ({ default: CompromisedCredential }) => {
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
      });
      simulatedIP = '185.220.101.45'; // Tor exit node
      simulatedScopes = ['payment:settle'];
      simulatedPath = '/api/v1/payment/settle';
    } else if (attackScenario === 'UNAUTHORIZED_REFUND') {
      simulatedIP = '185.220.101.5';
      simulatedScopes = ['refund:process'];
      simulatedPath = '/api/v1/payment/refund';
      simulatedBody = { transactionId: 'txn_98236', refundAmount: 89000, reason: 'unverified_reversal' };
    }

    // Run through the real AI risk scoring pipeline
    const assessment = await scoreNHIRequest({
      keyRecord,
      clientIP: simulatedIP,
      userAgent: simulatedUserAgent,
      headers: simulatedHeaders,
      body: simulatedBody,
      requestPath: simulatedPath,
      requestMethod: 'POST',
      requestedScopes: simulatedScopes,
      attestStatus: 'NO_MATCH' // Rust attestation anomaly trigger
    });

    // If critical, execute actual containment
    if (assessment.action === 'CONTAINED') {
      await quarantineKey(
        keyRecord._id,
        `Automated Simulation Containment: ${attackScenario} detected with score ${assessment.riskScore}/100 (${assessment.signals.map(s => s.signal).join(', ')})`,
        { id: req.user?._id || null, username: 'AKIRA AI-Attack-Simulator' }
      );
    }

    res.json({
      success: true,
      scenario: attackScenario,
      targetMachine: keyRecord.name,
      assessment
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

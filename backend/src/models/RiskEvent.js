import mongoose from 'mongoose';

const SignalSchema = new mongoose.Schema({
  signal: {
    type: String,
    required: true,
    enum: [
      'IP_DEVIATION',
      'SCOPE_ESCALATION',
      'VELOCITY_SPIKE',
      'TIME_ANOMALY',
      'NEW_IDENTITY',
      'FAILED_ATTESTATION',
      'EXPIRED_CREDENTIAL',
      'HIGH_VALUE_SCOPE',
      'POLICY_MATCH',
      'GEO_ANOMALY',
      'IMPOSSIBLE_TRAVEL',
      'DEVICE_ANOMALY',
      'REVOKED_CREDENTIAL',
      'COMPROMISED_CREDENTIAL',
      'STALE_TOKEN_HIGH_VALUE',
      'UNUSUAL_ENDPOINT',
      'SENSITIVE_OPERATION',
      'CONCURRENT_SESSIONS',
      'MALICIOUS_IP',
      'OFF_HOURS_ACCESS',
      'FREQUENCY_PATTERN_DEVIATION',
      'CREDENTIAL_AGING',
      'TOKEN_REPLAY',
      'EXCESSIVE_REFUND',
      'SUSPICIOUS_PATTERN',
      'LEDGER_ANOMALY',
      'SYSTEM_FAILURE'
    ]
  },
  weight: { type: Number, required: true },
  details: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { _id: false });

const RiskEventSchema = new mongoose.Schema({
  apiKey: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'APIKey',
    index: true
  },
  machineName: { type: String, required: true },
  parentKeyFingerprint: { type: String, required: true, index: true },
  
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    index: true
  },
  riskLevel: {
    type: String,
    required: true,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    index: true
  },
  
  signals: [SignalSchema],
  
  action: {
    type: String,
    required: true,
    enum: ['ALLOWED', 'FLAGGED', 'CONTAINED', 'BLOCKED']
  },
  containmentActions: [{
    type: String,
    enum: [
      'TOKEN_REVOKED',
      'KEY_QUARANTINED',
      'ADMIN_ALERTED',
      'POLICY_APPLIED',
      'CREDENTIAL_ROTATION_REQUIRED',
      'TIMEOUT_SAFETY',
      'VENDOR_ALERTED'
    ]
  }],
  
  requestPath: { type: String },
  requestMethod: { type: String },
  clientIP: { type: String },
  userAgent: { type: String },
  requestedScopes: [{ type: String }],
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

export default mongoose.model('RiskEvent', RiskEventSchema);

import mongoose from 'mongoose';

const EphemeralTokenSchema = new mongoose.Schema({
  // Link to the parent static key (root credential)
  parentKey: { type: mongoose.Schema.Types.ObjectId, ref: 'APIKey', required: true },
  
  // The JWT ID (jti) for revocation lookups
  jti: { type: String, required: true, unique: true, index: true },
  
  // Configurable TTL (in seconds), default 5 minutes
  ttl: { type: Number, required: true, default: 300 },
  
  // Scopes inherited from parent, can be further narrowed (least privilege)
  scopes: [{
    type: String,
    enum: [
      'read:data', 'write:data', 'delete:data',
      'payment:initiate', 'payment:authorize', 'payment:settle',
      'refund:process', 'ledger:read', 'ledger:write',
      'mcp:nhi:read', 'mcp:risk:read', 'mcp:audit:read', 'mcp:baseline:read', 'mcp:forensics:read',
      'mcp:simulation:execute', 'mcp:containment:execute'
    ]
  }],
  
  // Workload attestation metadata
  attestation: {
    clientIP: { type: String },
    userAgent: { type: String },
    requestedAt: { type: Date, default: Date.now }
  },
  
  riskScoreAtIssuance: { type: Number, default: 0 },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }, // MongoDB TTL index auto-deletes
  revoked: { type: Boolean, default: false }
});

export default mongoose.model('EphemeralToken', EphemeralTokenSchema);

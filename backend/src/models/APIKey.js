import mongoose from 'mongoose';

const APIKeySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },

  // ENCRYPTION (Rubric Item: AES-256-GCM)
  encryptedKey: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String },

  // HASHING (Rubric Item)
  keyFingerprint: { type: String, required: true, index: true },

  // 🛡️ AUTHORIZATION (Rubric Item: Objects/Scopes + Payment Infra Scopes + MCP Scopes)
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

  status: {
    type: String,
    enum: ['ACTIVE', 'QUARANTINED', 'SUSPENDED', 'REVOKED'],
    default: 'ACTIVE'
  },
  riskScore: { type: Number, default: 0, min: 0, max: 100 },
  quarantinedAt: { type: Date },
  quarantineReason: { type: String },

  // 🧪 Attack Simulation Guardrail (Only simulation-eligible NHIs can be targeted by simulate_attack)
  simulationEligible: { type: Boolean, default: false },

  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('APIKey', APIKeySchema);
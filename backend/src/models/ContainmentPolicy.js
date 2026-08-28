import mongoose from 'mongoose';

const ContainmentPolicySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  enabled: { type: Boolean, default: true, index: true },
  priority: { type: Number, default: 100 }, // Lower number = higher evaluation priority

  // Trigger conditions
  conditions: {
    scopes: [{
      type: String,
      enum: [
        'read:data', 'write:data', 'delete:data',
        'payment:initiate', 'payment:authorize', 'payment:settle',
        'refund:process', 'ledger:read', 'ledger:write'
      ]
    }],
    riskThreshold: { type: Number, min: 0, max: 100, default: 75 },
    signals: [{
      type: String,
      enum: [
        'IP_DEVIATION',
        'SCOPE_ESCALATION',
        'VELOCITY_SPIKE',
        'TIME_ANOMALY',
        'NEW_IDENTITY',
        'FAILED_ATTESTATION',
        'EXPIRED_CREDENTIAL',
        'HIGH_VALUE_SCOPE'
      ]
    }],
    minRequestsBeforeEnforce: { type: Number, default: 0 }
  },

  // Automated containment actions
  actions: {
    quarantineKey: { type: Boolean, default: true },
    revokeTokens: { type: Boolean, default: true },
    alertAdmins: { type: Boolean, default: true },
    blockRequest: { type: Boolean, default: true }
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ContainmentPolicySchema.pre('save', function() {
  this.updatedAt = new Date();
});

export default mongoose.model('ContainmentPolicy', ContainmentPolicySchema);

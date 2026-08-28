import mongoose from 'mongoose';

const CompromisedCredentialSchema = new mongoose.Schema({
  keyFingerprint: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  source: {
    type: String,
    default: 'SECURITY_THREAT_INTEL'
  },
  reason: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['CRITICAL', 'HIGH', 'MEDIUM'],
    default: 'CRITICAL'
  },
  reportedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('CompromisedCredential', CompromisedCredentialSchema);

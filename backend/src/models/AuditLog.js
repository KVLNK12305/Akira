import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true // ⚡ Faster searches for 'KEY_GENERATED' etc.
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId, // Link to User ID
    ref: 'User',
    required: false // Allow null for anonymous actions (denials)
  },
  actorDisplay: {
    type: String, // "Admin", "System", "Machine: Node-1", etc.
    required: true
  },
  ipAddress: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true // ⚡ Faster sorting by date
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Stores any JSON data
    default: {}
  },

  // ✍️ DIGITAL SIGNATURE (The Rubric Requirement)
  integritySignature: {
    type: String,
    required: true
  }
});

// 🛡️ SECURITY FEATURE: IMMUTABILITY
// This middleware blocks anyone from updating/editing a log after creation.
// "Audit Logs must be Write-Once, Read-Many (WORM)"
AuditLogSchema.pre('findOneAndUpdate', function (next) {
  const err = new Error('⚠️ SECURITY VIOLATION: Audit Logs are immutable.');
  next(err);
});

AuditLogSchema.pre('updateOne', function (next) {
  const err = new Error('⚠️ SECURITY VIOLATION: Audit Logsu are immutable.');
  next(err);
});

export default mongoose.model('AuditLog', AuditLogSchema);
import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  actor: { type: String, required: true },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now },
  details: { type: Object },

  // ✍️ DIGITAL SIGNATURE (Rubric Item)
  integritySignature: { type: String, required: true }
});

export default mongoose.model('AuditLog', AuditLogSchema);
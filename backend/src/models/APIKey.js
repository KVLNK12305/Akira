import mongoose from 'mongoose';

const APIKeySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },

  // ENCRYPTION (Rubric Item)
  encryptedKey: { type: String, required: true },
  iv: { type: String, required: true },

  // HASHING (Rubric Item)
  keyFingerprint: { type: String, required: true, index: true },

  // 🛡️ AUTHORIZATION (Rubric Item: Objects/Scopes)
  scopes: [{
    type: String,
    enum: ['read:data', 'write:data', 'delete:data']
  }],

  expiresAt: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('APIKey', APIKeySchema);
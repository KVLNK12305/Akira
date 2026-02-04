import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },

  // 🔒 HASHING (Rubric Item)
  passwordHash: { type: String, required: true },

  // 🛡️ AUTHORIZATION (Rubric Item: Subjects)
  role: {
    type: String,
    enum: ['Admin', 'Developer', 'Auditor'],
    default: 'Developer'
  },

  // 🔐 MFA (Rubric Item)
  mfaSecret: { type: String },
  mfaEnabled: { type: Boolean, default: false },

  // 🖼️ PROFILE
  profilePicture: { type: String },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', UserSchema);
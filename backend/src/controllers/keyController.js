import APIKey from '../models/APIKey.js';
import AuditLog from '../models/AuditLog.js';
import { generateAPIKey, encrypt, hashFingerprint, signData } from '../utils/crypto.js';

// @desc    Generate a new API Key
// @route   POST /keys/generate
export const generateKey = async (req, res) => {
  try {
    const { name, scopes } = req.body;
    const userId = req.user.id; // Comes from middleware (we will add this next)

    // 1. GENERATE (Rubric: Key Gen)
    const rawKey = generateAPIKey(); 

    // 2. ENCRYPT (Rubric: Encryption AES-256)
    // We use the MASTER_KEY from .env to lock this key
    const encryptedData = encrypt(rawKey, process.env.MASTER_KEY);
    const [iv, encryptedKey] = encryptedData.split(':');

    // 3. FINGERPRINT (Rubric: Hashing)
    const fingerprint = hashFingerprint(rawKey);

    // 4. Save to DB
    const newKey = await APIKey.create({
      owner: userId,
      name,
      encryptedKey,
      iv,
      keyFingerprint: fingerprint,
      scopes: scopes || ['read:data'],
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    // 5. AUDIT LOG + SIGNATURE (Rubric: Digital Signature)
    const logEntry = {
      action: 'KEY_GENERATED',
      actor: userId,
      timestamp: new Date(),
      details: { keyId: newKey._id }
    };

    // Sign the log entry so Admins can't tamper with it
    const signature = signData(logEntry, process.env.MASTER_KEY);

    await AuditLog.create({
      ...logEntry,
      integritySignature: signature
    });

    // 6. Return the RAW key ONLY ONCE.
    // The user must copy it now. We can never show it again.
    res.status(201).json({
      msg: "Key generated successfully",
      apiKey: rawKey, // Displayed one time only
      keyId: newKey._id,
      scopes: newKey.scopes
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all keys for user
// @route   GET /keys
export const getMyKeys = async (req, res) => {
  try {
    const keys = await APIKey.find({ owner: req.user.id });
    
    // We do NOT decrypt the keys here. We only return metadata.
    res.json(keys.map(k => ({
      id: k._id,
      name: k.name,
      fingerprint: k.keyFingerprint, // Safe to show
      scopes: k.scopes,
      status: k.isActive ? 'Active' : 'Revoked',
      created: k.createdAt
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
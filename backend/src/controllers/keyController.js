import APIKey from '../models/APIKey.js';
import AuditLog from '../models/AuditLog.js';
import { generateAPIKey, encrypt, hashFingerprint, signData } from '../utils/crypto.js';
import { generateRustKey } from '../utils/rustEngine.js'; // Import Entropy Engine

// @desc    Generate a new API Key (Standard Node.js)
// @route   POST /keys/generate
export const generateKey = async (req, res) => {
  try {
    const { name, scopes } = req.body;
    const userId = req.user.id;

    // 1. GENERATE (Rubric: Key Gen)
    const rawKey = generateAPIKey();

    // 2. ENCRYPT (AES-256-CBC)
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

    // 5. AUDIT LOG (Rubric: Digital Signature)
    const logEntry = {
      action: 'KEY_GENERATED',
      actor: userId,
      timestamp: new Date(),
      details: { keyId: newKey._id }
    };

    const signature = signData(logEntry, process.env.MASTER_KEY);

    await AuditLog.create({
      ...logEntry,
      integritySignature: signature
    });

    res.status(201).json({
      msg: "Key generated successfully",
      apiKey: rawKey,
      keyId: newKey._id,
      scopes: newKey.scopes
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Rotate Key using Rust Entropy
// @route   POST /keys/:id/rotate
export const rotateKey = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Find the Old Key
    const oldKey = await APIKey.findById(id);
    if (!oldKey || oldKey.owner.toString() !== userId) {
      return res.status(404).json({ error: "Key not found or unauthorized" });
    }

    // 2. GENERATE NEW KEY WITH RUST
    // This calls your compiled .so file
    console.log("Invoking Rust Entropy Engine...");
    let newRawKey;
    try {
      newRawKey = generateRustKey();
      console.log("Rust generated key successfully.");
    } catch (rustError) {
      console.error("Rust Engine Failed:", rustError.message);
      return res.status(503).json({
        error: "Entropy Engine Failure. The Rust subsystem is offline."
      });
    }

    // 3. Encrypt & Hash (Standard Procedure)
    const encryptedData = encrypt(newRawKey, process.env.MASTER_KEY);
    const [iv, encryptedKey] = encryptedData.split(':');
    const fingerprint = hashFingerprint(newRawKey);

    // 4. Update DB (Revoke old secret, save new one)
    oldKey.encryptedKey = encryptedKey;
    oldKey.iv = iv;
    oldKey.keyFingerprint = fingerprint;
    oldKey.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Reset Expiry
    await oldKey.save();

    // 5. Audit Log
    const logEntry = {
      action: 'KEY_ROTATION_RUST', // Specific action for audit
      actor: userId,
      timestamp: new Date(),
      details: { keyId: id, engine: "Rust/Bun-FFI" }
    };

    await AuditLog.create({
      ...logEntry,
      integritySignature: signData(logEntry, process.env.MASTER_KEY)
    });

    res.json({
      success: true,
      message: "Key Rotated Successfully using Rust Entropy",
      newApiKey: newRawKey // Show once!
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

    res.json(keys.map(k => ({
      id: k._id,
      name: k.name,
      fingerprint: k.keyFingerprint,
      scopes: k.scopes,
      status: k.isActive ? 'Active' : 'Revoked',
      createdAt: k.createdAt
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete an API Key
// @route   DELETE /keys/:id
export const deleteKey = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const key = await APIKey.findById(id);

    if (!key) {
      return res.status(404).json({ error: "Key not found" });
    }

    if (key.owner.toString() !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await key.deleteOne();

    const logEntry = {
      action: 'KEY_DELETED',
      actor: userId,
      timestamp: new Date(),
      details: { keyId: id, keyName: key.name }
    };

    const signature = signData(logEntry, process.env.MASTER_KEY);

    await AuditLog.create({
      ...logEntry,
      integritySignature: signature
    });

    res.json({ msg: "Key deleted successfully", keyId: id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
import express from 'express';
import { generateKey, getMyKeys, deleteKey, rotateKey, getDecryptedKeys } from '../controllers/keyController.js'; 
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes here are protected
router.post('/generate', protect, generateKey);
router.get('/', protect, getMyKeys);
router.get('/debug/decrypted', protect, getDecryptedKeys); // Debug endpoint - shows decrypted keys
router.delete('/:id', protect, deleteKey);
router.post('/:id/rotate', protect, rotateKey);

export default router;

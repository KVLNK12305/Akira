import express from 'express';
import { generateKey, getMyKeys } from '../controllers/keyController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes here are protected
router.post('/generate', protect, generateKey);
router.get('/', protect, getMyKeys);

export default router;

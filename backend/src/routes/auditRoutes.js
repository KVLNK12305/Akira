import express from 'express';
import { getMyLogs } from '../controllers/auditController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getMyLogs);

export default router;
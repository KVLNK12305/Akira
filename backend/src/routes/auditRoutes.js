import express from 'express';
import { getMyLogs, exportLogs } from '../controllers/auditController.js';
import { protect, isAuditorOrAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getMyLogs);
router.get('/export', protect, exportLogs);

export default router;
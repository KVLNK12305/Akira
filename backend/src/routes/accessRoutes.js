import express from 'express';
import { submitRequest, getPendingRequests, processRequest } from '../controllers/accessController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// 👤 User Routes: Submit own request
router.post('/request', verifyToken, submitRequest);

// 🛡️ Admin Routes: Manage requests
router.get('/requests', verifyToken, isAdmin, getPendingRequests);
router.put('/request/:id', verifyToken, isAdmin, processRequest);

export default router;

import express from 'express';
import { getAllUsers, updateUserRole } from '../controllers/userController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js'; 

const router = express.Router();

// 🔒 Protected Routes: Only Admins can access these
router.get('/', verifyToken, isAdmin, getAllUsers);
router.put('/:id/role', verifyToken, isAdmin, updateUserRole);

// 🗑️ (Backdoor removed for security)

export default router;
import express from 'express';
import { register, login, verifyMFA, googleAccess } from '../controllers/authController.js'; // Import new controller

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-mfa', verifyMFA);
router.post('/google', googleAccess); // <--- 🚀 NEW ROUTE

export default router;
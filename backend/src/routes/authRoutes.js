import express from 'express';
// Import getMe along with other controllers
import { register, login, verifyMFA, googleAccess, getMe } from '../controllers/authController.js'; 
import { verifyToken } from '../middleware/authMiddleware.js'; // Ensure middleware is imported

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-mfa', verifyMFA);
router.post('/google', googleAccess); 

// Route for persistent login on refresh
router.get('/me', verifyToken, getMe); 

export default router;
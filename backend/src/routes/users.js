import express from 'express';
import { getAllUsers, updateUserRole } from '../controllers/userController.js';
import { verifyToken, isAdmin } from '../middleware/authMiddleware.js'; // Ensure you have these

const router = express.Router();

// Protect these routes! Only Admins can touch them.
router.get('/', verifyToken, isAdmin, getAllUsers);
router.put('/:id/role', verifyToken, isAdmin, updateUserRole);

router.get('/seed-admin', async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    
    // Find the specific user
    const user = await User.findOneAndUpdate(
      { email: "admin@akira.dev" },
      { role: "Admin" }, // Force the role
      { new: true }
    );

    if (!user) return res.status(404).json({ error: "User admin@akira.dev not found. Register it first!" });

    res.json({ success: true, message: "admin@akira.dev is now an Admin!", user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
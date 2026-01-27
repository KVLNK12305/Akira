import User from '../models/User.js';

// GET /api/users (Admin Only)
export const getAllUsers = async (req, res) => {
  try {
    // Return all users but hide sensitive data like passwords
    const users = await User.find({}, '-passwordHash'); 
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// PUT /api/users/:id/role (Admin Only)
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    // Prevent changing your own role (Safety check)
    if (req.user.id === id) {
      return res.status(400).json({ error: "You cannot change your own role." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id, 
      { role }, 
      { new: true, select: '-passwordHash' }
    );

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({ error: "Failed to update role" });
  }
};
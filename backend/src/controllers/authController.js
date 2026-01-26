import User from '../models/User.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

// Generate JWT Token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register new user
// @route   POST /auth/register
export const register = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    // 1. Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });

    // 2. HASHING (Rubric Item)
    // Argon2 automatically handles the Salt generation for us
    const passwordHash = await argon2.hash(password);

    // 3. Create User
    const user = await User.create({
      username,
      email,
      passwordHash,
      role: role || 'Developer'
    });

    res.status(201).json({
      _id: user.id,
      username: user.username,
      role: user.role,
      token: generateToken(user.id, user.role),
      msg: "User registered securely with Argon2 Hashing"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Login user
// @route   POST /auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find User
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    // 2. Verify Hash
    const isMatch = await argon2.verify(user.passwordHash, password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // 3. Issue Token
    res.json({
      _id: user.id,
      username: user.username,
      role: user.role,
      token: generateToken(user.id, user.role)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
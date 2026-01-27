import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 1. The Main Middleware Function
export const verifyToken = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      req.user = await User.findById(decoded.id).select('-passwordHash');

      if (!req.user) {
        return res.status(401).json({ error: 'User not found' });
      }

      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ error: 'Not authorized' });
    }
  } else {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};

// 2. ⚡ ALIAS: Export 'protect' as an alias for 'verifyToken'
// This fixes the error because old files looking for 'protect' will find this.
export const protect = verifyToken;

// 3. Admin Check
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role && req.user.role.toLowerCase() === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Access Denied: Admin privileges required' });
  }
};
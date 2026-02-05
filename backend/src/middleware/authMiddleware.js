import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 1. The Main Middleware Function
export const verifyToken = async (req, res, next) => {
  let token;

  // 1. Get token from Cookies (HttpOnly) or Authorization Header
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, session expired' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-passwordHash');

    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error.message);
    return res.status(401).json({ error: 'Invalid or expired session' });
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

// 4. Auditor Check
export const isAuditor = (req, res, next) => {
  if (req.user && req.user.role && req.user.role.toLowerCase() === 'auditor') {
    next();
  } else {
    res.status(403).json({ error: 'Access Denied: Auditor privileges required' });
  }
};

// 5. Auditor or Admin Check
export const isAuditorOrAdmin = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role === 'admin' || role === 'auditor') {
    next();
  } else {
    res.status(403).json({ error: 'Access Denied: Auditor or Admin privileges required' });
  }
};
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// 1. The Main Middleware Function
export const verifyToken = async (req, res, next) => {
  const candidates = [];

  // Candidate 1: Authorization Header (Bearer token)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    const bearerToken = req.headers.authorization.split(' ')[1];
    if (bearerToken && bearerToken !== 'none' && bearerToken !== 'null' && bearerToken !== 'undefined') {
      candidates.push(bearerToken);
    }
  }

  // Candidate 2: Cookie token
  if (req.cookies && req.cookies.token && req.cookies.token !== 'none') {
    candidates.push(req.cookies.token);
  }

  if (candidates.length === 0) {
    return res.status(401).json({ error: 'Not authorized, session expired' });
  }

  for (const token of candidates) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-passwordHash');
      if (user) {
        req.user = user;
        return next();
      }
    } catch (error) {
      // Continue to next candidate if any
    }
  }

  return res.status(401).json({ error: 'Invalid or expired session' });
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
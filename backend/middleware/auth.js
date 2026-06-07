import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const extractToken = (req) => {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  return token || null;
};

export const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role === 'admin') {
      req.user = {
        _id: null,
        id: 'admin',
        role: 'admin',
        name: 'System Admin',
        email: decoded.email || process.env.ADMIN_EMAIL,
      };
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden.' });
  }
  next();
};
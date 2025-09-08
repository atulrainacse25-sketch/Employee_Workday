const jwt = require('jsonwebtoken');
const AppDataSource = require('../data-source');
const User = require('../entities/User');
const bcrypt = require('bcryptjs');

const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // 1) Try access token
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        // payload should contain id, role, email, name
        req.user = payload;
        return next();
      } catch (err) {
        console.error('Access token verify failed:', (err && err.message) || err);
        // fallthrough to try refresh token
      }
    }

    // 2) Fallback: try refresh token from cookie
    const refresh = req.cookies && req.cookies.refreshToken;
    if (!refresh) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    let payload;
    try {
      payload = jwt.verify(refresh, REFRESH_SECRET);
    } catch (err) {
      console.error('Refresh token verify failed:', (err && err.message) || err);
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    // find user and validate stored hashed refresh token
    try {
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOneBy({ id: payload.id });
      if (!user) return res.status(403).json({ message: 'Invalid refresh token' });

      const valid = user.refreshToken ? await bcrypt.compare(refresh, user.refreshToken) : false;
      if (!valid) return res.status(403).json({ message: 'Invalid refresh token' });

      // Attach minimal user info to req.user
      req.user = { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar };
      return next();
    } catch (err) {
      console.error('Error validating refresh token:', err.message || err);
      return res.status(500).json({ message: 'Server error during auth' });
    }
  } catch (err) {
    console.error('Authentication error:', err.message || err);
    return res.status(500).json({ message: 'Authentication error' });
  }
}

function isAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ message: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Admin privileges required' });
  next();
}

module.exports = { authenticateToken, isAdmin };

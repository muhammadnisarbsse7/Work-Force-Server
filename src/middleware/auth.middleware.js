const { verifyToken, hashToken } = require('../services/token.service');
const User = require('../models/user.model');

const protect = async (req, res, next) => {
  try {
    // Read from HttpOnly cookie only — never Authorization header for web apps
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    const decoded = verifyToken(token, 'access');

    // Attach minimal user info — refetch from DB to ensure user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: 'Please verify your email to access this resource.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = { protect };
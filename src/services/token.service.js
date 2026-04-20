const jwt    = require('jsonwebtoken');
const crypto = require('crypto');

// ─── Short-lived access token (15 min) ──────────────────────────────────────
const generateAccessToken = (userId) =>
  jwt.sign(
    { id: userId },                          // Minimal payload — no email, no role
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', algorithm: 'HS256' }
  );

// ─── Long-lived refresh token (7 days) ──────────────────────────────────────
const generateRefreshToken = (userId) =>
  jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', algorithm: 'HS256' }
  );

// ─── Verify either token type ───────────────────────────────────────────────
const verifyToken = (token, type = 'access') => {
  const secret =
    type === 'refresh'
      ? process.env.JWT_REFRESH_SECRET
      : process.env.JWT_ACCESS_SECRET;

  return jwt.verify(token, secret); // Throws on invalid/expired
};

// ─── Hash a refresh token before storing in DB ──────────────────────────────
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashToken,
};
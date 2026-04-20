const rateLimit = require('express-rate-limit');

// Auth routes — strict (prevents brute-force)
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              5,               // 5 attempts per IP
  standardHeaders:  true,
  legacyHeaders:    false,
  skipSuccessfulRequests: true,      // Only count failed requests
  message: {
    status:  429,
    message: 'Too many attempts. Please try again after 15 minutes.',
  },
});

// General API routes — more lenient
const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    status:  429,
    message: 'Too many requests. Please slow down.',
  },
});

module.exports = { authLimiter, globalLimiter };
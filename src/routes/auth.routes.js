const express = require('express');
const router = express.Router();
const {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  validateResetToken,
  getMe,
} = require('../controllers/auth.controllers');

const { protect } = require('../middleware/auth.middleware');
// const { authLimiter } = require('../middleware/rateLimiter.middleware');

//
router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.get('/reset-password/:token', validateResetToken);
router.post('/reset-password/:token', resetPassword);

router.get('/verify-email/:token', verifyEmail);

// Token refresh & logout
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Protected route example
router.get('/me', protect, getMe);

module.exports = router;

import express from 'express';
const router = express.Router();
import {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  validateResetToken,
  getMe,
} from '../controllers/auth.controllers.js';

import { protect } from '../middleware/auth.middleware.js';
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

export default router;

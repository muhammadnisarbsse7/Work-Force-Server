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
  addManager,
  deleteManager,
  updateManagerPassword,
} from '../controllers/auth.controllers.js';

import { protect, authorize } from '../middleware/auth.middleware.js';
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

// Protected routes
router.get('/me', protect, getMe);

// Admin-only routes
router.post('/add-manager', protect, authorize('admin'), addManager);
router.delete('/manager/:id', protect, authorize('admin'), deleteManager);
router.patch('/manager/:id/password', protect, authorize('admin'), updateManagerPassword);

export default router;

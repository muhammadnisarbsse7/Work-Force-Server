

import crypto from 'crypto';
import User from '../models/auth.model.js';

import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashToken,
} from '../services/token.service.js';
import { sendVerificationEmail, sendPasswordResetEmail } from '../services/email.service.js';
import asyncHandler from '../utils/asyncHandler.js';


const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',   // 'strict' blocks cookies on cross-port fetch (5173→5000)
};

const ACCESS_COOKIE_OPTS = { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 };
const REFRESH_COOKIE_OPTS = { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 };

const attachTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTS);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
};

// ─── REGISTER — accepts all 3 steps in one payload ───────────────────────────
const register = asyncHandler(async (req, res) => {
  const {
    // Step 1
    name, email, password,
    // Step 2
    city, street,
    // Step 3
    cardName, cardNumber, expiry, cvv,
  } = req.body;

  // ── Field presence check ──────────────────────────────────────────────────
  const required = { name, email, password, city, street, cardName, cardNumber, expiry, cvv };
  const missing = Object.keys(required).filter((k) => !required[k]?.toString().trim());
  if (missing.length) {
    return res.status(400).json({
      message: 'All fields are required.',
      fields: missing,
    });
  }

  // ── Card format validation (basic) ────────────────────────────────────────
  const rawCard = cardNumber.replace(/\s/g, '');
  if (!/^\d{16}$/.test(rawCard)) {
    return res.status(400).json({ message: 'Card number must be 16 digits.' });
  }
  if (!/^\d{3,4}$/.test(cvv)) {
    return res.status(400).json({ message: 'CVV must be 3 or 4 digits.' });
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
    return res.status(400).json({ message: 'Expiry must be in MM/YY format.' });
  }

  // ── Duplicate check ───────────────────────────────────────────────────────
  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    // Generic — prevents email enumeration
    return res.status(400).json({ message: 'Registration failed. Please check your details.' });
  }

  // ── Create user ───────────────────────────────────────────────────────────
  const user = new User({ name, email, password, city, street });

  // Encrypt card data — CVV is validated above and then discarded
  user.setBillingData({ cardName, cardNumber, expiry });

  // Generate email verification token
  const verifyToken_ = user.createToken('emailVerify');
  await user.save();

  // ── Send verification email ───────────────────────────────────────────────
  try {
    await sendVerificationEmail(user.email, verifyToken_);
  } catch {
    // Roll back the token fields so user can request a new one
    user.emailVerifyToken = undefined;
    user.emailVerifyTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(500).json({
      message: 'Account created but verification email failed. Please request a new one.',
    });
  }

  res.status(201).json({
    message: 'Account created successfully! Please check your email to verify your account.',
  });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+password +loginAttempts +lockUntil'
  );

  // ── Account lockout ───────────────────────────────────────────────────────
  if (user?.isLocked()) {
    return res.status(423).json({
      message: 'Account temporarily locked due to too many failed attempts. Try again in 2 hours.',
    });
  }

  const isValid = user && (await user.comparePassword(password));

  if (!isValid) {
    if (user) await user.incrementLoginAttempts();
    // Same message for wrong email OR wrong password — no enumeration
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  // ── Email verification gate ───────────────────────────────────────────────
  if (!user.isEmailVerified) {
    return res.status(403).json({
      message: 'Please verify your email before signing in. Check your inbox.',
    });
  }

  // ── Reset failed attempts on success ──────────────────────────────────────
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  // ── Issue tokens ──────────────────────────────────────────────────────────
  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  attachTokenCookies(res, accessToken, refreshToken);

  res.status(200).json({
    message: 'Signed in successfully.',
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      city: user.city,
    },
  });
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {

  const { email } = req.body;

  if (!email?.trim()) {
    return res.status(400).json({ message: 'Email address is required.' });
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });

  // Always return the same response — no enumeration
  const SAFE_RESPONSE = {
    message: "If that email is registered, you'll receive a reset link shortly.",
  };

  if (!user) return res.status(200).json(SAFE_RESPONSE);

  // ── Generate reset token ──────────────────────────────────────────────────
  const token = user.createToken('passwordReset');
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(user.email, token);
  } catch {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(500).json({ message: 'Error sending reset email. Please try again.' });
  }

  res.status(200).json(SAFE_RESPONSE);
});

// ─── VERIFY EMAIL — ─────────────────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    emailVerifyToken: hashedToken,
    emailVerifyTokenExpiry: { $gt: Date.now() },
  }).select('+emailVerifyToken +emailVerifyTokenExpiry');

  if (!user) return res.status(400).json({ message: 'Invalid or expired verification link.' });

  user.isEmailVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyTokenExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ message: 'Email verified. You can now sign in.' });
});

// ─── REFRESH TOKEN — ────────────────────────────────────────────────
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) return res.status(401).json({ message: 'No refresh token.' });

  let decoded;
  try {
    decoded = verifyToken(token, 'refresh');
  } catch {
    return res.status(401).json({ message: 'Invalid or expired refresh token.' });
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== hashToken(token)) {
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
    return res.status(401).json({ message: 'Refresh token reuse detected. Please sign in again.' });
  }

  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = hashToken(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  attachTokenCookies(res, newAccessToken, newRefreshToken);
  res.status(200).json({ message: 'Tokens refreshed.' });
});

// ─── VALIDATE RESET TOKEN — accepts GET from email link ───────────────────────
const validateResetToken = asyncHandler(async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) return res.status(400).json({ message: 'Invalid or expired reset link.' });

  res.status(200).json({ message: 'Token valid. Please provide a new password via POST.' });
});

// ─── LOGOUT — ───────────────────────────────────────────────────────

const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = verifyToken(token, 'refresh');
      await User.findByIdAndUpdate(decoded.id, { $unset: { refreshToken: 1 } });
    } catch { /* already invalid */ }
  }

  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);
  res.status(200).json({ message: 'Signed out successfully.' });
});

// ─── RESET PASSWORD — ───────────────────────────────────────────────
// exports.resetPassword = asyncHandler(async (req, res) => {
//   const { password } = req.body;

//   if (!password || password.length < 8) {
//     return res.status(400).json({ message: 'Password must be at least 8 characters.' });
//   }

//   const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

//   const user = await User.findOne({
//     passwordResetToken:       hashedToken,
//     passwordResetTokenExpiry: { $gt: Date.now() },
//   }).select('+passwordResetToken +passwordResetTokenExpiry');

//   if (!user) return res.status(400).json({ message: 'Invalid or expired reset link.' });

//   user.password                 = password;
//   user.passwordResetToken       = undefined;
//   user.passwordResetTokenExpiry = undefined;
//   user.refreshToken             = undefined;
//   user.loginAttempts            = 0;
//   user.lockUntil                = undefined;
//   await user.save();

//   res.status(200).json({ message: 'Password reset successful. Please sign in.' });
// });

// ─── RESET PASSWORD ────────────────────────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { token } = req.params;

  // ── Field checks ──────────────────────────────────────────────────────────
  if (!token) {
    return res.status(400).json({ message: 'Reset token is missing.' });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }
  if (!/[A-Z]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least one uppercase letter.' });
  }
  if (!/[0-9]/.test(password)) {
    return res.status(400).json({ message: 'Password must contain at least one number.' });
  }

  // ── Hash the raw token from URL to compare with DB ────────────────────────
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // ── Find user with matching, non-expired token ────────────────────────────
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpiry: { $gt: Date.now() }, // still within 10-min window
  }).select('+passwordResetToken +passwordResetTokenExpiry +refreshToken');

  if (!user) {
    return res.status(400).json({
      message: 'This reset link is invalid or has expired.',
      expired: true, // frontend uses this flag to show the expired UI
    });
  }

  // ── Set new password — pre-save hook hashes it ────────────────────────────
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetTokenExpiry = undefined;
  user.refreshToken = undefined;  // invalidate all active sessions
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  // ── Clear any auth cookies that might be set ──────────────────────────────
  // Use the global COOKIE_OPTIONS (which has sameSite: 'lax' and other settings)
  res.clearCookie('accessToken',  COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);

  res.status(200).json({
    message: 'Password reset successful. You can now sign in with your new password.',
  });
});

// ─── GET ME — ───────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});

export {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  validateResetToken,
  getMe,
};
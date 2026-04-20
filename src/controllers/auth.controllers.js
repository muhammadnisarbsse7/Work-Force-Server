const crypto        = require('crypto');
const User          = require('../models/user.model');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  hashToken,
}                   = require('../services/token.service');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
}                   = require('../services/email.service');
const asyncHandler  = require('../utils/asyncHandler');

// ─── Cookie options ─────────────────────────────────────────────────────────
const COOKIE_OPTIONS = {
  httpOnly: true,                                    // Inaccessible to JS
  secure:   process.env.NODE_ENV === 'production',   // HTTPS only in prod
  sameSite: 'strict',                                // CSRF protection
};

const ACCESS_COOKIE_OPTS  = { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 };        // 15 min
const REFRESH_COOKIE_OPTS = { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 }; // 7 days

// ─── Helper: attach tokens as HttpOnly cookies ──────────────────────────────
const attachTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken',  accessToken,  ACCESS_COOKIE_OPTS);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTS);
};

// ─── REGISTER ────────────────────────────────────────────────────────────────
exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  let user = await User.findOne({ email });

  if (user) {
    if (user.isEmailVerified) {
      // Generic message to prevent email enumeration for verified accounts
      return res.status(400).json({ message: 'Registration failed. Please check your details.' });
    }
    // For unverified accounts, we refresh the token and re-send the email
    console.log("Re-sending verification to unverified user:", email);
  } else {
    // New user creation
    user = await User.create({ name, email, password });
  }

  const token = user.createToken('emailVerify');
  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user.email, token);
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
    });
  } catch (err) {
    console.error("EMAIL SEND ERROR:", err);
    
    // Cleanup token if email fails for a NEW user
    user.emailVerifyToken       = undefined;
    user.emailVerifyTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      message: 'Error sending verification email.',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});


// ─── VERIFY EMAIL ─────────────────────────────────────────────────────────────
exports.verifyEmail = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    emailVerifyToken:       hashedToken,
    emailVerifyTokenExpiry: { $gt: Date.now() },
  }).select('+emailVerifyToken +emailVerifyTokenExpiry');

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired verification link.' });
  }

  user.isEmailVerified      = true;
  user.emailVerifyToken       = undefined;
  user.emailVerifyTokenExpiry = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ message: 'Email verified. You can now log in.' });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  // Explicitly select password and lockout fields (excluded by default)
  const user = await User.findOne({ email }).select(
    '+password +loginAttempts +lockUntil'
  );

  // Account lockout check
  if (user?.isLocked()) {
    return res.status(423).json({
      message: 'Account locked due to too many failed attempts. Try again in 2 hours.',
    });
  }

  const isValid = user && (await user.comparePassword(password));

  if (!isValid) {
    if (user) await user.incrementLoginAttempts();
    // Same error message for wrong email OR wrong password — prevents enumeration
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  if (!user.isEmailVerified) {
    return res.status(403).json({ message: 'Please verify your email before logging in.' });
  }

  // Reset failed attempts on successful login
  if (user.loginAttempts > 0) {
    await user.updateOne({ $set: { loginAttempts: 0 }, $unset: { lockUntil: 1 } });
  }

  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Store hashed refresh token — never the raw token
  user.refreshToken = hashToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  attachTokenCookies(res, accessToken, refreshToken);

  res.status(200).json({
    message: 'Logged in successfully.',
    user: { id: user._id, name: user.name, email: user.email },
  });
});

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
exports.refreshToken = asyncHandler(async (req, res) => {
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
    // Token reuse detected — invalidate all sessions
    if (user) {
      user.refreshToken = undefined;
      await user.save({ validateBeforeSave: false });
    }
    return res.status(401).json({ message: 'Refresh token reuse detected. Please log in again.' });
  }

  // Rotate: issue new pair, invalidate old refresh token
  const newAccessToken  = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);

  user.refreshToken = hashToken(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  attachTokenCookies(res, newAccessToken, newRefreshToken);

  res.status(200).json({ message: 'Tokens refreshed.' });
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
exports.logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = verifyToken(token, 'refresh');
      if (decoded) {
        await User.findByIdAndUpdate(decoded.id, { $unset: { refreshToken: 1 } });
      }
    } catch (err) {
      // Ignore errors during logout (e.g. expired token) and just clear cookies
    }
  }

  res.clearCookie('accessToken',  COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);

  res.status(200).json({ message: 'Logged out successfully.' });
});

// ─── FORGOT PASSWORD ─────────────────────────────────────────────────────────
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body || {};

  const user = await User.findOne({ email });

  // Always respond identically — prevents email enumeration
  if (!user) {
    return res.status(200).json({
      message: 'If that email is registered, a reset link has been sent.',
    });
  }

  const token = user.createToken('passwordReset');
  await user.save({ validateBeforeSave: false });

  try {
    // 👈 LOG FOR DEVELOPMENT (Remove in production)
    console.log(`Password Reset Token for ${user.email}: ${token}`);
    
    await sendPasswordResetEmail(user.email, token);

  } catch {
    user.passwordResetToken       = undefined;
    user.passwordResetTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });
    return res.status(500).json({ message: 'Error sending reset email.' });
  }

  res.status(200).json({
    message: 'If that email is registered, a reset link has been sent.',
  });
});

// ─── VALIDATE RESET TOKEN (initial link click) ────────────────────────────────
exports.validateResetToken = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken:       hashedToken,
    passwordResetTokenExpiry: { $gt: Date.now() },
  });

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset link.' });
  }

  res.status(200).json({ message: 'Token valid. Please provide a new password via POST.' });
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
exports.resetPassword = asyncHandler(async (req, res) => {

  const { password } = req.body || {};

  if (!password || password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters.' });
  }

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken:       hashedToken,
    passwordResetTokenExpiry: { $gt: Date.now() }, // 10-min window
  }).select('+passwordResetToken +passwordResetTokenExpiry');

  if (!user) {
    return res.status(400).json({ message: 'Invalid or expired reset link.' });
  }

  user.password                 = password; // pre-save hook re-hashes
  user.passwordResetToken       = undefined;
  user.passwordResetTokenExpiry = undefined;
  user.refreshToken             = undefined; // Invalidate all active sessions
  user.loginAttempts            = 0;
  user.lockUntil                = undefined;
  await user.save();

  res.status(200).json({ message: 'Password reset successful. Please log in.' });
});

// ─── GET ME (protected) ───────────────────────────────────────────────────────
exports.getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});
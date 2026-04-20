const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // NEVER returned in queries by default
    },

    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyTokenExpiry: { type: Date, select: false },

    // Password reset — store only hashed token in DB
    passwordResetToken: { type: String, select: false },
    passwordResetTokenExpiry: { type: Date, select: false },

    // Refresh token rotation — store hashed token only
    refreshToken: { type: String, select: false },

    // Account lockout
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  { timestamps: true }
);

// ─── Hash password before save ──────────────────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  // Cost factor 12 — ~250ms on modern hardware, brute-force resistant
  this.password = await bcrypt.hash(this.password, 12);

});

// ─── Compare plain password against hash ────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Check if account is locked ─────────────────────────────────────────────
userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// ─── Increment failed login counter; lock after 5 failures ──────────────────
userSchema.methods.incrementLoginAttempts = async function () {
  // Reset counter if previous lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const update = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    update.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) }; // 2 hr lock
  }
  return this.updateOne(update);
};

// ─── Generate a secure random token; store only its SHA-256 hash ────────────
userSchema.methods.createToken = function (type) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  if (type === 'emailVerify') {
    this.emailVerifyToken = hashed;
    this.emailVerifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hrs
  } else if (type === 'passwordReset') {
    this.passwordResetToken = hashed;
    this.passwordResetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

  }

  return rawToken; // Send ONLY this to the user via email — never the hash
};

module.exports = mongoose.model('User', userSchema);
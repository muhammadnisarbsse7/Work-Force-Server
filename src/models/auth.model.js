// const mongoose = require('mongoose');
// const bcrypt = require('bcryptjs');
// const crypto = require('crypto');

// const userSchema = new mongoose.Schema(
//   {
//     name: {
//       type: String,
//       required: [true, 'Name is required'],
//       trim: true,
//       maxlength: [50, 'Name cannot exceed 50 characters'],
//     },
//     email: {
//       type: String,
//       required: [true, 'Email is required'],
//       unique: true,
//       lowercase: true,
//       trim: true,
//       match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
//     },
//     password: {
//       type: String,
//       required: [true, 'Password is required'],
//       minlength: [8, 'Password must be at least 8 characters'],
//       select: false, // NEVER returned in queries by default
//     },

//     // Email verification
//     isEmailVerified: { type: Boolean, default: false },
//     emailVerifyToken: { type: String, select: false },
//     emailVerifyTokenExpiry: { type: Date, select: false },

//     // Password reset — store only hashed token in DB
//     passwordResetToken: { type: String, select: false },
//     passwordResetTokenExpiry: { type: Date, select: false },

//     // Refresh token rotation — store hashed token only
//     refreshToken: { type: String, select: false },

//     // Account lockout
//     loginAttempts: { type: Number, default: 0, select: false },
//     lockUntil: { type: Date, select: false },
//   },
//   { timestamps: true }
// );

// // ─── Hash password before save ──────────────────────────────────────────────
// userSchema.pre('save', async function () {
//   if (!this.isModified('password')) return;
//   // Cost factor 12 — ~250ms on modern hardware, brute-force resistant
//   this.password = await bcrypt.hash(this.password, 12);

// });

// // ─── Compare plain password against hash ────────────────────────────────────
// userSchema.methods.comparePassword = async function (candidatePassword) {
//   return bcrypt.compare(candidatePassword, this.password);
// };

// // ─── Check if account is locked ─────────────────────────────────────────────
// userSchema.methods.isLocked = function () {
//   return !!(this.lockUntil && this.lockUntil > Date.now());
// };

// // ─── Increment failed login counter; lock after 5 failures ──────────────────
// userSchema.methods.incrementLoginAttempts = async function () {
//   // Reset counter if previous lock has expired
//   if (this.lockUntil && this.lockUntil < Date.now()) {
//     return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
//   }
//   const update = { $inc: { loginAttempts: 1 } };
//   if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
//     update.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) }; // 2 hr lock
//   }
//   return this.updateOne(update);
// };

// // ─── Generate a secure random token; store only its SHA-256 hash ────────────
// userSchema.methods.createToken = function (type) {
//   const rawToken = crypto.randomBytes(32).toString('hex');
//   const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

//   if (type === 'emailVerify') {
//     this.emailVerifyToken = hashed;
//     this.emailVerifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hrs
//   } else if (type === 'passwordReset') {
//     this.passwordResetToken = hashed;
//     this.passwordResetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

//   }

//   return rawToken; // Send ONLY this to the user via email — never the hash
// };

// module.exports = mongoose.model('User', userSchema);



import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ─── Encrypt / Decrypt card fields using AES-256-GCM ─────────────────────────
// Key must be 32 bytes — derive from env
const ALGO = 'aes-256-gcm';
const getEncKey = () => {
  const hex = process.env.CARD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error('CARD_ENCRYPTION_KEY must be 64 hex chars');
  return Buffer.from(hex, 'hex');
};

const encrypt = (plain) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getEncKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Store as iv:authTag:ciphertext (all hex)
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = (stored) => {
  const [ivHex, tagHex, encHex] = stored.split(':');
  const decipher = crypto.createDecipheriv(
    ALGO,
    getEncKey(),
    Buffer.from(ivHex, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(encHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
};

const authSchema = new mongoose.Schema(
  {
    // ── Personal info ─────────────────────────────────────────────────────────
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
      select: false,
    },

    // ── Address ───────────────────────────────────────────────────────────────
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
    },
    street: {
      type: String,
      required: [true, 'Street is required'],
      trim: true,
    },

    // ── Billing — encrypted at rest, never returned by default ───────────────
    cardName: {
      type: String,
      select: false,
    },
    // Store only last 4 digits in plain for display; full number encrypted
    cardLastFour: {
      type: String,
      select: false,
    },
    cardNumberEncrypted: {
      type: String,
      select: false,
    },
    expiryEncrypted: {
      type: String,
      select: false,
    },
    // NEVER store CVV — PCI-DSS prohibits it. We validate format then discard.

    // ── Auth internals ────────────────────────────────────────────────────────
    isEmailVerified: { type: Boolean, default: false },
    emailVerifyToken: { type: String, select: false },
    emailVerifyTokenExpiry: { type: Date, select: false },

    passwordResetToken: { type: String, select: false },
    passwordResetTokenExpiry: { type: Date, select: false },

    refreshToken: { type: String, select: false },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
  },
  { timestamps: true }
);

// ─── Hash password on save ────────────────────────────────────────────────────
authSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});


// ─── Instance methods ─────────────────────────────────────────────────────────
authSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

authSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

authSchema.methods.incrementLoginAttempts = async function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const update = { $inc: { loginAttempts: 1 } };
  if (this.loginAttempts + 1 >= 5 && !this.isLocked()) {
    update.$set = { lockUntil: new Date(Date.now() + 2 * 60 * 60 * 1000) };
  }
  return this.updateOne(update);
};

authSchema.methods.createToken = function (type) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

  if (type === 'emailVerify') {
    this.emailVerifyToken = hashed;
    this.emailVerifyTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
  } else if (type === 'passwordReset') {
    this.passwordResetToken = hashed;
    this.passwordResetTokenExpiry = new Date(Date.now() + 10 * 60 * 1000);
  }
  return rawToken;
};

// ─── Billing helpers (called from controller) ─────────────────────────────────
authSchema.methods.setBillingData = function ({ cardName, cardNumber, expiry }) {
  this.cardName = cardName.trim();
  this.cardLastFour = cardNumber.replace(/\s/g, '').slice(-4);
  this.cardNumberEncrypted = encrypt(cardNumber.replace(/\s/g, ''));
  this.expiryEncrypted = encrypt(expiry);
};

authSchema.methods.getBillingData = function () {
  return {
    cardName: this.cardName,
    cardLastFour: this.cardLastFour,
    expiry: decrypt(this.expiryEncrypted),
  };
};

authSchema.methods.toAuthJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    city: this.city,
    street: this.street,
    isEmailVerified: this.isEmailVerified,
    billing: this.cardLastFour ? {
      cardName: this.cardName,
      cardLastFour: this.cardLastFour,
    } : null,
  };
};

export default mongoose.model('Auth', authSchema);
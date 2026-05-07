import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    // ── Who paid ───────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Plan info ──────────────────────────────────────────────────
    planTitle: {
      type: String,
      required: true,
      enum: ['Basic Plan', 'Standard Plan', 'Premium Plan'],
    },

    planType: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      default: 'monthly',
    },

    // ── Amount ────────────────────────────────────────────────────
    amount: {
      type: Number,
      required: true,   // in USD e.g. 12.99
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      default: 'usd',
    },

    // ── Stripe References ─────────────────────────────────────────
    stripeInvoiceId: {
      type: String,
      default: '',     // inv_xxxxxxxxxx — for PDF download
    },

    stripePaymentIntentId: {
      type: String,
      default: '',
    },

    stripeSubscriptionId: {
      type: String,
      default: '',
    },

    stripeCustomerId: {
      type: String,
      default: '',
    },

    stripeInvoicePdfUrl: {
      type: String,
      default: '',    // direct PDF download link from Stripe
    },

    stripeInvoiceUrl: {
      type: String,
      default: '',    // hosted invoice page
    },

    // ── Status ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'expired', 'pending'],
      default: 'pending',
    },

    // ── Billing period ────────────────────────────────────────────
    periodStart: {
      type: Date,
      default: null,
    },

    periodEnd: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Transaction', transactionSchema);
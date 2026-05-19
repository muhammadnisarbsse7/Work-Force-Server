
// import mongoose from 'mongoose';

// const subscriptionSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },

//     // ── Matches your planCards exactly ────────────────────────────
//     planTitle: {
//       type: String,
//       required: true,
//       enum: ['Basic Plan', 'Standard Plan', 'Premium Plan'],
//     },

//     planType: {
//       type: String,
//       enum: ['monthly', 'yearly', 'lifetime'],
//       required: true,
//     },

//     planPrice: {
//       type: Number,
//       required: true,
//       // 9.99 | 19.99 | 29.99
//     },

//     taxAmount: {
//       type: Number,
//       default: 0,
//     },

//     totalAmount: {
//       type: Number,
//       default: 0,
//     },

//     // ── Stripe IDs ────────────────────────────────────────────────
//     stripeCustomerId: {
//       type: String,
//       default: '',
//     },
//     stripeSubscriptionId: {
//       type: String,
//       default: '',
//     },
//     stripePaymentIntentId: {
//       type: String,
//       default: '',
//     },
//     stripePriceId: {
//       type: String,
//       default: '',
//     },

//     // ── Status ────────────────────────────────────────────────────
//     status: {
//       type: String,
//       enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
//       default: 'incomplete',
//     },

//     currentPeriodStart: { type: Date, default: null },
//     currentPeriodEnd:   { type: Date, default: null },
//   },
//   { timestamps: true }
// );

// export default mongoose.model('Subscription', subscriptionSchema);

// src/models/subscription.model.js
import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

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

    planPrice: {
      type: Number,
      required: true,
    },

    // ── Plan rank for upgrade/downgrade logic ─────────────────────
    // Higher number = higher tier
    planRank: {
      type: Number,
      default: 1,
      // Basic Plan = 1, Standard Plan = 2, Premium Plan = 3
    },

    taxAmount:   { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },

    stripeCustomerId:      { type: String, default: '' },
    stripeSubscriptionId:  { type: String, default: '' },
    stripePaymentIntentId: { type: String, default: '' },
    stripePriceId:         { type: String, default: '' },

    // ── Status ────────────────────────────────────────────────────
    // active   = currently running
    // queued   = paid, waiting for higher plan to expire
    // expired  = period ended, next queued plan activates
    // canceled = manually canceled (admin only now)
    // incomplete = checkout started but not paid yet
    status: {
      type: String,
      enum: ['active', 'queued', 'expired', 'canceled', 'incomplete', 'past_due'],
      default: 'incomplete',
    },

    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd:   { type: Date, default: null },

    // ── Queue position (1 = next to activate after current) ───────
    queuePosition: {
      type: Number,
      default: 0,
      // 0 = active, 1 = next, 2 = after next, etc.
    },
  },
  { timestamps: true }
);

export default mongoose.model('Subscription', subscriptionSchema);
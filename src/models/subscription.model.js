// import mongoose from 'mongoose';

// const subscriptionSchema = new mongoose.Schema(
//   {
//     // ── Who subscribed ─────────────────────────────────────────────
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },

//     // ── Plan details (from your planCards data) ────────────────────
//     planTitle: {
//       type: String,
//       required: true,       // 'Basic' | 'Standard' | 'Premium'
//     },
//     planPrice: {
//       type: Number,
//       required: true,       // numeric e.g. 29.99
//     },
//     planInterval: {
//       type: String,
//       default: 'month',
//     },

//     // ── Stripe IDs ─────────────────────────────────────────────────
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

//     // ── Status ─────────────────────────────────────────────────────
//     status: {
//       type: String,
//       enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
//       default: 'incomplete',
//     },

//     // ── Billing period ─────────────────────────────────────────────
//     currentPeriodStart: {
//       type: Date,
//       default: null,
//     },
//     currentPeriodEnd: {
//       type: Date,
//       default: null,
//     },

//     // ── Tax ────────────────────────────────────────────────────────
//     taxAmount: {
//       type: Number,
//       default: 0,
//     },
//     totalAmount: {
//       type: Number,
//       default: 0,
//     },
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

    // ── Matches your planCards exactly ────────────────────────────
    planTitle: {
      type: String,
      required: true,
      enum: ['Basic Plan', 'Standard Plan', 'Premium Plan'],
    },

    planType: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      required: true,
    },

    planPrice: {
      type: Number,
      required: true,
      // 9.99 | 19.99 | 29.99
    },

    taxAmount: {
      type: Number,
      default: 0,
    },

    totalAmount: {
      type: Number,
      default: 0,
    },

    // ── Stripe IDs ────────────────────────────────────────────────
    stripeCustomerId: {
      type: String,
      default: '',
    },
    stripeSubscriptionId: {
      type: String,
      default: '',
    },
    stripePaymentIntentId: {
      type: String,
      default: '',
    },
    stripePriceId: {
      type: String,
      default: '',
    },

    // ── Status ────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['active', 'canceled', 'past_due', 'incomplete', 'trialing'],
      default: 'incomplete',
    },

    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd:   { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Subscription', subscriptionSchema);
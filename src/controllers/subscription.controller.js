// import subscriptionService from '../services/subscription.service.js';
// import asyncHandler from '../utils/asyncHandler.js';
// import stripe from '../config/stripe.js';

// // ── POST /api/subscriptions/checkout ──────────────────────────────────────────
// // Called when user clicks "Confirm & Subscribe" in Review.jsx
// export const createCheckoutSession = asyncHandler(async (req, res) => {
//   const { planTitle, planPrice } = req.body;

//   if (!planTitle || !planPrice) {
//     return res.status(400).json({
//       success: false,
//       message: 'planTitle and planPrice are required',
//     });
//   }

//   const userId    = req.user._id;       // from protect middleware
//   const userEmail = req.user.email;

//   const { sessionUrl, sessionId } = await subscriptionService.createCheckoutSession({
//     planTitle,
//     planPrice: parseFloat(planPrice),
//     userId,
//     userEmail,
//   });

//   res.status(200).json({
//     success: true,
//     message: 'Checkout session created',
//     data: { sessionUrl, sessionId },
//   });
// });

// // ── GET /api/subscriptions/me ─────────────────────────────────────────────────
// // Get current logged-in user subscription status
// export const getMySubscription = asyncHandler(async (req, res) => {
//   const subscription = await subscriptionService.getUserSubscription(req.user._id);
//   res.status(200).json({
//     success: true,
//     message: subscription ? 'Subscription found' : 'No active subscription',
//     data: subscription || null,
//   });
// });

// // ── GET /api/subscriptions ────────────────────────────────────────────────────
// // Admin — all subscriptions
// export const getAllSubscriptions = asyncHandler(async (req, res) => {
//   const subscriptions = await subscriptionService.getAllSubscriptions();
//   res.status(200).json({
//     success: true,
//     message: 'Subscriptions fetched successfully',
//     data: subscriptions,
//   });
// });

// // ── DELETE /api/subscriptions/cancel ─────────────────────────────────────────
// export const cancelSubscription = asyncHandler(async (req, res) => {
//   const subscription = await subscriptionService.cancelSubscription(req.user._id);
//   res.status(200).json({
//     success: true,
//     message: 'Subscription canceled successfully',
//     data: subscription,
//   });
// });

// // ── POST /api/subscriptions/webhook ──────────────────────────────────────────
// // Stripe sends events here — must be raw body (NOT parsed JSON)
// export const stripeWebhook = async (req, res) => {
//   const sig     = req.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       req.body,                                   // raw body
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET
//     );
//   } catch (err) {
//     console.error('Webhook signature error:', err.message);
//     return res.status(400).json({ message: `Webhook Error: ${err.message}` });
//   }

//   try {
//     await subscriptionService.handleWebhookEvent(event);
//     res.status(200).json({ received: true });
//   } catch (err) {
//     console.error('Webhook handler error:', err.message);
//     res.status(500).json({ message: 'Webhook handler failed' });
//   }
// };

// src/controllers/subscription.controller.js
import subscriptionService from '../services/subscription.service.js';
import asyncHandler from '../utils/asyncHandler.js';
import stripe from '../config/stripe.js';

// ── POST /api/subscriptions/checkout ─────────────────────────────────────────
export const createCheckoutSession = asyncHandler(async (req, res) => {
  const { planTitle, planPrice, planType } = req.body;

  // Validate all 3 fields from your planCards
  if (!planTitle || !planPrice || !planType) {
    return res.status(400).json({
      success: false,
      message: 'planTitle, planPrice and planType are required',
    });
  }

  // Validate plan title matches your data
  const validPlans = ['Basic Plan', 'Standard Plan', 'Premium Plan'];
  if (!validPlans.includes(planTitle)) {
    return res.status(400).json({
      success: false,
      message: `Invalid plan. Must be one of: ${validPlans.join(', ')}`,
    });
  }

  const userId    = req.user._id;
  const userEmail = req.user.email;

  const { sessionUrl, sessionId } = await subscriptionService.createCheckoutSession({
    planTitle,
    planPrice: parseFloat(planPrice),
    planType,
    userId,
    userEmail,
  });

  res.status(200).json({
    success: true,
    message: 'Checkout session created successfully',
    data: { sessionUrl, sessionId },
  });
});

// ── GET /api/subscriptions/me ─────────────────────────────────────────────────
export const getMySubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.getUserSubscription(req.user._id);
  res.status(200).json({
    success: true,
    message: subscription ? 'Active subscription found' : 'No active subscription',
    data: subscription || null,
  });
});

// ── GET /api/subscriptions ────────────────────────────────────────────────────
export const getAllSubscriptions = asyncHandler(async (req, res) => {
  const subscriptions = await subscriptionService.getAllSubscriptions();
  res.status(200).json({
    success: true,
    message: 'All subscriptions fetched',
    data: subscriptions,
  });
});

// ── DELETE /api/subscriptions/cancel ─────────────────────────────────────────
export const cancelSubscription = asyncHandler(async (req, res) => {
  const subscription = await subscriptionService.cancelSubscription(req.user._id);
  res.status(200).json({
    success: true,
    message: 'Subscription canceled successfully',
    data: subscription,
  });
});

// ── POST /api/subscriptions/webhook ──────────────────────────────────────────
export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ message: `Webhook Error: ${err.message}` });
  }

  try {
    await subscriptionService.handleWebhookEvent(event);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    res.status(500).json({ message: 'Webhook handler failed' });
  }
};
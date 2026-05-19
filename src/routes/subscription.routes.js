// import express from 'express';
// import { protect } from '../middleware/auth.middleware.js';
// import {
//   createCheckoutSession,
//   getMySubscription,
//   getAllSubscriptions,
//   cancelSubscription,
//   stripeWebhook,
// } from '../controllers/subscription.controller.js';

// const router = express.Router();

// // ── IMPORTANT — Webhook must use raw body, registered BEFORE json middleware ──
// // We handle this in app.js (see Step 8)
// router.post(
//   '/webhook',
//   // express.raw({ type: 'application/json' }),  // raw body for Stripe signature
//   stripeWebhook
// );

// // ── Protected routes ──────────────────────────────────────────────────────────
// router.use(protect);

// router.post('/checkout', createCheckoutSession);
// router.get('/me', getMySubscription);
// router.get('/', getAllSubscriptions);
// router.delete('/cancel', cancelSubscription);

// export default router;



// src/routes/subscription.routes.js
import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  createCheckoutSession,
  getMySubscription,
  getSubscriptionQueue,
  getAllSubscriptions,
  stripeWebhook,
} from '../controllers/subscription.controller.js';

const router = express.Router();

router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  stripeWebhook
);

router.use(protect);

router.post('/checkout',  createCheckoutSession);
router.get('/me',         getMySubscription);
router.get('/queue',      getSubscriptionQueue);   // ← NEW
router.get('/',           getAllSubscriptions);

export default router;
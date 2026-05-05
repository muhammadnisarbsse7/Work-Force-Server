// import Subscription from '../models/subscription.model.js';
// import stripe from '../config/stripe.js';

// class SubscriptionService {

//   // ── Get all plans — map your frontend planCards to Stripe prices ──
//   // You create these Price IDs once in Stripe Dashboard
//   getPlanPriceId(planTitle) {
//     const plans = {
//       'Basic':    process.env.STRIPE_PRICE_BASIC,
//       'Standard': process.env.STRIPE_PRICE_STANDARD,
//       'Premium':  process.env.STRIPE_PRICE_PREMIUM,
//     };
//     return plans[planTitle] || null;
//   }

//   // ── Create Stripe Checkout Session ────────────────────────────────
//   async createCheckoutSession({ planTitle, planPrice, userId, userEmail }) {
//     const priceId = this.getPlanPriceId(planTitle);

//     if (!priceId) {
//       throw new Error(`No Stripe Price ID found for plan: ${planTitle}`);
//     }

//     // Create or retrieve Stripe customer
//     let customer;
//     const existing = await Subscription.findOne({ userId }).sort({ createdAt: -1 });

//     if (existing?.stripeCustomerId) {
//       customer = await stripe.customers.retrieve(existing.stripeCustomerId);
//     } else {
//       customer = await stripe.customers.create({ email: userEmail });
//     }

//     // Calculate tax (30% as in your Review.jsx)
//     const taxAmount      = planPrice * 0.30;
//     const totalAmount    = planPrice + taxAmount;

//     // Create Stripe Checkout Session
//     const session = await stripe.checkout.sessions.create({
//       customer:   customer.id,
//       mode:       'subscription',
//       line_items: [
//         {
//           price:    priceId,
//           quantity: 1,
//         },
//       ],
//       // Redirect URLs after payment
//       success_url: `${process.env.CLIENT_URL}/user/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url:  `${process.env.CLIENT_URL}/user/plans?canceled=true`,

//       metadata: {
//         userId:    userId.toString(),
//         planTitle,
//         planPrice: planPrice.toString(),
//         taxAmount: taxAmount.toFixed(2),
//         totalAmount: totalAmount.toFixed(2),
//       },
//     });

//     // Save pending subscription to DB
//     await Subscription.create({
//       userId,
//       planTitle,
//       planPrice,
//       taxAmount:          parseFloat(taxAmount.toFixed(2)),
//       totalAmount:        parseFloat(totalAmount.toFixed(2)),
//       stripeCustomerId:   customer.id,
//       status:             'incomplete',
//     });

//     return { sessionUrl: session.url, sessionId: session.id };
//   }

//   // ── Get current user subscription ─────────────────────────────────
//   async getUserSubscription(userId) {
//     return await Subscription.findOne({ userId, status: 'active' })
//       .sort({ createdAt: -1 });
//   }

//   // ── Get all subscriptions (admin) ─────────────────────────────────
//   async getAllSubscriptions() {
//     return await Subscription.find()
//       .populate('userId', 'fullName email')
//       .sort({ createdAt: -1 });
//   }

//   // ── Cancel subscription ───────────────────────────────────────────
//   async cancelSubscription(userId) {
//     const subscription = await Subscription.findOne({ userId, status: 'active' });
//     if (!subscription) throw new Error('No active subscription found');

//     // Cancel in Stripe
//     await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

//     // Update DB
//     subscription.status = 'canceled';
//     await subscription.save();

//     return subscription;
//   }

//   // ── Handle Stripe webhook events ──────────────────────────────────
//   async handleWebhookEvent(event) {
//     switch (event.type) {

//       // Payment succeeded — activate subscription
//       case 'checkout.session.completed': {
//         const session  = event.data.object;
//         const { userId, planTitle, planPrice, taxAmount, totalAmount } = session.metadata;

//         // Retrieve full subscription from Stripe
//         const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

//         await Subscription.findOneAndUpdate(
//           { stripeCustomerId: session.customer, status: 'incomplete' },
//           {
//             stripeSubscriptionId: session.subscription,
//             stripePaymentIntentId: session.payment_intent || '',
//             stripePriceId:        stripeSub.items.data[0].price.id,
//             status:               'active',
//             currentPeriodStart:   new Date(stripeSub.current_period_start * 1000),
//             currentPeriodEnd:     new Date(stripeSub.current_period_end   * 1000),
//           },
//           { new: true }
//         );
//         break;
//       }

//       // Subscription renewed
//       case 'invoice.payment_succeeded': {
//         const invoice = event.data.object;
//         if (invoice.billing_reason === 'subscription_cycle') {
//           const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);
//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: invoice.subscription },
//             {
//               status:             'active',
//               currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
//               currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
//             }
//           );
//         }
//         break;
//       }

//       // Payment failed
//       case 'invoice.payment_failed': {
//         const invoice = event.data.object;
//         await Subscription.findOneAndUpdate(
//           { stripeSubscriptionId: invoice.subscription },
//           { status: 'past_due' }
//         );
//         break;
//       }

//       // Subscription canceled
//       case 'customer.subscription.deleted': {
//         const stripeSub = event.data.object;
//         await Subscription.findOneAndUpdate(
//           { stripeSubscriptionId: stripeSub.id },
//           { status: 'canceled' }
//         );
//         break;
//       }
//     }
//   }
// }

// export default new SubscriptionService();

// src/services/subscription.service.js
import Subscription from '../models/subscription.model.js';
import stripe from '../config/stripe.js';

class SubscriptionService {

  // ── Match your exact planCards titles ────────────────────────────
  getPlanPriceId(planTitle) {
    const plans = {
      'Basic Plan':    process.env.STRIPE_PRICE_BASIC,
      'Standard Plan': process.env.STRIPE_PRICE_STANDARD,
      'Premium Plan':  process.env.STRIPE_PRICE_PREMIUM,
    };
    return plans[planTitle] || null;
  }

  // ── Parse price string "$9.99" → 9.99 ────────────────────────────
  parsePrice(priceStr) {
    return parseFloat(priceStr.replace('$', ''));
  }

  async createCheckoutSession({ planTitle, planPrice, planType, userId, userEmail }) {
    const priceId = this.getPlanPriceId(planTitle);

    if (!priceId) {
      throw new Error(`No Stripe Price ID found for: ${planTitle}`);
    }

    // Create or retrieve Stripe customer
    let customer;
    const existing = await Subscription.findOne({ userId }).sort({ createdAt: -1 });

    if (existing?.stripeCustomerId) {
      customer = await stripe.customers.retrieve(existing.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({ email: userEmail });
    }

    // Tax calculation (30%)
    const taxAmount   = planPrice * 0.30;
    const totalAmount = planPrice + taxAmount;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer:   customer.id,
      mode:       'subscription',
      line_items: [
        {
          price:    priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.CLIENT_URL}/user/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/user/plans?canceled=true`,

      // Pass all plan info through metadata
      metadata: {
        userId:      userId.toString(),
        planTitle,
        planType,    // monthly | yearly | lifetime
        planPrice:   planPrice.toString(),
        taxAmount:   taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      },
    });

    // Save pending subscription
    await Subscription.create({
      userId,
      planTitle,
      planType,
      planPrice,
      taxAmount:        parseFloat(taxAmount.toFixed(2)),
      totalAmount:      parseFloat(totalAmount.toFixed(2)),
      stripeCustomerId: customer.id,
      status:           'incomplete',
    });

    return { sessionUrl: session.url, sessionId: session.id };
  }

  async getUserSubscription(userId) {
    return await Subscription.findOne({ userId, status: 'active' })
      .sort({ createdAt: -1 });
  }

  async getAllSubscriptions() {
    return await Subscription.find()
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });
  }

  async cancelSubscription(userId) {
    const subscription = await Subscription.findOne({
      userId,
      status: 'active',
    });
    if (!subscription) throw new Error('No active subscription found');

    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    subscription.status = 'canceled';
    await subscription.save();
    return subscription;
  }

  async handleWebhookEvent(event) {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session  = event.data.object;
        console.log('Webhook: checkout.session.completed', session.id);

        try {
          const stripeSub = await stripe.subscriptions.retrieve(session.subscription);
          console.log('Stripe Subscription Retrieved:', {
            id: stripeSub.id,
            status: stripeSub.status,
            current_period_start: stripeSub.current_period_start,
            current_period_end: stripeSub.current_period_end,
          });

          // Safety check: Fallback to current time if Stripe dates are missing
          const startDate = stripeSub.current_period_start 
            ? new Date(stripeSub.current_period_start * 1000) 
            : new Date();
          
          const endDate = stripeSub.current_period_end 
            ? new Date(stripeSub.current_period_end * 1000) 
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days fallback

          const updated = await Subscription.findOneAndUpdate(
            { stripeCustomerId: session.customer, status: 'incomplete' },
            {
              stripeSubscriptionId:  session.subscription,
              stripePaymentIntentId: session.payment_intent || '',
              stripePriceId:         stripeSub.items.data[0].price.id,
              status:                'active',
              currentPeriodStart:    startDate,
              currentPeriodEnd:      endDate,
            },
            { new: true, returnDocument: 'after' } // fixed deprecated 'new' warning too
          );

          if (!updated) {
            console.warn(`No 'incomplete' subscription found for customer: ${session.customer}`);
          } else {
            console.log(`Subscription activated for user: ${updated.userId}`);
          }
        } catch (error) {
          console.error('Error in checkout.session.completed handler:', error);
          throw error;
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.billing_reason === 'subscription_cycle') {
          const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: invoice.subscription },
            {
              status:             'active',
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
            }
          );
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: invoice.subscription },
          { status: 'past_due' }
        );
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;
        await Subscription.findOneAndUpdate(
          { stripeSubscriptionId: stripeSub.id },
          { status: 'canceled' }
        );
        break;
      }
    }
  }
}

export default new SubscriptionService();
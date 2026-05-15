// src/services/subscription.service.js
// import Subscription from '../models/subscription.model.js';
// import Transaction from '../models/transaction.model.js';
// import stripe from '../config/stripe.js';
// import transactionService from './transaction.service.js';

// class SubscriptionService {

//   getPlanPriceId(planTitle) {
//     const plans = {
//       'Basic Plan':    process.env.STRIPE_PRICE_BASIC,
//       'Standard Plan': process.env.STRIPE_PRICE_STANDARD,
//       'Premium Plan':  process.env.STRIPE_PRICE_PREMIUM,
//     };
//     return plans[planTitle] || null;
//   }

//   parsePrice(priceStr) {
//     return parseFloat(priceStr.replace('$', ''));
//   }

//   // ── Check if user has active subscription ─────────────────────────
//   async getActiveSubscription(userId) {
//     return await Subscription.findOne({
//       userId,
//       status: 'active',
//     }).sort({ createdAt: -1 });
//   }

//   // ── Check if user has any non-expired transaction ─────────────────
//   async getActiveTransaction(userId) {
//     const now = new Date();
//     return await Transaction.findOne({
//       userId,
//       status:    'active',
//       periodEnd: { $gt: now },   // periodEnd is in the future
//     }).sort({ createdAt: -1 });
//   }

//   // ── Create transaction from invoice ───────────────────────────────
//   async createTransactionFromInvoice(invoice, userId, planTitle, planType) {
//     try {
//       return await transactionService.createFromStripeInvoice(
//         invoice,
//         userId,
//         planTitle,
//         planType,
//       );
//     } catch (err) {
//       console.error('createTransactionFromInvoice error:', err.message);
//       throw err;
//     }
//   }

//   // ── Create Stripe Checkout Session ─────────────────────────────────
//   async createCheckoutSession({ planTitle, planPrice, planType, userId, userEmail }) {

//     // ── BLOCK if user already has active subscription ─────────────
//     const activeSubscription = await this.getActiveSubscription(userId);
//     if (activeSubscription) {
//       const error = new Error(
//         `You already have an active ${activeSubscription.planTitle}. ` +
//         `It expires on ${new Date(activeSubscription.currentPeriodEnd).toLocaleDateString('en-US', {
//           year: 'numeric', month: 'long', day: 'numeric'
//         })}. Please wait until it expires to subscribe to a new plan.`
//       );
//       error.statusCode = 400;
//       error.code       = 'ACTIVE_SUBSCRIPTION_EXISTS';
//       error.data       = {
//         activePlan:  activeSubscription.planTitle,
//         expiresOn:   activeSubscription.currentPeriodEnd,
//         status:      activeSubscription.status,
//       };
//       throw error;
//     }

//     // ── BLOCK if user has active transaction (period not expired) ──
//     const activeTransaction = await this.getActiveTransaction(userId);
//     if (activeTransaction) {
//       const error = new Error(
//         `You have an active ${activeTransaction.planTitle} until ` +
//         `${new Date(activeTransaction.periodEnd).toLocaleDateString('en-US', {
//           year: 'numeric', month: 'long', day: 'numeric'
//         })}. Please wait until it expires.`
//       );
//       error.statusCode = 400;
//       error.code       = 'ACTIVE_TRANSACTION_EXISTS';
//       error.data       = {
//         activePlan: activeTransaction.planTitle,
//         expiresOn:  activeTransaction.periodEnd,
//         status:     activeTransaction.status,
//       };
//       throw error;
//     }

//     const priceId = this.getPlanPriceId(planTitle);
//     if (!priceId) {
//       throw new Error(`No Stripe Price ID found for: ${planTitle}`);
//     }

//     // Create or retrieve Stripe customer
//     let customer;
//     const existing = await Subscription.findOne({ userId }).sort({ createdAt: -1 });

//     if (existing?.stripeCustomerId) {
//       try {
//         customer = await stripe.customers.retrieve(existing.stripeCustomerId);
//         if (customer.deleted) {
//           customer = await stripe.customers.create({ email: userEmail });
//         }
//       } catch {
//         customer = await stripe.customers.create({ email: userEmail });
//       }
//     } else {
//       customer = await stripe.customers.create({ email: userEmail });
//     }

//     const taxAmount   = planPrice * 0.30;
//     const totalAmount = planPrice + taxAmount;

//     const session = await stripe.checkout.sessions.create({
//       customer: customer.id,
//       mode:     'subscription',
//       line_items: [{ price: priceId, quantity: 1 }],
//       success_url: `${process.env.CLIENT_URL}/user/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url:  `${process.env.CLIENT_URL}/user/plans?canceled=true`,
//       metadata: {
//         userId:      userId.toString(),
//         planTitle,
//         planType,
//         planPrice:   planPrice.toString(),
//         taxAmount:   taxAmount.toFixed(2),
//         totalAmount: totalAmount.toFixed(2),
//       },
//     });

//     await Subscription.create({
//       userId,
//       planTitle,
//       planType,
//       planPrice,
//       taxAmount:        parseFloat(taxAmount.toFixed(2)),
//       totalAmount:      parseFloat(totalAmount.toFixed(2)),
//       stripeCustomerId: customer.id,
//       status:           'incomplete',
//     });

//     console.log(`Checkout session created: ${session.id} for user: ${userId}`);
//     return { sessionUrl: session.url, sessionId: session.id };
//   }

//   async getUserSubscription(userId) {
//     return await Subscription.findOne({ userId, status: 'active' })
//       .sort({ createdAt: -1 });
//   }

//   async getAllSubscriptions() {
//     return await Subscription.find()
//       .populate('userId', 'fullName email')
//       .sort({ createdAt: -1 });
//   }

//   async cancelSubscription(userId) {
//     const subscription = await Subscription.findOne({ userId, status: 'active' });
//     if (!subscription) throw new Error('No active subscription found');
//     if (!subscription.stripeSubscriptionId) throw new Error('Stripe subscription ID missing');

//     await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
//     subscription.status = 'canceled';
//     await subscription.save();
//     return subscription;
//   }

//   async handleWebhookEvent(event) {
//     console.log(`\n=== WEBHOOK EVENT: ${event.type} ===`);

//     switch (event.type) {

//       case 'checkout.session.completed': {
//         const session = event.data.object;
//         console.log('Session ID:',   session.id);
//         console.log('Customer:',     session.customer);
//         console.log('Subscription:', session.subscription);

//         try {
//           const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

//           const startDate = stripeSub.current_period_start
//             ? new Date(stripeSub.current_period_start * 1000)
//             : new Date();

//           const endDate = stripeSub.current_period_end
//             ? new Date(stripeSub.current_period_end * 1000)
//             : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

//           const updated = await Subscription.findOneAndUpdate(
//             { stripeCustomerId: session.customer, status: 'incomplete' },
//             {
//               stripeSubscriptionId:  session.subscription,
//               stripePaymentIntentId: session.payment_intent || '',
//               stripePriceId:         stripeSub.items.data[0].price.id,
//               status:                'active',
//               currentPeriodStart:    startDate,
//               currentPeriodEnd:      endDate,
//             },
//             { returnDocument: 'after' }
//           );

//           if (!updated) {
//             console.warn(`No incomplete subscription for customer: ${session.customer}`);
//             break;
//           }

//           console.log(`Subscription activated for userId: ${updated.userId}`);

//           if (session.invoice) {
//             const invoice = await stripe.invoices.retrieve(session.invoice);
//             await this.createTransactionFromInvoice(
//               invoice,
//               updated.userId,
//               updated.planTitle,
//               updated.planType,
//             );
//           }

//         } catch (err) {
//           console.error('checkout.session.completed error:', err.message);
//           throw err;
//         }
//         break;
//       }

//       case 'invoice.payment_succeeded': {
//         const invoice = event.data.object;
//         console.log('Invoice ID:',     invoice.id);
//         console.log('Subscription:',   invoice.subscription);
//         console.log('Billing reason:', invoice.billing_reason);

//         try {
//           if (!invoice.subscription) {
//             console.warn('No subscription in invoice — skipping');
//             break;
//           }

//           const subscription = await Subscription.findOne({
//             stripeSubscriptionId: invoice.subscription,
//           });

//           if (!subscription) {
//             console.warn(`No DB subscription for: ${invoice.subscription}`);
//             break;
//           }

//           const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);

//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: invoice.subscription },
//             {
//               status:             'active',
//               currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
//               currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
//             },
//             { returnDocument: 'after' }
//           );

//           const billableReasons = [
//             'subscription_create',
//             'subscription_cycle',
//             'subscription_update',
//           ];

//           if (billableReasons.includes(invoice.billing_reason)) {
//             await this.createTransactionFromInvoice(
//               invoice,
//               subscription.userId,
//               subscription.planTitle,
//               subscription.planType,
//             );
//           }

//         } catch (err) {
//           console.error('invoice.payment_succeeded error:', err.message);
//           throw err;
//         }
//         break;
//       }

//       case 'invoice.payment_failed': {
//         const invoice = event.data.object;
//         try {
//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: invoice.subscription },
//             { status: 'past_due' },
//             { returnDocument: 'after' }
//           );
//           console.log('Subscription marked as past_due');
//         } catch (err) {
//           console.error('invoice.payment_failed error:', err.message);
//           throw err;
//         }
//         break;
//       }

//       case 'customer.subscription.deleted': {
//         const stripeSub = event.data.object;
//         try {
//           const updated = await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: stripeSub.id },
//             { status: 'canceled' },
//             { returnDocument: 'after' }
//           );
//           if (updated) {
//             await Transaction.updateMany(
//               { userId: updated.userId, status: 'active' },
//               { $set: { status: 'expired' } }
//             );
//           }
//         } catch (err) {
//           console.error('customer.subscription.deleted error:', err.message);
//           throw err;
//         }
//         break;
//       }

//       case 'customer.subscription.updated': {
//         const stripeSub = event.data.object;
//         try {
//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: stripeSub.id },
//             {
//               status:             stripeSub.status,
//               currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
//               currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
//             },
//             { returnDocument: 'after' }
//           );
//         } catch (err) {
//           console.error('customer.subscription.updated error:', err.message);
//           throw err;
//         }
//         break;
//       }

//       default:
//         console.log(`Unhandled event: ${event.type}`);
//     }
//   }
// }

// export default new SubscriptionService();

// src/services/subscription.service.js
import Subscription from '../models/subscription.model.js';
import Transaction from '../models/transaction.model.js';
import stripe from '../config/stripe.js';
import transactionService from './transaction.service.js';

class SubscriptionService {
  getPlanPriceId(planTitle) {
    const plans = {
      'Basic Plan': process.env.STRIPE_PRICE_BASIC,
      'Standard Plan': process.env.STRIPE_PRICE_STANDARD,
      'Premium Plan': process.env.STRIPE_PRICE_PREMIUM,
    };
    return plans[planTitle] || null;
  }

  parsePrice(priceStr) {
    return parseFloat(priceStr.replace('$', ''));
  }

  // ── Get active subscription ────────────────────────────────────────
  async getActiveSubscription(userId) {
    return await Subscription.findOne({
      userId,
      status: 'active',
    }).sort({ createdAt: -1 });
  }

  // ── Get active transaction ─────────────────────────────────────────
  async getActiveTransaction(userId) {
    const now = new Date();
    return await Transaction.findOne({
      userId,
      status: 'active',
      periodEnd: { $gt: now },
    }).sort({ createdAt: -1 });
  }

  // ── Create transaction from invoice ───────────────────────────────
  async createTransactionFromInvoice(invoice, userId, planTitle, planType) {
    try {
      return await transactionService.createFromStripeInvoice(invoice, userId, planTitle, planType);
    } catch (err) {
      console.error('createTransactionFromInvoice error:', err.message);
      throw err;
    }
  }

  // ── Create Stripe Checkout Session ─────────────────────────────────
  async createCheckoutSession({ planTitle, planPrice, planType, userId, userEmail }) {
    // ── Block if active subscription exists ───────────────────────
    const activeSubscription = await this.getActiveSubscription(userId);
    if (activeSubscription) {
      const error = new Error(
        `You already have an active ${activeSubscription.planTitle}. ` +
          `Please cancel it first before subscribing to a new plan.`
      );
      error.statusCode = 400;
      error.code = 'ACTIVE_SUBSCRIPTION_EXISTS';
      error.data = {
        activePlan: activeSubscription.planTitle,
        expiresOn: activeSubscription.currentPeriodEnd,
        status: activeSubscription.status,
      };
      throw error;
    }

    const priceId = this.getPlanPriceId(planTitle);
    if (!priceId) {
      throw new Error(`No Stripe Price ID found for: ${planTitle}`);
    }

    // Create or retrieve Stripe customer
    let customer;
    const existing = await Subscription.findOne({ userId }).sort({ createdAt: -1 });

    if (existing?.stripeCustomerId) {
      try {
        customer = await stripe.customers.retrieve(existing.stripeCustomerId);
        if (customer.deleted) {
          customer = await stripe.customers.create({ email: userEmail });
        }
      } catch {
        customer = await stripe.customers.create({ email: userEmail });
      }
    } else {
      customer = await stripe.customers.create({ email: userEmail });
    }

    const taxAmount = planPrice * 0.3;
    const totalAmount = planPrice + taxAmount;

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/user/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/user/plans?canceled=true`,
      metadata: {
        userId: userId.toString(),
        planTitle,
        planType,
        planPrice: planPrice.toString(),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      },
    });

    await Subscription.create({
      userId,
      planTitle,
      planType,
      planPrice,
      taxAmount: parseFloat(taxAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      stripeCustomerId: customer.id,
      status: 'incomplete',
    });

    console.log(`Checkout session created: ${session.id} for user: ${userId}`);
    return { sessionUrl: session.url, sessionId: session.id };
  }

  // ── Get current user subscription ─────────────────────────────────
  async getUserSubscription(userId) {
    return await Subscription.findOne({ userId, status: 'active' }).sort({ createdAt: -1 });
  }

  // ── Get all subscriptions admin ────────────────────────────────────
  async getAllSubscriptions() {
    return await Subscription.find().populate('userId', 'fullName email').sort({ createdAt: -1 });
  }

  // ── Cancel subscription ────────────────────────────────────────────
  // After cancel → user can immediately subscribe to any plan
  async cancelSubscription(userId) {
    const subscription = await Subscription.findOne({
      userId,
      status: 'active',
    });

    if (!subscription) {
      throw new Error('No active subscription found');
    }

    // ── Cancel in Stripe if subscription ID exists ────────────────
    if (subscription.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
        console.log(`Stripe subscription canceled: ${subscription.stripeSubscriptionId}`);
      } catch (err) {
        console.error('Stripe cancel error:', err.message);
        // Still mark as canceled in DB even if Stripe call fails
      }
    }

    // ── Mark subscription as canceled ────────────────────────────
    subscription.status = 'canceled';
    await subscription.save();

    // ── Mark all active transactions as expired ───────────────────
    await Transaction.updateMany({ userId, status: 'active' }, { $set: { status: 'expired' } });

    console.log(`Subscription canceled for userId: ${userId}`);
    return subscription;
  }

  // ── Handle Stripe webhook events ───────────────────────────────────
  async handleWebhookEvent(event) {
    console.log(`\n=== WEBHOOK EVENT: ${event.type} ===`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Session ID:', session.id);
        console.log('Customer:', session.customer);
        console.log('Subscription:', session.subscription);

        try {
          const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

          const startDate = stripeSub.current_period_start
            ? new Date(stripeSub.current_period_start * 1000)
            : new Date();

          const endDate = stripeSub.current_period_end
            ? new Date(stripeSub.current_period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          const updated = await Subscription.findOneAndUpdate(
            { stripeCustomerId: session.customer, status: 'incomplete' },
            {
              stripeSubscriptionId: session.subscription,
              stripePaymentIntentId: session.payment_intent || '',
              stripePriceId: stripeSub.items.data[0].price.id,
              status: 'active',
              currentPeriodStart: startDate,
              currentPeriodEnd: endDate,
            },
            { returnDocument: 'after' }
          );

          if (!updated) {
            console.warn(`No incomplete subscription for customer: ${session.customer}`);
            break;
          }

          console.log(`Subscription activated for userId: ${updated.userId}`);

          if (session.invoice) {
            const invoice = await stripe.invoices.retrieve(session.invoice);
            await this.createTransactionFromInvoice(
              invoice,
              updated.userId,
              updated.planTitle,
              updated.planType
            );
          }
        } catch (err) {
          console.error('checkout.session.completed error:', err.message);
          throw err;
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice ID:', invoice.id);
        console.log('Subscription:', invoice.subscription);
        console.log('Billing reason:', invoice.billing_reason);

        try {
          if (!invoice.subscription) {
            console.warn('No subscription in invoice — skipping');
            break;
          }

          const subscription = await Subscription.findOne({
            stripeSubscriptionId: invoice.subscription,
          });

          if (!subscription) {
            console.warn(`No DB subscription for: ${invoice.subscription}`);
            break;
          }

          const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);

          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: invoice.subscription },
            {
              status: 'active',
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            },
            { returnDocument: 'after' }
          );

          const billableReasons = [
            'subscription_create',
            'subscription_cycle',
            'subscription_update',
          ];

          if (billableReasons.includes(invoice.billing_reason)) {
            await this.createTransactionFromInvoice(
              invoice,
              subscription.userId,
              subscription.planTitle,
              subscription.planType
            );
          }
        } catch (err) {
          console.error('invoice.payment_succeeded error:', err.message);
          throw err;
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        try {
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: invoice.subscription },
            { status: 'past_due' },
            { returnDocument: 'after' }
          );
          console.log('Subscription marked as past_due');
        } catch (err) {
          console.error('invoice.payment_failed error:', err.message);
          throw err;
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;
        try {
          const updated = await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: stripeSub.id },
            { status: 'canceled' },
            { returnDocument: 'after' }
          );
          if (updated) {
            await Transaction.updateMany(
              { userId: updated.userId, status: 'active' },
              { $set: { status: 'expired' } }
            );
            console.log(`Canceled subscription + transactions for userId: ${updated.userId}`);
          }
        } catch (err) {
          console.error('customer.subscription.deleted error:', err.message);
          throw err;
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object;
        try {
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: stripeSub.id },
            {
              status: stripeSub.status,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
            },
            { returnDocument: 'after' }
          );
        } catch (err) {
          console.error('customer.subscription.updated error:', err.message);
          throw err;
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  }
}

export default new SubscriptionService();

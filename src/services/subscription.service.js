
// import Subscription from '../models/subscription.model.js';
// import Transaction from '../models/transaction.model.js';
// import stripe from '../config/stripe.js';
// import transactionService from './transaction.service.js';

// class SubscriptionService {
//   getPlanPriceId(planTitle) {
//     const plans = {
//       'Basic Plan': process.env.STRIPE_PRICE_BASIC,
//       'Standard Plan': process.env.STRIPE_PRICE_STANDARD,
//       'Premium Plan': process.env.STRIPE_PRICE_PREMIUM,
//     };
//     return plans[planTitle] || null;
//   }

//   parsePrice(priceStr) {
//     return parseFloat(priceStr.replace('$', ''));
//   }

//   // ── Get active subscription ────────────────────────────────────────
//   async getActiveSubscription(userId) {
//     return await Subscription.findOne({
//       userId,
//       status: 'active',
//     }).sort({ createdAt: -1 });
//   }

//   // ── Get active transaction ─────────────────────────────────────────
//   async getActiveTransaction(userId) {
//     const now = new Date();
//     return await Transaction.findOne({
//       userId,
//       status: 'active',
//       periodEnd: { $gt: now },
//     }).sort({ createdAt: -1 });
//   }

//   // ── Create transaction from invoice ───────────────────────────────
//   async createTransactionFromInvoice(invoice, userId, planTitle, planType) {
//     try {
//       return await transactionService.createFromStripeInvoice(invoice, userId, planTitle, planType);
//     } catch (err) {
//       console.error('createTransactionFromInvoice error:', err.message);
//       throw err;
//     }
//   }

//   // ── Create Stripe Checkout Session ─────────────────────────────────
//   async createCheckoutSession({ planTitle, planPrice, planType, userId, userEmail }) {
//     // ── Block if active subscription exists ───────────────────────
//     const activeSubscription = await this.getActiveSubscription(userId);
//     if (activeSubscription) {
//       const error = new Error(
//         `You already have an active ${activeSubscription.planTitle}. ` +
//           `Please cancel it first before subscribing to a new plan.`
//       );
//       error.statusCode = 400;
//       error.code = 'ACTIVE_SUBSCRIPTION_EXISTS';
//       error.data = {
//         activePlan: activeSubscription.planTitle,
//         expiresOn: activeSubscription.currentPeriodEnd,
//         status: activeSubscription.status,
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

//     const taxAmount = planPrice * 0.3;
//     const totalAmount = planPrice + taxAmount;

//     const session = await stripe.checkout.sessions.create({
//       customer: customer.id,
//       mode: 'subscription',
//       line_items: [{ price: priceId, quantity: 1 }],
//       success_url: `${process.env.CLIENT_URL}/user/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
//       cancel_url: `${process.env.CLIENT_URL}/user/plans?canceled=true`,
//       metadata: {
//         userId: userId.toString(),
//         planTitle,
//         planType,
//         planPrice: planPrice.toString(),
//         taxAmount: taxAmount.toFixed(2),
//         totalAmount: totalAmount.toFixed(2),
//       },
//     });

//     await Subscription.create({
//       userId,
//       planTitle,
//       planType,
//       planPrice,
//       taxAmount: parseFloat(taxAmount.toFixed(2)),
//       totalAmount: parseFloat(totalAmount.toFixed(2)),
//       stripeCustomerId: customer.id,
//       status: 'incomplete',
//     });

//     console.log(`Checkout session created: ${session.id} for user: ${userId}`);
//     return { sessionUrl: session.url, sessionId: session.id };
//   }

//   // ── Get current user subscription ─────────────────────────────────
//   async getUserSubscription(userId) {
//     return await Subscription.findOne({ userId, status: 'active' }).sort({ createdAt: -1 });
//   }

//   // ── Get all subscriptions admin ────────────────────────────────────
//   async getAllSubscriptions() {
//     return await Subscription.find().populate('userId', 'fullName email').sort({ createdAt: -1 });
//   }

//   // ── Cancel subscription ────────────────────────────────────────────
//   // After cancel → user can immediately subscribe to any plan
//   async cancelSubscription(userId) {
//     const subscription = await Subscription.findOne({
//       userId,
//       status: 'active',
//     });

//     if (!subscription) {
//       throw new Error('No active subscription found');
//     }

//     // ── Cancel in Stripe if subscription ID exists ────────────────
//     if (subscription.stripeSubscriptionId) {
//       try {
//         await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
//         console.log(`Stripe subscription canceled: ${subscription.stripeSubscriptionId}`);
//       } catch (err) {
//         console.error('Stripe cancel error:', err.message);
//         // Still mark as canceled in DB even if Stripe call fails
//       }
//     }

//     // ── Mark subscription as canceled ────────────────────────────
//     subscription.status = 'canceled';
//     await subscription.save();

//     // ── Mark all active transactions as expired ───────────────────
//     await Transaction.updateMany({ userId, status: 'active' }, { $set: { status: 'expired' } });

//     console.log(`Subscription canceled for userId: ${userId}`);
//     return subscription;
//   }

//   // ── Handle Stripe webhook events ───────────────────────────────────
//   async handleWebhookEvent(event) {
//     console.log(`\n=== WEBHOOK EVENT: ${event.type} ===`);

//     switch (event.type) {
//       case 'checkout.session.completed': {
//         const session = event.data.object;
//         console.log('Session ID:', session.id);
//         console.log('Customer:', session.customer);
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
//               stripeSubscriptionId: session.subscription,
//               stripePaymentIntentId: session.payment_intent || '',
//               stripePriceId: stripeSub.items.data[0].price.id,
//               status: 'active',
//               currentPeriodStart: startDate,
//               currentPeriodEnd: endDate,
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
//               updated.planType
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
//         console.log('Invoice ID:', invoice.id);
//         console.log('Subscription:', invoice.subscription);
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
//               status: 'active',
//               currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
//               currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
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
//               subscription.planType
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
//             console.log(`Canceled subscription + transactions for userId: ${updated.userId}`);
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
//               status: stripeSub.status,
//               currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
//               currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
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
import Transaction  from '../models/transaction.model.js';
import stripe       from '../config/stripe.js';
import transactionService from './transaction.service.js';

class SubscriptionService {

  // ── Plan config ────────────────────────────────────────────────────
  getPlanConfig() {
    return {
      'Basic Plan': {
        priceId: process.env.STRIPE_PRICE_BASIC,
        rank:    1,
        price:   9.99,
      },
      'Standard Plan': {
        priceId: process.env.STRIPE_PRICE_STANDARD,
        rank:    2,
        price:   19.99,
      },
      'Premium Plan': {
        priceId: process.env.STRIPE_PRICE_PREMIUM,
        rank:    3,
        price:   29.99,
      },
    };
  }

  getPlanPriceId(planTitle) {
    return this.getPlanConfig()[planTitle]?.priceId || null;
  }

  getPlanRank(planTitle) {
    return this.getPlanConfig()[planTitle]?.rank || 1;
  }

  // ── Get active subscription ────────────────────────────────────────
  async getActiveSubscription(userId) {
    return await Subscription.findOne({
      userId,
      status: 'active',
    }).sort({ createdAt: -1 });
  }

  // ── Get all queued subscriptions sorted by queue position ──────────
  async getQueuedSubscriptions(userId) {
    return await Subscription.find({
      userId,
      status: 'queued',
    }).sort({ queuePosition: 1, createdAt: 1 });
  }

  // ── Get full subscription queue for display ────────────────────────
  async getSubscriptionQueue(userId) {
    return await Subscription.find({
      userId,
      status: { $in: ['active', 'queued'] },
    }).sort({ queuePosition: 1, createdAt: 1 });
  }

  // ── Get current user subscription (active) ────────────────────────
  async getUserSubscription(userId) {
    return await Subscription.findOne({
      userId,
      status: 'active',
    }).sort({ createdAt: -1 });
  }

  // ── Get all subscriptions admin ────────────────────────────────────
  async getAllSubscriptions() {
    return await Subscription.find()
      .populate('userId', 'fullName email')
      .sort({ createdAt: -1 });
  }

  // ── Determine if new plan is upgrade or downgrade ──────────────────
  isUpgrade(currentPlanTitle, newPlanTitle) {
    const currentRank = this.getPlanRank(currentPlanTitle);
    const newRank     = this.getPlanRank(newPlanTitle);
    return newRank > currentRank;
  }

  // ── Create Stripe Checkout Session ─────────────────────────────────
  async createCheckoutSession({ planTitle, planPrice, planType, userId, userEmail }) {
    const priceId  = this.getPlanPriceId(planTitle);
    const planRank = this.getPlanRank(planTitle);

    if (!priceId) {
      throw new Error(`No Stripe Price ID found for: ${planTitle}`);
    }

    // ── Get current active subscription ───────────────────────────
    const activeSubscription = await this.getActiveSubscription(userId);

    // ── Check if same plan already active ─────────────────────────
    if (activeSubscription?.planTitle === planTitle) {
      const error = new Error(
        `You already have an active ${planTitle}. Choose a different plan.`
      );
      error.statusCode = 400;
      error.code       = 'SAME_PLAN_ACTIVE';
      throw error;
    }

    // ── Check if this plan is already in queue ─────────────────────
    const existingQueue = await Subscription.findOne({
      userId,
      planTitle,
      status: 'queued',
    });

    if (existingQueue) {
      const error = new Error(
        `${planTitle} is already in your subscription queue.`
      );
      error.statusCode = 400;
      error.code       = 'PLAN_ALREADY_QUEUED';
      throw error;
    }

    // ── Determine queue behavior ───────────────────────────────────
    let willBeQueued   = false;
    let queuePosition  = 0;

    if (activeSubscription) {
      const isUpgrading = this.isUpgrade(activeSubscription.planTitle, planTitle);

      if (isUpgrading) {
        // UPGRADE: new plan activates immediately
        // current active plan goes to queue after new plan expires
        willBeQueued  = false;
        queuePosition = 0;
      } else {
        // DOWNGRADE: new plan goes to queue
        // activates after current active plan expires
        willBeQueued = true;

        // Find highest current queue position and add after it
        const queuedPlans = await this.getQueuedSubscriptions(userId);
        queuePosition = queuedPlans.length + 1;
      }
    }

    // ── Create or retrieve Stripe customer ─────────────────────────
    let customer;
    const existing = await Subscription.findOne({ userId })
      .sort({ createdAt: -1 });

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

    const taxAmount   = planPrice * 0.30;
    const totalAmount = planPrice + taxAmount;

    // ── Create Stripe Checkout Session ─────────────────────────────
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode:     'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/user/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/user/plans?payment_canceled=true`,
      metadata: {
        userId:         userId.toString(),
        planTitle,
        planType,
        planRank:       planRank.toString(),
        planPrice:      planPrice.toString(),
        willBeQueued:   willBeQueued.toString(),
        queuePosition:  queuePosition.toString(),
        // Save active plan info for upgrade logic
        activePlanId:   activeSubscription?._id?.toString() || '',
        activePlanTitle: activeSubscription?.planTitle || '',
      },
    });

    // ── Save pending subscription to DB ────────────────────────────
    await Subscription.create({
      userId,
      planTitle,
      planType,
      planPrice,
      planRank,
      taxAmount:        parseFloat(taxAmount.toFixed(2)),
      totalAmount:      parseFloat(totalAmount.toFixed(2)),
      stripeCustomerId: customer.id,
      status:           'incomplete',
      queuePosition,
    });

    console.log(
      `Checkout created: ${session.id} | Plan: ${planTitle} | ` +
      `Queued: ${willBeQueued} | Position: ${queuePosition}`
    );

    return {
      sessionUrl:    session.url,
      sessionId:     session.id,
      willBeQueued,
      queuePosition,
    };
  }

  // ── Activate next plan in queue ────────────────────────────────────
  // Called when active plan expires
  async activateNextInQueue(userId) {
    const nextPlan = await Subscription.findOne({
      userId,
      status:        'queued',
      queuePosition: 1,
    });

    if (!nextPlan) {
      console.log(`No queued plan to activate for userId: ${userId}`);
      return null;
    }

    // Calculate period for next plan
    const periodStart = new Date();
    const periodEnd   = transactionService.getCalculatedPeriodEnd(
      nextPlan.planType,
      periodStart
    );

    // Activate the next plan
    nextPlan.status             = 'active';
    nextPlan.queuePosition      = 0;
    nextPlan.currentPeriodStart = periodStart;
    nextPlan.currentPeriodEnd   = periodEnd;
    await nextPlan.save();

    // Shift remaining queue positions down by 1
    await Subscription.updateMany(
      { userId, status: 'queued', queuePosition: { $gt: 1 } },
      { $inc: { queuePosition: -1 } }
    );

    console.log(`Activated queued plan: ${nextPlan.planTitle} for userId: ${userId}`);
    return nextPlan;
  }

  // ── Handle Stripe webhook events ───────────────────────────────────
  async handleWebhookEvent(event) {
    console.log(`\n=== WEBHOOK EVENT: ${event.type} ===`);

    switch (event.type) {

      // ── Checkout completed ────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object;
        const {
          userId,
          planTitle,
          planType,
          planRank,
          willBeQueued,
          queuePosition,
          activePlanId,
        } = session.metadata;

        console.log('Session:', session.id, '| Plan:', planTitle);
        console.log('WillBeQueued:', willBeQueued, '| QueuePos:', queuePosition);

        try {
          const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

          const startDate = stripeSub.current_period_start
            ? new Date(stripeSub.current_period_start * 1000)
            : new Date();

          const endDate = stripeSub.current_period_end
            ? new Date(stripeSub.current_period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

          const isQueued = willBeQueued === 'true';
          const qPos     = parseInt(queuePosition);

          // ── If UPGRADE: suspend current active plan ──────────────
          if (!isQueued && activePlanId) {
            await Subscription.findByIdAndUpdate(
              activePlanId,
              {
                status:        'queued',
                queuePosition: 1,  // will resume after new plan expires
              },
              { returnDocument: 'after' }
            );
            console.log(`Previous plan ${activePlanId} moved to queue`);
          }

          // ── Update the new subscription ───────────────────────────
          const updated = await Subscription.findOneAndUpdate(
            {
              stripeCustomerId: session.customer,
              status:           'incomplete',
              planTitle,
            },
            {
              stripeSubscriptionId:  session.subscription,
              stripePaymentIntentId: session.payment_intent || '',
              stripePriceId:         stripeSub.items.data[0].price.id,
              planRank:              parseInt(planRank),
              status:                isQueued ? 'queued' : 'active',
              queuePosition:         isQueued ? qPos : 0,
              currentPeriodStart:    isQueued ? null : startDate,
              currentPeriodEnd:      isQueued ? null : endDate,
            },
            { returnDocument: 'after' }
          );

          if (!updated) {
            console.warn(`No incomplete ${planTitle} for customer: ${session.customer}`);
            break;
          }

          console.log(
            `Plan ${planTitle} → ${isQueued ? 'QUEUED' : 'ACTIVE'} ` +
            `for userId: ${updated.userId}`
          );

          // ── Create transaction only for active plans ──────────────
          if (!isQueued && session.invoice) {
            const invoice = await stripe.invoices.retrieve(session.invoice);
            await this.createTransactionFromInvoice(
              invoice,
              updated.userId,
              updated.planTitle,
              updated.planType,
            );
          }

        } catch (err) {
          console.error('checkout.session.completed error:', err.message);
          throw err;
        }
        break;
      }

      // ── Invoice paid ──────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        console.log('Invoice:', invoice.id, '| Reason:', invoice.billing_reason);

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
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
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
              subscription.planType,
            );
          }

        } catch (err) {
          console.error('invoice.payment_succeeded error:', err.message);
          throw err;
        }
        break;
      }

      // ── Subscription expired / deleted ────────────────────────────
      case 'customer.subscription.deleted': {
        const stripeSub = event.data.object;

        try {
          const subscription = await Subscription.findOne({
            stripeSubscriptionId: stripeSub.id,
          });

          if (!subscription) {
            console.warn(`No subscription for Stripe ID: ${stripeSub.id}`);
            break;
          }

          // Mark as expired
          subscription.status = 'expired';
          await subscription.save();

          console.log(
            `Subscription expired: ${subscription.planTitle} ` +
            `for userId: ${subscription.userId}`
          );

          // ── Activate next plan in queue ───────────────────────────
          await this.activateNextInQueue(subscription.userId.toString());

        } catch (err) {
          console.error('customer.subscription.deleted error:', err.message);
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
        } catch (err) {
          console.error('invoice.payment_failed error:', err.message);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const stripeSub = event.data.object;
        try {
          await Subscription.findOneAndUpdate(
            { stripeSubscriptionId: stripeSub.id },
            {
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
            },
            { returnDocument: 'after' }
          );
        } catch (err) {
          console.error('customer.subscription.updated error:', err.message);
        }
        break;
      }

      default:
        console.log(`Unhandled event: ${event.type}`);
    }
  }

  // ── Create transaction helper ──────────────────────────────────────
  async createTransactionFromInvoice(invoice, userId, planTitle, planType) {
    try {
      return await transactionService.createFromStripeInvoice(
        invoice, userId, planTitle, planType,
      );
    } catch (err) {
      console.error('createTransactionFromInvoice error:', err.message);
      throw err;
    }
  }
}

export default new SubscriptionService();
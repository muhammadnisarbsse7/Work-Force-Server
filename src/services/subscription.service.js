// // src/services/subscription.service.js
// import Subscription from '../models/subscription.model.js';
// import Transaction from '../models/transaction.model.js';
// import stripe from '../config/stripe.js';

// import transactionService from './transaction.service.js';

// class SubscriptionService {
//   // ── Match your exact planCards titles ──────────────────────────────
//   getPlanPriceId(planTitle) {
//     const plans = {
//       'Basic Plan': process.env.STRIPE_PRICE_BASIC,
//       'Standard Plan': process.env.STRIPE_PRICE_STANDARD,
//       'Premium Plan': process.env.STRIPE_PRICE_PREMIUM,
//     };
//     return plans[planTitle] || null;
//   }

//   // ── Parse price string "$9.99" → 9.99 ──────────────────────────────
//   parsePrice(priceStr) {
//     return parseFloat(priceStr.replace('$', ''));
//   }

//   // ── Create transaction from Stripe invoice ──────────────────────────
//   // Reused in both checkout.session.completed + invoice.payment_succeeded
//   async createTransactionFromInvoice(invoice, userId, planTitle, planType) {
//     try {
//       // Avoid duplicate transactions for same invoice
//       const existing = await Transaction.findOne({
//         stripeInvoiceId: invoice.id,
//       });

//       if (existing) {
//         console.log(`Transaction already exists for invoice: ${invoice.id}`);
//         return existing;
//       }

//       const amountPaid = invoice.amount_paid / 100; // Stripe uses cents
//       const taxAmount = invoice.tax ? invoice.tax / 100 : 0;

//       // Determine status based on period end
//       // const now = new Date();
//       // const periodEnd = invoice.period_end
//       //   ? new Date(invoice.period_end * 1000)
//       //   : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days fallback

//       // const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();

//       const now = new Date();

//       const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : now;

//       const periodEnd = transactionService.getCalculatedPeriodEnd(
//         planType || 'monthly',
//         periodStart
//       );

//       const status = periodEnd > now ? 'active' : 'expired';

//       const transaction = await Transaction.create({
//         userId,
//         planTitle: planTitle || 'Basic Plan',
//         planType: planType || 'monthly',
//         amount: amountPaid,
//         taxAmount,
//         currency: invoice.currency || 'usd',
//         stripeInvoiceId: invoice.id,
//         stripePaymentIntentId: invoice.payment_intent || '',
//         stripeSubscriptionId: invoice.subscription || '',
//         stripeCustomerId: invoice.customer,
//         stripeInvoicePdfUrl: invoice.invoice_pdf || '',
//         stripeInvoiceUrl: invoice.hosted_invoice_url || '',
//         status,
//         periodStart,
//         periodEnd,
//       });

//       console.log(`Transaction created: ${transaction._id} for user: ${userId}`);
//       return transaction;
//     } catch (err) {
//       console.error('createTransactionFromInvoice error:', err.message);
//       throw err;
//     }
//   }

//   // ── Create Stripe Checkout Session ─────────────────────────────────
//   async createCheckoutSession({ planTitle, planPrice, planType, userId, userEmail }) {
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
//         // Check if customer was deleted in Stripe
//         if (customer.deleted) {
//           customer = await stripe.customers.create({ email: userEmail });
//         }
//       } catch {
//         customer = await stripe.customers.create({ email: userEmail });
//       }
//     } else {
//       customer = await stripe.customers.create({ email: userEmail });
//     }

//     // Tax calculation (30%)
//     const taxAmount = planPrice * 0.3;
//     const totalAmount = planPrice + taxAmount;

//     // Create Checkout Session
//     const session = await stripe.checkout.sessions.create({
//       customer: customer.id,
//       mode: 'subscription',
//       line_items: [
//         {
//           price: priceId,
//           quantity: 1,
//         },
//       ],
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

//     // Save pending subscription to DB
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

//   // ── Get current user active subscription ───────────────────────────
//   async getUserSubscription(userId) {
//     return await Subscription.findOne({ userId, status: 'active' }).sort({ createdAt: -1 });
//   }

//   // ── Get all subscriptions — admin ───────────────────────────────────
//   async getAllSubscriptions() {
//     return await Subscription.find().populate('userId', 'fullName email').sort({ createdAt: -1 });
//   }

//   // ── Cancel subscription ─────────────────────────────────────────────
//   async cancelSubscription(userId) {
//     const subscription = await Subscription.findOne({
//       userId,
//       status: 'active',
//     });

//     if (!subscription) throw new Error('No active subscription found');
//     if (!subscription.stripeSubscriptionId) {
//       throw new Error('Stripe subscription ID missing');
//     }

//     await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

//     subscription.status = 'canceled';
//     await subscription.save();

//     return subscription;
//   }

//   // ── Handle all Stripe webhook events ───────────────────────────────
//   async handleWebhookEvent(event) {
//     console.log(`\n=== WEBHOOK EVENT: ${event.type} ===`);

//     switch (event.type) {
//       // ── Payment completed on Stripe checkout page ─────────────────
//       case 'checkout.session.completed': {
//         const session = event.data.object;
//         console.log('Session ID:', session.id);
//         console.log('Customer:', session.customer);
//         console.log('Subscription:', session.subscription);

//         try {
//           // Retrieve full subscription from Stripe
//           const stripeSub = await stripe.subscriptions.retrieve(session.subscription);

//           const startDate = stripeSub.current_period_start
//             ? new Date(stripeSub.current_period_start * 1000)
//             : new Date();

//           const endDate = stripeSub.current_period_end
//             ? new Date(stripeSub.current_period_end * 1000)
//             : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

//           // Activate subscription in DB
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
//             { new: true }
//           );

//           if (!updated) {
//             console.warn(`No incomplete subscription found for customer: ${session.customer}`);
//             break;
//           }

//           console.log(`Subscription activated for userId: ${updated.userId}`);

//           // ── Create transaction from invoice ────────────────────────
//           if (session.invoice) {
//             const invoice = await stripe.invoices.retrieve(session.invoice);
//             await this.createTransactionFromInvoice(
//               invoice,
//               updated.userId,
//               updated.planTitle,
//               updated.planType
//             );
//           } else {
//             console.warn('No invoice found in checkout session — transaction not created');
//           }
//         } catch (err) {
//           console.error('checkout.session.completed error:', err.message);
//           throw err;
//         }
//         break;
//       }

//       // ── Invoice paid — monthly renewal or first payment ───────────
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

//           // Find subscription in DB
//           const subscription = await Subscription.findOne({
//             stripeSubscriptionId: invoice.subscription,
//           });

//           if (!subscription) {
//             console.warn(`No subscription found for: ${invoice.subscription}`);
//             break;
//           }

//           // Update subscription billing period
//           const stripeSub = await stripe.subscriptions.retrieve(invoice.subscription);

//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: invoice.subscription },
//             {
//               status: 'active',
//               currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
//               currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
//             },
//             { new: true }
//           );

//           console.log(`Subscription period updated for userId: ${subscription.userId}`);

//           // ── Create transaction record ──────────────────────────────
//           // billing_reason:
//           // 'subscription_create' = first payment
//           // 'subscription_cycle'  = renewal
//           // 'subscription_update' = plan change
//           if (
//             invoice.billing_reason === 'subscription_create' ||
//             invoice.billing_reason === 'subscription_cycle' ||
//             invoice.billing_reason === 'subscription_update'
//           ) {
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

//       // ── Payment failed ────────────────────────────────────────────
//       case 'invoice.payment_failed': {
//         const invoice = event.data.object;
//         console.log('Payment failed for subscription:', invoice.subscription);

//         try {
//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: invoice.subscription },
//             { status: 'past_due' }
//           );
//           console.log('Subscription marked as past_due');
//         } catch (err) {
//           console.error('invoice.payment_failed error:', err.message);
//           throw err;
//         }
//         break;
//       }

//       // ── Subscription canceled ─────────────────────────────────────
//       case 'customer.subscription.deleted': {
//         const stripeSub = event.data.object;
//         console.log('Subscription canceled:', stripeSub.id);

//         try {
//           const updated = await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: stripeSub.id },
//             { status: 'canceled' },
//             { new: true }
//           );

//           // Also mark all active transactions as expired
//           if (updated) {
//             await Transaction.updateMany(
//               { userId: updated.userId, status: 'active' },
//               { status: 'expired' }
//             );
//             console.log(
//               `Subscription + transactions marked canceled/expired for userId: ${updated.userId}`
//             );
//           }
//         } catch (err) {
//           console.error('customer.subscription.deleted error:', err.message);
//           throw err;
//         }
//         break;
//       }

//       // ── Subscription updated (plan change) ────────────────────────
//       case 'customer.subscription.updated': {
//         const stripeSub = event.data.object;
//         console.log('Subscription updated:', stripeSub.id);

//         try {
//           await Subscription.findOneAndUpdate(
//             { stripeSubscriptionId: stripeSub.id },
//             {
//               status: stripeSub.status,
//               currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
//               currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
//             },
//             { new: true }
//           );
//         } catch (err) {
//           console.error('customer.subscription.updated error:', err.message);
//           throw err;
//         }
//         break;
//       }

//       default:
//         console.log(`Unhandled event type: ${event.type}`);
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
      'Basic Plan':    process.env.STRIPE_PRICE_BASIC,
      'Standard Plan': process.env.STRIPE_PRICE_STANDARD,
      'Premium Plan':  process.env.STRIPE_PRICE_PREMIUM,
    };
    return plans[planTitle] || null;
  }

  parsePrice(priceStr) {
    return parseFloat(priceStr.replace('$', ''));
  }

  // ── Check if user has active subscription ─────────────────────────
  async getActiveSubscription(userId) {
    return await Subscription.findOne({
      userId,
      status: 'active',
    }).sort({ createdAt: -1 });
  }

  // ── Check if user has any non-expired transaction ─────────────────
  async getActiveTransaction(userId) {
    const now = new Date();
    return await Transaction.findOne({
      userId,
      status:    'active',
      periodEnd: { $gt: now },   // periodEnd is in the future
    }).sort({ createdAt: -1 });
  }

  // ── Create transaction from invoice ───────────────────────────────
  async createTransactionFromInvoice(invoice, userId, planTitle, planType) {
    try {
      return await transactionService.createFromStripeInvoice(
        invoice,
        userId,
        planTitle,
        planType,
      );
    } catch (err) {
      console.error('createTransactionFromInvoice error:', err.message);
      throw err;
    }
  }

  // ── Create Stripe Checkout Session ─────────────────────────────────
  async createCheckoutSession({ planTitle, planPrice, planType, userId, userEmail }) {

    // ── BLOCK if user already has active subscription ─────────────
    const activeSubscription = await this.getActiveSubscription(userId);
    if (activeSubscription) {
      const error = new Error(
        `You already have an active ${activeSubscription.planTitle}. ` +
        `It expires on ${new Date(activeSubscription.currentPeriodEnd).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        })}. Please wait until it expires to subscribe to a new plan.`
      );
      error.statusCode = 400;
      error.code       = 'ACTIVE_SUBSCRIPTION_EXISTS';
      error.data       = {
        activePlan:  activeSubscription.planTitle,
        expiresOn:   activeSubscription.currentPeriodEnd,
        status:      activeSubscription.status,
      };
      throw error;
    }

    // ── BLOCK if user has active transaction (period not expired) ──
    const activeTransaction = await this.getActiveTransaction(userId);
    if (activeTransaction) {
      const error = new Error(
        `You have an active ${activeTransaction.planTitle} until ` +
        `${new Date(activeTransaction.periodEnd).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        })}. Please wait until it expires.`
      );
      error.statusCode = 400;
      error.code       = 'ACTIVE_TRANSACTION_EXISTS';
      error.data       = {
        activePlan: activeTransaction.planTitle,
        expiresOn:  activeTransaction.periodEnd,
        status:     activeTransaction.status,
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

    const taxAmount   = planPrice * 0.30;
    const totalAmount = planPrice + taxAmount;

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      mode:     'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/user/plans?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.CLIENT_URL}/user/plans?canceled=true`,
      metadata: {
        userId:      userId.toString(),
        planTitle,
        planType,
        planPrice:   planPrice.toString(),
        taxAmount:   taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      },
    });

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

    console.log(`Checkout session created: ${session.id} for user: ${userId}`);
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
    const subscription = await Subscription.findOne({ userId, status: 'active' });
    if (!subscription) throw new Error('No active subscription found');
    if (!subscription.stripeSubscriptionId) throw new Error('Stripe subscription ID missing');

    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
    subscription.status = 'canceled';
    await subscription.save();
    return subscription;
  }

  async handleWebhookEvent(event) {
    console.log(`\n=== WEBHOOK EVENT: ${event.type} ===`);

    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Session ID:',   session.id);
        console.log('Customer:',     session.customer);
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
              stripeSubscriptionId:  session.subscription,
              stripePaymentIntentId: session.payment_intent || '',
              stripePriceId:         stripeSub.items.data[0].price.id,
              status:                'active',
              currentPeriodStart:    startDate,
              currentPeriodEnd:      endDate,
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
              updated.planType,
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
        console.log('Invoice ID:',     invoice.id);
        console.log('Subscription:',   invoice.subscription);
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
              status:             'active',
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
              status:             stripeSub.status,
              currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
              currentPeriodEnd:   new Date(stripeSub.current_period_end   * 1000),
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
// import Transaction from '../models/transaction.model.js';
// import Subscription from '../models/subscription.model.js';
// import stripe from '../config/stripe.js';

// class TransactionService {
//   // ── Get all transactions for logged-in user ───────────────────────
//   async getUserTransactions(userId) {
//     return await Transaction.find({ userId }).sort({ createdAt: -1 });
//   }

//   // ── Get all transactions — admin ──────────────────────────────────
//   async getAllTransactions() {
//     return await Transaction.find().populate('userId', 'fullName email').sort({ createdAt: -1 });
//   }

//   // ── Get single transaction ────────────────────────────────────────
//   async getTransactionById(id) {
//     return await Transaction.findById(id);
//   }

//   // ── Create transaction from Stripe invoice ────────────────────────
//   // Called from webhook when invoice.payment_succeeded fires
//   async createFromStripeInvoice(invoice, userId, planTitle, planType) {
//     const amountPaid = invoice.amount_paid / 100; // Stripe uses cents
//     const taxAmount = invoice.tax ? invoice.tax / 100 : 0;

//     // Determine status based on period
//     const now = new Date();
//     const periodEnd = new Date(invoice.period_end * 1000);
//     const status = periodEnd > now ? 'active' : 'expired';

//     return await Transaction.create({
//       userId,
//       planTitle,
//       planType: planType || 'monthly',
//       amount: amountPaid,
//       taxAmount,
//       currency: invoice.currency,
//       stripeInvoiceId: invoice.id,
//       stripePaymentIntentId: invoice.payment_intent || '',
//       stripeSubscriptionId: invoice.subscription || '',
//       stripeCustomerId: invoice.customer,
//       stripeInvoicePdfUrl: invoice.invoice_pdf || '',
//       stripeInvoiceUrl: invoice.hosted_invoice_url || '',
//       status,
//       periodStart: new Date(invoice.period_start * 1000),
//       periodEnd,
//     });
//   }

//   // ── Get Stripe invoice PDF URL ────────────────────────────────────
//   async getInvoicePdfUrl(transactionId, userId) {
//     const transaction = await Transaction.findOne({
//       _id: transactionId,
//       userId,
//     });

//     if (!transaction) throw new Error('Transaction not found');

//     // If we already have the PDF URL stored return it
//     if (transaction.stripeInvoicePdfUrl) {
//       return {
//         pdfUrl: transaction.stripeInvoicePdfUrl,
//         invoiceUrl: transaction.stripeInvoiceUrl,
//       };
//     }

//     // Otherwise fetch fresh from Stripe
//     if (transaction.stripeInvoiceId) {
//       const invoice = await stripe.invoices.retrieve(transaction.stripeInvoiceId);
//       return {
//         pdfUrl: invoice.invoice_pdf,
//         invoiceUrl: invoice.hosted_invoice_url,
//       };
//     }

//     throw new Error('No invoice available for this transaction');
//   }

//   // ── Delete transaction ────────────────────────────────────────────
//   async deleteTransaction(id) {
//     return await Transaction.findByIdAndDelete(id);
//   }

//   // ── Delete many transactions ──────────────────────────────────────
//   async deleteManyTransactions(ids) {
//     return await Transaction.deleteMany({ _id: { $in: ids } });
//   }

//   // ── Update expired transactions ───────────────────────────────────
//   // Check if periodEnd has passed → mark as expired
//   async updateExpiredTransactions() {
//     const now = new Date();
//     return await Transaction.updateMany(
//       { periodEnd: { $lt: now }, status: 'active' },
//       { $set: { status: 'expired' } }
//     );
//   }
// }

// export default new TransactionService();

// src/services/transaction.service.js
import Transaction from '../models/transaction.model.js';
import Subscription from '../models/subscription.model.js';
import stripe from '../config/stripe.js';

class TransactionService {
  // ── Get period end based on plan type ─────────────────────────────
  // Stripe test mode gives very short periods — we calculate manually
  getCalculatedPeriodEnd(planType, periodStart) {
    const start = new Date(periodStart);

    switch (planType) {
      case 'monthly':
        // Add exactly 1 month
        return new Date(start.setMonth(start.getMonth() + 1));

      case 'yearly':
        // Add exactly 1 year
        return new Date(start.setFullYear(start.getFullYear() + 1));

      case 'lifetime':
        // 100 years = lifetime
        return new Date(start.setFullYear(start.getFullYear() + 100));

      default:
        // Default 1 month
        return new Date(start.setMonth(start.getMonth() + 1));
    }
  }

  // ── Get all transactions for logged-in user ────────────────────────
  async getUserTransactions(userId) {
    return await Transaction.find({ userId }).sort({ createdAt: -1 });
  }

  // ── Get all transactions — admin ───────────────────────────────────
  async getAllTransactions() {
    return await Transaction.find().populate('userId', 'fullName email').sort({ createdAt: -1 });
  }

  // ── Get single transaction ─────────────────────────────────────────
  async getTransactionById(id) {
    return await Transaction.findById(id);
  }

  // ── Create transaction from Stripe invoice ─────────────────────────
  async createFromStripeInvoice(invoice, userId, planTitle, planType) {
    try {
      // ── Avoid duplicate transactions ─────────────────────────────
      const existing = await Transaction.findOne({
        stripeInvoiceId: invoice.id,
      });
      if (existing) {
        console.log(`Transaction already exists for invoice: ${invoice.id}`);
        return existing;
      }

      const amountPaid = invoice.amount_paid / 100;
      const taxAmount = invoice.tax ? invoice.tax / 100 : 0;

      // ── Period Start — use invoice or fallback to now ─────────────
      const periodStart = invoice.period_start ? new Date(invoice.period_start * 1000) : new Date();

      // ── Period End — CALCULATE based on plan type ─────────────────
      // DO NOT use Stripe's period_end in test mode
      // because Stripe test subscriptions expire in minutes not months
      const periodEnd = this.getCalculatedPeriodEnd(planType || 'monthly', periodStart);

      // ── Status — active if periodEnd is in the future ─────────────
      const now = new Date();
      const status = periodEnd > now ? 'active' : 'expired';

      const transaction = await Transaction.create({
        userId,
        planTitle: planTitle || 'Basic Plan',
        planType: planType || 'monthly',
        amount: amountPaid,
        taxAmount,
        currency: invoice.currency || 'usd',
        stripeInvoiceId: invoice.id,
        stripePaymentIntentId: invoice.payment_intent || '',
        stripeSubscriptionId: invoice.subscription || '',
        stripeCustomerId: invoice.customer,
        stripeInvoicePdfUrl: invoice.invoice_pdf || '',
        stripeInvoiceUrl: invoice.hosted_invoice_url || '',
        status,
        periodStart,
        periodEnd, // ← now correctly 1 month later
      });

      console.log(`Transaction created: ${transaction._id}`);
      console.log(`Period: ${periodStart.toDateString()} → ${periodEnd.toDateString()}`);
      return transaction;
    } catch (err) {
      console.error('createFromStripeInvoice error:', err.message);
      throw err;
    }
  }

  // ── Get Stripe invoice PDF URL ─────────────────────────────────────
  async getInvoicePdfUrl(transactionId, userId) {
    const transaction = await Transaction.findOne({
      _id: transactionId,
      userId,
    });

    if (!transaction) throw new Error('Transaction not found');

    if (transaction.stripeInvoicePdfUrl) {
      return {
        pdfUrl: transaction.stripeInvoicePdfUrl,
        invoiceUrl: transaction.stripeInvoiceUrl,
      };
    }

    if (transaction.stripeInvoiceId) {
      const invoice = await stripe.invoices.retrieve(transaction.stripeInvoiceId);
      return {
        pdfUrl: invoice.invoice_pdf,
        invoiceUrl: invoice.hosted_invoice_url,
      };
    }

    throw new Error('No invoice available for this transaction');
  }

  // ── Delete transaction ─────────────────────────────────────────────
  async deleteTransaction(id) {
    return await Transaction.findByIdAndDelete(id);
  }

  // ── Delete many ────────────────────────────────────────────────────
  async deleteManyTransactions(ids) {
    return await Transaction.deleteMany({ _id: { $in: ids } });
  }

  // ── Update expired transactions ────────────────────────────────────
  async updateExpiredTransactions() {
    const now = new Date();
    const result = await Transaction.updateMany(
      { periodEnd: { $lt: now }, status: 'active' },
      { $set: { status: 'expired' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`Marked ${result.modifiedCount} transaction(s) as expired`);
    }
    return result;
  }
}

export default new TransactionService();

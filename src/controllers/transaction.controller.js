import transactionService from '../services/transaction.service.js';
import asyncHandler from '../utils/asyncHandler.js';

// ── GET /api/transactions/me ──────────────────────────────────────────────────
// Transactions page — logged-in user history
export const getMyTransactions = asyncHandler(async (req, res) => {
  // Update expired before returning
  await transactionService.updateExpiredTransactions();

  const transactions = await transactionService.getUserTransactions(req.user._id);

  res.status(200).json({
    success: true,
    message: 'Transactions fetched successfully',
    data: transactions,
  });
});

// ── GET /api/transactions ─────────────────────────────────────────────────────
// Admin — all transactions
export const getAllTransactions = asyncHandler(async (req, res) => {
  const transactions = await transactionService.getAllTransactions();
  res.status(200).json({
    success: true,
    message: 'All transactions fetched',
    data: transactions,
  });
});

// ── GET /api/transactions/:id/invoice ─────────────────────────────────────────
// Download invoice PDF — DownloadIcon click
export const getInvoicePdf = asyncHandler(async (req, res) => {
  const { pdfUrl, invoiceUrl } = await transactionService.getInvoicePdfUrl(
    req.params.id,
    req.user._id
  );

  res.status(200).json({
    success: true,
    message: 'Invoice URL fetched',
    data: { pdfUrl, invoiceUrl },
  });
});

// ── DELETE /api/transactions/:id ──────────────────────────────────────────────
export const deleteTransaction = asyncHandler(async (req, res) => {
  const transaction = await transactionService.deleteTransaction(req.params.id);
  if (!transaction) {
    return res.status(404).json({
      success: false,
      message: 'Transaction not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Transaction deleted',
    data: null,
  });
});

// ── DELETE /api/transactions/bulk-delete ──────────────────────────────────────
export const deleteManyTransactions = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Provide array of transaction IDs',
    });
  }
  await transactionService.deleteManyTransactions(ids);
  res.status(200).json({
    success: true,
    message: `${ids.length} transaction(s) deleted`,
    data: null,
  });
});
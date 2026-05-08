import express from 'express';
import { protect } from '../middleware/auth.middleware.js';
import {
  getMyTransactions,
  getAllTransactions,
  getInvoicePdf,
  deleteTransaction,
  deleteManyTransactions,
} from '../controllers/transaction.controller.js';

const router = express.Router();

router.use(protect);

// ── bulk-delete BEFORE /:id ───────────────────────────────────────
router.delete('/bulk-delete', deleteManyTransactions);

router.get('/me', getMyTransactions);
router.get('/', getAllTransactions);
router.get('/:id/invoice', getInvoicePdf);
router.delete('/:id', deleteTransaction);

export default router;

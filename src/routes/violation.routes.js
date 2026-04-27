import express from 'express';
const router  = express.Router();

import { protect } from '../middleware/auth.middleware.js';

import{
  getUserViolations,
  getVehicleViolations,
  getAllViolations,
  getViolationById,
  createViolation,
  updateViolation,
  updateReportStatus,
  deleteViolation,
  deleteManyViolations,
} from '../controllers/violation.controller.js';


// router.use(protect);

// ── IMPORTANT — specific routes before /:id ───────────────────────────────────
router.delete('/bulk-delete',    deleteManyViolations);
router.get('/users',             getUserViolations);     // UsersViolations DataTable
router.get('/vehicles',          getVehicleViolations);  // VehiclesViolations DataTable

router.get('/',                  getAllViolations);
router.get('/:id',               getViolationById);
router.post('/',                 createViolation);
router.put('/:id',               updateViolation);
router.patch('/:id/report',      updateReportStatus);    // EditReport buttons
router.delete('/:id',            deleteViolation);

export default router;
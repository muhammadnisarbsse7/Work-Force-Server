// violationRoutes.js
import express from 'express';
// import {
//   addViolation,
//   getViolations,
//   getViolationById,
//   updateViolation,
//   resolveViolation,
//   deleteViolation,
//   getViolationStats,
// } from '../controllers/violationController.js';
import {
  addViolation,
  getViolations,
  getViolationById,
  updateViolation,
  resolveViolation,
  deleteViolation,
  getViolationStats,
} from '../controllers/violation.controller.js';

const router = express.Router();

router.post('/violations', addViolation);
router.get('/violations', getViolations);
router.get('/violations/stats', getViolationStats);
router.get('/violations/:id', getViolationById);
router.put('/violations/:id', updateViolation);
router.patch('/violations/:id/resolve', resolveViolation);
router.delete('/violations/:id', deleteViolation);

export default router;

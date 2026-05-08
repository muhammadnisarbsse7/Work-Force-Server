import express from 'express';
const router = express.Router();

import { protect } from '../middleware/auth.middleware.js';
import {
  getAllSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
  deleteManySensors,
  toggleStatus,
} from '../controllers/sensor.controller.js';

// All routes protected
router.use(protect);

// IMPORTANT — bulk-delete before /:id to avoid route conflict
router.delete('/bulk-delete', deleteManySensors);

router.get('/', getAllSensors);
router.get('/:id', getSensorById);
router.post('/', createSensor); // JSON body — no file upload needed
router.put('/:id', updateSensor);
router.delete('/:id', deleteSensor);
router.patch('/:id/toggle-status', toggleStatus);

export default router;

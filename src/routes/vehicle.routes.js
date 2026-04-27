import express from 'express';
const router = express.Router();

import upload from '../middleware/upload.middleware.js';
import { protect } from '../middleware/auth.middleware.js';

import{
    getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  deleteManyVehicles,
  toggleSensor,
} from '../controllers/vehicle.controller.js';


// All routes are protected
// router.use(protect);

// IMPORTANT — bulk-delete before /:id to avoid route conflict
router.delete('/bulk-delete', deleteManyVehicles);

router.get('/',     getAllVehicles);
router.get('/:id',  getVehicleById);
router.post('/',    upload.single('vehicleImage'), createVehicle);
router.put('/:id',  upload.single('vehicleImage'), updateVehicle);
router.delete('/:id', deleteVehicle);
router.patch('/:id/toggle-sensor', toggleSensor);

export default router;
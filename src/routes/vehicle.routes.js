const express = require('express');
const router = express.Router();

const upload = require('../middleware/upload.middleware'); // reuse existing
const { protect } = require('../middleware/auth.middleware');
const {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  deleteManyVehicles,
  toggleSensor,
} = require('../controllers/vehicle.controller');

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

module.exports = router;
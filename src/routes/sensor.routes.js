const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth.middleware');
const {
  getAllSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
  deleteManySensors,
  toggleStatus,
} = require('../controllers/sensor.controller');

// All routes protected
// router.use(protect);

// IMPORTANT — bulk-delete before /:id to avoid route conflict
router.delete('/bulk-delete', deleteManySensors);

router.get('/',    getAllSensors);
router.get('/:id', getSensorById);
router.post('/',   createSensor);       // JSON body — no file upload needed
router.put('/:id', updateSensor);
router.delete('/:id', deleteSensor);
router.patch('/:id/toggle-status', toggleStatus);

module.exports = router;
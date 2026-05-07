import sensorService from '../services/sensor.service.js';
import { getSensorByNameAndOwner, getSensorByUniqueId } from '../services/sensorService.service.js';
import asyncHandler from '../utils/asyncHandler.js';
// import { getSensorByUniqueId, getSensorByNameAndOwner } from '../services/sensor.service.js'; // Fixed: removed extra '.service'

// ── GET /api/sensors ──────────────────────────────────────────────────────────
const getAllSensors = asyncHandler(async (req, res) => {
  const sensors = await sensorService.getAllSensors();
  res.status(200).json({
    success: true,
    message: 'Sensors fetched successfully',
    data: sensors,
  });
});

// ── GET /api/sensors/:id ──────────────────────────────────────────────────────
const getSensorById = asyncHandler(async (req, res) => {
  const sensor = await sensorService.getSensorById(req.params.id);
  if (!sensor) {
    return res.status(404).json({
      success: false,
      message: 'Sensor not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Sensor fetched successfully',
    data: sensor,
  });
});

// ── POST /api/sensors ─────────────────────────────────────────────────────────
const createSensor = asyncHandler(async (req, res) => {
  const { uniqueId, sensorName } = req.body;

  // Check if sensor with same uniqueId already exists
  const existingSensorByUniqueId = await getSensorByUniqueId(uniqueId);
  if (existingSensorByUniqueId) {
    return res.status(409).json({
      success: false,
      message: 'Sensor with this Unique ID already exists',
    });
  }

  // Optional: Check if sensor with same name exists for the same owner
  const existingSensorByName = await getSensorByNameAndOwner(sensorName, req.body.owner);
  if (existingSensorByName) {
    return res.status(409).json({
      success: false,
      message: 'Sensor with this name already exists for this user',
    });
  }

  // If no duplicates found, create the sensor
  const sensor = await sensorService.createSensor(req.body);

  res.status(201).json({
    success: true,
    message: 'Sensor created successfully',
    data: sensor,
  });
});

// ── PUT /api/sensors/:id ──────────────────────────────────────────────────────
const updateSensor = asyncHandler(async (req, res) => {
  // Also add duplicate check for update
  const { uniqueId, sensorName } = req.body;
  const sensorId = req.params.id;

  // Check if another sensor (not the current one) has the same uniqueId
  if (uniqueId) {
    const existingSensorByUniqueId = await getSensorByUniqueId(uniqueId);
    if (existingSensorByUniqueId && existingSensorByUniqueId._id.toString() !== sensorId) {
      return res.status(409).json({
        success: false,
        message: 'Sensor with this Unique ID already exists',
      });
    }
  }

  // Check if another sensor (not the current one) has the same name for this owner
  if (sensorName && req.body.owner) {
    const existingSensorByName = await getSensorByNameAndOwner(sensorName, req.body.owner);
    if (existingSensorByName && existingSensorByName._id.toString() !== sensorId) {
      return res.status(409).json({
        success: false,
        message: 'Sensor with this name already exists for this user',
      });
    }
  }

  const sensor = await sensorService.updateSensor(sensorId, req.body);
  if (!sensor) {
    return res.status(404).json({
      success: false,
      message: 'Sensor not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Sensor updated successfully',
    data: sensor,
  });
});

// ── DELETE /api/sensors/:id ───────────────────────────────────────────────────
const deleteSensor = asyncHandler(async (req, res) => {
  const sensor = await sensorService.deleteSensor(req.params.id);
  if (!sensor) {
    return res.status(404).json({
      success: false,
      message: 'Sensor not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Sensor deleted successfully',
    data: null,
  });
});

// ── DELETE /api/sensors/bulk-delete ──────────────────────────────────────────
const deleteManySensors = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of sensor IDs',
    });
  }
  await sensorService.deleteManySensors(ids);
  res.status(200).json({
    success: true,
    message: `${ids.length} sensor(s) deleted successfully`,
    data: null,
  });
});

// ── PATCH /api/sensors/:id/toggle-status ─────────────────────────────────────
const toggleStatus = asyncHandler(async (req, res) => {
  const sensor = await sensorService.toggleStatus(req.params.id);
  if (!sensor) {
    return res.status(404).json({
      success: false,
      message: 'Sensor not found',
    });
  }
  res.status(200).json({
    success: true,
    message: `Sensor ${sensor.isActive ? 'activated' : 'deactivated'} successfully`,
    data: sensor,
  });
});

export {
  getAllSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
  deleteManySensors,
  toggleStatus,
};

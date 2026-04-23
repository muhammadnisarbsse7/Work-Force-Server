const sensorService = require('../services/sensor.service');
const asyncHandler = require('../utils/asyncHandler');

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
  const sensor = await sensorService.createSensor(req.body);
  res.status(201).json({
    success: true,
    message: 'Sensor created successfully',
    data: sensor,
  });
});

// ── PUT /api/sensors/:id ──────────────────────────────────────────────────────
const updateSensor = asyncHandler(async (req, res) => {
  const sensor = await sensorService.updateSensor(req.params.id, req.body);
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
// ToggleButton in each DataTable row
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

module.exports = {
  getAllSensors,
  getSensorById,
  createSensor,
  updateSensor,
  deleteSensor,
  deleteManySensors,
  toggleStatus,
};
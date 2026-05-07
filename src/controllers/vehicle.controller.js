import vehicleService from '../services/vehicle.service.js';
import asyncHandler from '../utils/asyncHandler.js';

// ── GET /api/vehicles ─────────────────────────────────────────────────────────
const getAllVehicles = asyncHandler(async (req, res) => {
  const vehicles = await vehicleService.getAllVehicles();
  res.status(200).json({
    success: true,
    message: 'Vehicles fetched successfully',
    data: vehicles,
  });
});

// ── GET /api/vehicles/:id ─────────────────────────────────────────────────────
const getVehicleById = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.params.id);
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Vehicle fetched successfully',
    data: vehicle,
  });
});

// ── POST /api/vehicles ────────────────────────────────────────────────────────
const createVehicle = asyncHandler(async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const vehicleImage = req.file ? req.file.path : '';

    // Clean up sensor ID
    let sensorId = req.body.sensor;
    if (!sensorId || sensorId === '' || sensorId === 'null' || sensorId === 'undefined') {
      sensorId = null;
    }

    // Clean up user ID (assignTo)
    let userId = req.body.assignTo;
    if (!userId || userId === '' || userId === 'null' || userId === 'undefined') {
      userId = null;
    }

    const vehicleData = {
      vehicleName: req.body.vehicleName,
      brand: req.body.brand,
      identificationNumber: req.body.identificationNumber,
      licensePlateNumber: req.body.licensePlateNumber,
      color: req.body.color,
      assignTo: userId, // This will be the user ID
      sensor: sensorId,
      vehicleImage: vehicleImage,
    };

    const vehicle = await vehicleService.createVehicle(vehicleData);

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: vehicle,
    });
  } catch (error) {
    console.error('Create vehicle error:', error);

    if (error.message === 'A vehicle with this license plate number and brand already exists') {
      return res.status(400).json({
        success: false,
        message: error.message,
        field: 'licensePlateNumber',
      });
    }

    if (error.message === 'User not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
        field: 'assignTo',
      });
    }

    if (error.message === 'User already has a vehicle assigned') {
      return res.status(400).json({
        success: false,
        message: error.message,
        field: 'assignTo',
      });
    }

    if (error.message === 'Sensor not found') {
      return res.status(404).json({
        success: false,
        message: error.message,
        field: 'sensor',
      });
    }

    if (error.message === 'Sensor is already attached to another vehicle') {
      return res.status(400).json({
        success: false,
        message: error.message,
        field: 'sensor',
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      return res.status(400).json({
        success: false,
        message: `${fieldName} already exists. Please use a different value.`,
        field,
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
});

// ── PUT /api/vehicles/:id ─────────────────────────────────────────────────────
const updateVehicle = asyncHandler(async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (req.file) {
      updateData.vehicleImage = req.file.path;
    }

    // Clean up sensor ID
    if (updateData.sensor && (updateData.sensor === 'null' || updateData.sensor === 'undefined')) {
      updateData.sensor = '';
    }

    // Clean up user ID
    if (
      updateData.assignTo &&
      (updateData.assignTo === 'null' || updateData.assignTo === 'undefined')
    ) {
      updateData.assignTo = '';
    }

    // Remove project field if it exists
    delete updateData.project;

    const vehicle = await vehicleService.updateVehicle(req.params.id, updateData);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle,
    });
  } catch (error) {
    if (error.message === 'A vehicle with this license plate number and brand already exists') {
      return res.status(400).json({
        success: false,
        message: error.message,
        field: 'licensePlateNumber',
      });
    }

    if (
      error.message === 'User not found' ||
      error.message === 'User already has a vehicle assigned'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
        field: 'assignTo',
      });
    }

    if (
      error.message === 'Sensor not found' ||
      error.message === 'Sensor is already attached to another vehicle'
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
        field: 'sensor',
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
      return res.status(400).json({
        success: false,
        message: `${fieldName} already exists. Please use a different value.`,
        field,
      });
    }
    throw error;
  }
});

// ── DELETE /api/vehicles/:id ──────────────────────────────────────────────────
const deleteVehicle = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.deleteVehicle(req.params.id);
  if (!vehicle) {
    return res.status(404).json({
      success: false,
      message: 'Vehicle not found',
    });
  }
  res.status(200).json({
    success: true,
    message: 'Vehicle deleted successfully',
    data: null,
  });
});

// ── DELETE /api/vehicles/bulk-delete ─────────────────────────────────────────
const deleteManyVehicles = asyncHandler(async (req, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide an array of vehicle IDs',
    });
  }

  await vehicleService.deleteManyVehicles(ids);
  res.status(200).json({
    success: true,
    message: `${ids.length} vehicle(s) deleted successfully`,
    data: null,
  });
});

// ── PATCH /api/vehicles/:id/toggle-sensor ────────────────────────────────────
const toggleSensor = asyncHandler(async (req, res) => {
  const vehicle = await vehicleService.getVehicleById(req.params.id);
  if (!vehicle) {
    return res.status(404).json({ success: false, message: 'Vehicle not found' });
  }

  const updated = await vehicleService.updateVehicle(req.params.id, {
    sensorActive: !vehicle.sensorActive,
  });

  res.status(200).json({
    success: true,
    message: 'Sensor toggled successfully',
    data: updated,
  });
});

export {
  getAllVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  deleteManyVehicles,
  toggleSensor,
};
